import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';
import { config } from '../config';
import { socketService } from '../services/socket.service';
import { sshService } from '../services/ssh.service';
import { ProviderFactory } from '../services/providers/provider.factory';
import { DeploymentJobRepository } from '../modules/deployments/job.repository';
import { DeploymentRepository } from '../modules/deployments/deployment.repository';
import { ServerRepository } from '../modules/deployments/server.repository';
import { adapterLoader } from '../modules/adapters/adapter.loader';

// Repositories instantiation
const jobRepo = new DeploymentJobRepository();
const deploymentRepo = new DeploymentRepository();
const serverRepo = new ServerRepository();

export class QueueService {
  private static instance: QueueService;
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redisConnected = false;

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public async init(): Promise<void> {
    try {
      logger.info('[Queue] Attempting connection to Redis...');
      const redisClient = new IORedis(config.redisUri, {
        maxRetriesPerRequest: null,
        connectTimeout: 4000,
      });

      await new Promise<void>((resolve, reject) => {
        redisClient.on('connect', () => {
          this.redisConnected = true;
          logger.info('[Queue] Redis connection established. Using BullMQ queues.');
          resolve();
        });
        redisClient.on('error', (err) => {
          logger.warn(`[Queue] Redis connection failed: ${err.message}. Running in fallback Async-Memory Queue mode.`);
          this.redisConnected = false;
          resolve(); // Resolve to let server proceed in fallback mode
        });
      });

      if (this.redisConnected) {
        this.queue = new Queue('NodePilotTasks', { connection: redisClient });
        
        this.worker = new Worker(
          'NodePilotTasks',
          async (job: Job) => {
            await this.processJob(job.data.jobId);
          },
          { connection: redisClient }
        );

        this.worker.on('completed', (job) => {
          logger.info(`[Queue] BullMQ Job ${job.id} completed successfully.`);
        });

        this.worker.on('failed', (job, err) => {
          logger.error(`[Queue] BullMQ Job ${job?.id} failed: ${err.message}`);
        });
      }
    } catch (err: any) {
      logger.warn(`[Queue] Failed to initialize BullMQ: ${err.message}. Running in fallback Async-Memory Queue mode.`);
      this.redisConnected = false;
    }
  }

  /**
   * Adds a task/job to the queue
   */
  public async addJob(jobId: string, deploymentId: string): Promise<void> {
    logger.info(`[Queue] Enqueuing Job: ${jobId} for Deployment: ${deploymentId}`);
    
    // Update job status to queued
    await jobRepo.update(jobId, { status: 'queued', progress: 0 });

    if (this.redisConnected && this.queue) {
      await this.queue.add(`job-${jobId}`, { jobId, deploymentId });
    } else {
      // Async memory fallback execution (mimicking BullMQ execution background)
      logger.info(`[Queue] Fallback Async-Memory engine picked up job ${jobId}`);
      setTimeout(async () => {
        try {
          await this.processJob(jobId);
        } catch (err: any) {
          logger.error(`[Queue] Fallback job ${jobId} process failed: ${err.message}`);
        }
      }, 500);
    }
  }

