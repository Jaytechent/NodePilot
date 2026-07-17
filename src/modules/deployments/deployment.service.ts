import { DeploymentRepository } from './deployment.repository';
import { DeploymentJobRepository } from './job.repository';
import { ServerRepository } from './server.repository';
import { UserRepository } from '../users/user.repository';
import { IDeployment, IDeploymentJob } from '../../types';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { queueService } from '../../jobs/queue.service';
import { adapterLoader } from '../adapters/adapter.loader';

const deploymentRepo = new DeploymentRepository();
const jobRepo = new DeploymentJobRepository();
const serverRepo = new ServerRepository();
const userRepo = new UserRepository();

export function calculateDeploymentCost(provider: string, size: string, nodeType: 'validator' | 'full' | 'rpc') {
  let vpsCost = 15.00;
  const prov = provider?.toLowerCase() || 'hetzner';
  const sz = size?.toLowerCase() || 'cx31';

  if (prov.includes('hetzner')) {
    if (sz === 'cx31') vpsCost = 15.00;
    else if (sz === 'cx41') vpsCost = 30.00;
    else if (sz === 'ccx21') vpsCost = 60.00;
    else vpsCost = 15.00;
  } else if (prov.includes('digitalocean') || prov.includes('digital ocean')) {
    if (sz.includes('2vcpu-4gb')) vpsCost = 20.00;
    else if (sz.includes('4vcpu-8gb')) vpsCost = 40.00;
    else vpsCost = 20.00;
  } else if (prov.includes('contabo')) {
    vpsCost = 12.00;
  } else if (prov.includes('aws') || prov.includes('ec2')) {
    if (sz.includes('medium')) vpsCost = 35.00;
    else if (sz.includes('large')) vpsCost = 75.00;
    else vpsCost = 45.00;
  }

  let storageGb = 500;
  if (nodeType === 'validator') storageGb = 1000;
  else if (nodeType === 'rpc') storageGb = 2000;
  const storageCost = parseFloat((storageGb * 0.05).toFixed(2));

  let bandwidthGb = 1000;
  if (nodeType === 'validator') bandwidthGb = 2000;
  else if (nodeType === 'rpc') bandwidthGb = 5000;
  const bandwidthCost = parseFloat((bandwidthGb * 0.01).toFixed(2));

  const totalCost = parseFloat((vpsCost + storageCost + bandwidthCost).toFixed(2));
  const profitMargin = parseFloat((totalCost * 0.25).toFixed(2));
  const totalPrice = parseFloat((totalCost + profitMargin).toFixed(2));

  return { vpsCost, storageCost, bandwidthCost, profitMargin, totalCost, totalPrice };
}

export class DeploymentService {
  async getDeployment(id: string): Promise<IDeployment> {
    const deployment = await deploymentRepo.findById(id);
    if (!deployment) throw new NotFoundError('Deployment not found.');
    return deployment;
  }

  async listProjectDeployments(projectId: string): Promise<IDeployment[]> {
    return deploymentRepo.listByProjectId(projectId);
  }

  async listServerDeployments(serverId: string): Promise<IDeployment[]> {
    return deploymentRepo.listByServerId(serverId);
  }

  async listAllDeployments(): Promise<IDeployment[]> {
    return deploymentRepo.listAll();
  }

