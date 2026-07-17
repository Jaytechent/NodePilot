import { MetricRepository } from './metric.repository';
import { DeploymentRepository } from '../deployments/deployment.repository';
import { socketService } from '../../services/socket.service';
import { logger } from '../../utils/logger';
import { IMetric } from '../../types';

const metricRepo = new MetricRepository();
const deploymentRepo = new DeploymentRepository();

export class MonitoringService {
  private timer: NodeJS.Timeout | null = null;

  public async startMonitoringDaemon(): Promise<void> {
    logger.info('[Monitoring] Starting System Metrics Collection Daemon...');
    
    // Auto-seed historical metrics for any active nodes so charts load instantly
    await this.seedHistoricalMetricsIfEmpty();

    this.timer = setInterval(async () => {
      try {
        await this.collectActiveMetrics();
      } catch (err: any) {
        logger.error(`[Monitoring] Error collecting stats: ${err.message}`);
      }
    }, 15000); // Collect every 15s for visual updates in development
  }

  public stopMonitoringDaemon(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('[Monitoring] System Metrics Collection Daemon stopped.');
    }
  }

  /**
   * Main metrics gather loop for all active blockchain deployments
   */
  private async collectActiveMetrics(): Promise<void> {
    const deployments = await deploymentRepo.listAll();
    const activeNodes = deployments.filter((d) => d.status === 'active');

    if (activeNodes.length === 0) return;

    for (const node of activeNodes) {
      // Simulate/Gather parameters dynamically
      const cpu = Math.floor(Math.random() * 30) + 15 + (Math.random() > 0.95 ? 45 : 0); // spikes sometimes
      const ram = Math.floor(Math.random() * 10) + 60; // 60-70% usage
      const disk = 42.1; // static usage
      const bandwidth = Math.floor(Math.random() * 200) + 150; // KB/s
      const peerCount = node.blockchainId === 'ethereum' 
        ? Math.floor(Math.random() * 8) + 20 
        : Math.floor(Math.random() * 50) + 100;
      
      const rpcStatus = Math.random() > 0.99 ? 'offline' : 'online';
      const validatorStatus = Math.random() > 0.995 ? 'inactive' : 'active';
      
      // Get previous metrics for incremental height
      const previous = await metricRepo.findLatestByDeploymentId(node.id);
      const startingHeight = previous?.blockHeight || (node.blockchainId === 'ethereum' ? 19827361 : 261736271);
      const blockHeight = startingHeight + Math.floor(Math.random() * 3) + 1;
      
      const incrementalRewards = (Math.random() * 0.005);
      const rewards = (previous?.rewards || 12.35) + incrementalRewards;
      
      const missedBlocks = (previous?.missedBlocks || 0) + (Math.random() > 0.98 ? 1 : 0);

      const metricId = `met-${Math.random().toString(36).substr(2, 9)}`;
      
      const metric = await metricRepo.create({
        id: metricId,
        deploymentId: node.id,
        cpu,
        ram,
        disk,
        bandwidth,
        peerCount,
        validatorStatus,
        rpcStatus,
        rewards,
        blockHeight,
        missedBlocks,
      });

      // Stream to Socket.io client room
      socketService.emitMetrics(node.id, metric);

      // Process Alerts triggers
      await this.evaluateAlertThresholds(node.id, metric, node.projectId);
    }
  }

  /**
   * Analyzes node metrics and fires real-time warnings to WebSockets
   */
  private async evaluateAlertThresholds(deploymentId: string, m: IMetric, projectId: string): Promise<void> {
    if (m.cpu > 80) {
      const alert = {
        id: `alt-${Math.random().toString(36).substr(2, 9)}`,
        deploymentId,
        severity: 'critical',
        metricType: 'cpu',
        message: `High CPU Utilization Detected on Node: ${m.cpu}% usage exceeds 80% threshold limit.`,
      };
      logger.warn(`[Alert] Critical CPU alert on ${deploymentId}`);
      socketService.emitAlert(projectId, alert);
    }

    if (m.rpcStatus === 'offline') {
      const alert = {
        id: `alt-${Math.random().toString(36).substr(2, 9)}`,
        deploymentId,
        severity: 'critical',
        metricType: 'rpc',
        message: `Node JSON-RPC Endpoint Unresponsive! Port check failed.`,
      };
      logger.error(`[Alert] Critical RPC failure on ${deploymentId}`);
      socketService.emitAlert(projectId, alert);
    }

    if (m.missedBlocks > 0 && Math.random() > 0.9) {
      const alert = {
        id: `alt-${Math.random().toString(36).substr(2, 9)}`,
        deploymentId,
        severity: 'warning',
        metricType: 'consensus',
        message: `Validator Missed Proposals Counter Incremented: Missed ${m.missedBlocks} total blocks.`,
      };
      logger.warn(`[Alert] Validator proposal warning on ${deploymentId}`);
      socketService.emitAlert(projectId, alert);
    }
  }

  /**
   * Seed metrics upon boot so historical graph loads immediately in UI
   */
  private async seedHistoricalMetricsIfEmpty(): Promise<void> {
    const deployments = await deploymentRepo.listAll();
    for (const node of deployments) {
      const previous = await metricRepo.findLatestByDeploymentId(node.id);
      if (previous) continue; // Already has metrics

      logger.info(`[Monitoring] Seeding 24 hours of historical charts data for node: ${node.id}`);
      
      const now = Date.now();
      let rewardsAccum = 1.0;
      let height = node.blockchainId === 'ethereum' ? 19825000 : 261700000;

      // Seed 24 intervals of 1 hour back
      for (let i = 24; i >= 1; i--) {
        const intervalTime = new Date(now - i * 60 * 60 * 1000);
        const cpu = Math.floor(Math.random() * 20) + 15;
        const ram = Math.floor(Math.random() * 5) + 62;
        const bandwidth = Math.floor(Math.random() * 100) + 120;
        const peers = node.blockchainId === 'ethereum' ? 24 : 110;
        rewardsAccum += Math.random() * 0.1;
        height += Math.floor(Math.random() * 300) + 100;

        await metricRepo.create({
          id: `met-seed-${Math.random().toString(36).substr(2, 9)}`,
          deploymentId: node.id,
          cpu,
          ram,
          disk: 41.5,
          bandwidth,
          peerCount: peers,
          validatorStatus: 'active',
          rpcStatus: 'online',
          rewards: rewardsAccum,
          blockHeight: height,
          missedBlocks: Math.random() > 0.95 ? 1 : 0,
          timestamp: intervalTime,
        });
      }
    }
  }

  async getLatestMetric(deploymentId: string): Promise<IMetric | null> {
    return metricRepo.findLatestByDeploymentId(deploymentId);
  }

  async getMetricHistory(deploymentId: string): Promise<IMetric[]> {
    return metricRepo.getHistoryByDeploymentId(deploymentId, 50);
  }
}

export const monitoringService = new MonitoringService();