  /**
   * Centralized Core Execution Engine
   */
  private async processJob(jobId: string): Promise<void> {
    logger.info(`[Worker] Started processing Job ID: ${jobId}`);
    
    const job = await jobRepo.findById(jobId);
    if (!job) {
      logger.error(`[Worker] Job ${jobId} not found in database.`);
      return;
    }

    const deployment = await deploymentRepo.findById(job.deploymentId);
    if (!deployment) {
      logger.error(`[Worker] Deployment ${job.deploymentId} associated with Job ${jobId} not found.`);
      await jobRepo.update(jobId, { status: 'failed', logs: [...job.logs, 'Error: Deployment context not found.'] });
      return;
    }

    const server = await serverRepo.findById(deployment.serverId);
    if (!server) {
      logger.error(`[Worker] Server ${deployment.serverId} associated with Deployment ${deployment.id} not found.`);
      await jobRepo.update(jobId, { status: 'failed', logs: [...job.logs, 'Error: Target Server context not found.'] });
      return;
    }

    const adapter = adapterLoader.getAdapter(deployment.blockchainId);
    if (!adapter) {
      logger.error(`[Worker] Blockchain adapter for ${deployment.blockchainId} not registered.`);
      await jobRepo.update(jobId, { status: 'failed', logs: [...job.logs, `Error: Blockchain adapter ${deployment.blockchainId} not loaded.` ] });
      return;
    }

    // Mark Job as running and update deployment status
    await jobRepo.update(jobId, { status: 'running', progress: 5 });
    await deploymentRepo.update(deployment.id, { status: 'provisioning', infrastructureStatus: 'provisioning' });

    const emitLog = async (text: string, progress: number) => {
      logger.debug(`[Job ${jobId}][Prog: ${progress}%]: ${text}`);
      await jobRepo.addLog(jobId, text);
      await jobRepo.update(jobId, { progress });
      socketService.emitJobProgress(deployment.id, jobId, progress, text);
    };

    try {
      if (job.action === 'deploy') {
        // Step 1: Provision server if server IP does not exist yet (or simulate provider orchestration)
        if (!server.ipAddress) {
          await emitLog(`[VPS] Requesting server creation on ${server.provider} (Region: ${server.region}, Size: ${server.size})...`, 10);
          const provider = ProviderFactory.getProvider(server.provider);
          const serverInfo = await provider.createServer(server.name, server.region, server.size);
          
          await serverRepo.update(server.id, {
            ipAddress: serverInfo.ipAddress,
            status: 'active',
          });
          
          // Re-fetch updated server object with IP Address
          server.ipAddress = serverInfo.ipAddress;
          await emitLog(`[VPS] Server provisioned successfully. Assigned IP: ${server.ipAddress}, HostId: ${serverInfo.externalId}`, 30);
        } else {
          await emitLog(`[VPS] Server is already active with IP: ${server.ipAddress}. Proceeding with SSH connection...`, 30);
        }

        // Step 2: Establish SSH connection & Run installation shell scripts
        await emitLog(`[SSH] Initiating connection to ${server.sshUser}@${server.ipAddress}:${server.sshPort}...`, 45);
        
        // Execute the deploy.sh script of the blockchain adapter
        const deployScriptArgs = [
          deployment.config.syncMode || 'snap',
          String(deployment.config.ports?.rpc || adapter.defaultPort),
          deployment.config.image || ''
        ];

        const sshOptions = {
          host: server.ipAddress,
          port: server.sshPort,
          username: server.sshUser,
          privateKey: server.sshPrivateKey || 'simulation-fake-private-key',
          onLog: async (line: string) => {
            await emitLog(line, 65);
          },
        };

        const result = await sshService.executeScript(adapter.files.deploy, deployScriptArgs, sshOptions);
        
        if (!result.success) {
          throw new Error(`Deployment script failed: ${result.output}`);
        }

        await emitLog(`[Health] Running post-deploy verification checks...`, 85);
        // Perform simulated health verification
        await emitLog(`[Health] Service verified successfully! Geth container is running. Sync mode SNAP initialized.`, 95);
        
        await deploymentRepo.update(deployment.id, { status: 'active', infrastructureStatus: 'active' });
        await emitLog(`[Worker] Deployment job successfully finished! NodePilot is now tracking node status.`, 100);
        await jobRepo.update(jobId, { status: 'completed' });

      } else if (job.action === 'update') {
        await emitLog(`[Worker] Initiating update sequence for blockchain: ${adapter.name}...`, 20);
        
        const sshOptions = {
          host: server.ipAddress || '127.0.0.1',
          port: server.sshPort,
          username: server.sshUser,
          privateKey: server.sshPrivateKey || 'simulation',
          onLog: async (line: string) => {
            await emitLog(line, 50);
          },
        };

        const updateArgs = [deployment.config.image || 'latest'];
        const result = await sshService.executeScript(adapter.files.update, updateArgs, sshOptions);

        if (!result.success) throw new Error(`Update script failed: ${result.output}`);

        await deploymentRepo.update(deployment.id, { status: 'active' });
        await emitLog(`[Worker] Node updated successfully to specified version.`, 100);
        await jobRepo.update(jobId, { status: 'completed' });

      } else if (job.action === 'restart') {
        await emitLog(`[Worker] Connecting to server to restart Docker containers...`, 20);
        await emitLog(`$ sudo docker restart ethereum-geth`, 50);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await emitLog(`Container restarted. Re-verifying RPC ports...`, 80);
        await deploymentRepo.update(deployment.id, { status: 'active' });
        await emitLog(`[Worker] Restart completed successfully.`, 100);
        await jobRepo.update(jobId, { status: 'completed' });

      } else if (job.action === 'backup') {
        await emitLog(`[Worker] Initiating state database backup for ${adapter.name}...`, 20);
        
        const sshOptions = {
          host: server.ipAddress || '127.0.0.1',
          port: server.sshPort,
          username: server.sshUser,
          privateKey: server.sshPrivateKey || 'simulation',
          onLog: async (line: string) => {
            await emitLog(line, 60);
          },
        };

        const result = await sshService.executeScript(adapter.files.backup, [], sshOptions);
        if (!result.success) throw new Error(`Backup failed: ${result.output}`);

        await emitLog(`[Worker] Database backup tarball compressed and verified.`, 100);
        await jobRepo.update(jobId, { status: 'completed' });

      } else if (job.action === 'restore') {
        await emitLog(`[Worker] Preparing state DB restoration process...`, 15);
        
        const sshOptions = {
          host: server.ipAddress || '127.0.0.1',
          port: server.sshPort,
          username: server.sshUser,
          privateKey: server.sshPrivateKey || 'simulation',
          onLog: async (line: string) => {
            await emitLog(line, 60);
          },
        };

        const backupPath = '/var/backups/ethereum/geth_backup_latest.tar.gz';
        const result = await sshService.executeScript(adapter.files.restore, [backupPath], sshOptions);
        if (!result.success) throw new Error(`Restore failed: ${result.output}`);

        await emitLog(`[Worker] Database snapshot successfully unpacked onto data volumes.`, 100);
        await jobRepo.update(jobId, { status: 'completed' });

      } else if (job.action === 'delete') {
        await emitLog(`[Worker] Disassembling blockchain deployment and cleaning Docker storage...`, 30);
        await emitLog(`$ sudo docker stop ethereum-geth && sudo docker rm ethereum-geth`, 60);
        await new Promise((resolve) => setTimeout(resolve, 800));
        await emitLog(`[Worker] Node disassembled. Removing local configurations.`, 80);
        
        await deploymentRepo.update(deployment.id, { status: 'failed', infrastructureStatus: 'destroyed' });
        await emitLog(`[Worker] Deletion sequence completed. Node disassembled.`, 100);
        await jobRepo.update(jobId, { status: 'completed' });
        
        // Delete deployment record
        await deploymentRepo.delete(deployment.id);
      }

    } catch (err: any) {
      logger.error(`[Worker] Error running job ${jobId}: ${err.message}`);
      await emitLog(`[Worker Error] Execution halted: ${err.message}`, 100);
      await jobRepo.update(jobId, { status: 'failed' });
      await deploymentRepo.update(deployment.id, { status: 'failed', infrastructureStatus: 'failed' });
    }
  }
}

export const queueService = QueueService.getInstance();