  /**
   * Spins up a new node deployment job
   */
  async createDeployment(
    projectId: string,
    serverId: string,
    blockchainId: string,
    nodeType: 'validator' | 'full' | 'rpc',
    config: Record<string, any>,
    userId: string
  ): Promise<{ deployment: IDeployment; job: IDeploymentJob | null }> {
    // 1. Verify and load adapter
    const adapter = adapterLoader.getAdapter(blockchainId);
    if (!adapter) {
      throw new BadRequestError(`Blockchain adapter '${blockchainId}' is not registered in NodePilot system.`);
    }

    // 2. Run plugin validation logic
    const validationResult = adapter.validateConfig(config);
    if (!validationResult.isValid) {
      throw new BadRequestError(`Configuration validation failed for ${adapter.name}: ${validationResult.errors?.join(', ')}`);
    }

    // 3. Find server to get its provider & size
    const server = await serverRepo.findById(serverId);
    if (!server) {
      throw new NotFoundError('Associated VPS server not found.');
    }

    // 4. Calculate cost metrics
    const costDetails = calculateDeploymentCost(server.provider, server.size, nodeType);

    // 5. Check user and balance
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const balance = user.balance ?? 500.0;
    const canAutoPay = balance >= costDetails.totalPrice;

    const deploymentId = `dep-${Math.random().toString(36).substr(2, 9)}`;

    // 6. Create Deployment record (set as pending/unprovisioned depending on payment)
    const deployment = await deploymentRepo.create({
      id: deploymentId,
      serverId,
      projectId,
      blockchainId,
      nodeType,
      status: 'pending',
      config,
      ...costDetails,
      billingStatus: canAutoPay ? 'paid' : 'unpaid',
      infrastructureStatus: canAutoPay ? 'provisioning' : 'unprovisioned',
    });

    let job: IDeploymentJob | null = null;

    if (canAutoPay) {
      // Deduct balance
      const updatedBalance = parseFloat((balance - costDetails.totalPrice).toFixed(2));
      await userRepo.update(userId, { balance: updatedBalance });

      const jobId = `job-${Math.random().toString(36).substr(2, 9)}`;

      // Create Background Job record
      job = await jobRepo.create({
        id: jobId,
        deploymentId,
        action: 'deploy',
        status: 'queued',
        progress: 0,
        logs: [`[Queue] Automatic payment of $${costDetails.totalPrice} deducted successfully. Enqueuing task execution...`],
      });

      // Enqueue background queue worker
      await queueService.addJob(jobId, deploymentId);
    }

    return { deployment, job };
  }

  /**
   * Pays for a pending unpaid deployment and triggers dynamic provisioning
   */
  async payDeployment(deploymentId: string, userId: string): Promise<{ deployment: IDeployment; job: IDeploymentJob }> {
    const deployment = await this.getDeployment(deploymentId);
    if (deployment.billingStatus === 'paid') {
      throw new BadRequestError('Deployment has already been paid for.');
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const balance = user.balance ?? 500.0;
    if (balance < deployment.totalPrice) {
      throw new BadRequestError(`Insufficient balance. Cost: $${deployment.totalPrice}, Balance: $${balance}`);
    }

    // Deduct balance
    const updatedBalance = parseFloat((balance - deployment.totalPrice).toFixed(2));
    await userRepo.update(userId, { balance: updatedBalance });

    // Update deployment status
    const updatedDeployment = await deploymentRepo.update(deploymentId, {
      billingStatus: 'paid',
      infrastructureStatus: 'provisioning',
      status: 'pending'
    });

    if (!updatedDeployment) {
      throw new BadRequestError('Failed to update deployment billing status.');
    }

    // Create Background Job record
    const jobId = `job-${Math.random().toString(36).substr(2, 9)}`;
    const job = await jobRepo.create({
      id: jobId,
      deploymentId,
      action: 'deploy',
      status: 'queued',
      progress: 0,
      logs: [`[Queue] Received customer payment of $${deployment.totalPrice}. Initializing provisioning...`],
    });

    // Enqueue background queue worker
    await queueService.addJob(jobId, deploymentId);

    return { deployment: updatedDeployment, job };
  }

  /**
   * Triggers background task actions (restart, update, backup, etc.)
   */
  async triggerAction(
    id: string,
    action: 'update' | 'restart' | 'backup' | 'restore' | 'delete',
    extraConfig: Record<string, any> = {}
  ): Promise<IDeploymentJob> {
    const deployment = await this.getDeployment(id);
    const jobId = `job-${Math.random().toString(36).substr(2, 9)}`;

    // Set deployment status to executing state
    const targetStatus = action === 'delete' ? 'deleting' : action === 'restart' ? 'restarting' : 'updating';
    await deploymentRepo.update(id, { status: targetStatus, ...(action === 'update' && extraConfig.image && { config: { ...deployment.config, image: extraConfig.image } }) });

    const job = await jobRepo.create({
      id: jobId,
      deploymentId: id,
      action,
      status: 'queued',
      progress: 0,
      logs: [`[Queue] Enqueued node modification: ${action}`],
    });

    // Dispatch job execution
    await queueService.addJob(jobId, id);

    return job;
  }

  async getDeploymentJobs(deploymentId: string): Promise<IDeploymentJob[]> {
    return jobRepo.listByDeploymentId(deploymentId);
  }

  async listAllJobs(): Promise<IDeploymentJob[]> {
    return jobRepo.listAll();
  }

  async getJob(jobId: string): Promise<IDeploymentJob> {
    const job = await jobRepo.findById(jobId);
    if (!job) throw new NotFoundError('Job not found.');
    return job;
  }
}
export const deploymentService = new DeploymentService();
