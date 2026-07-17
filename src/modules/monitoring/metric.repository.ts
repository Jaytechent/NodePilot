import { IMetric } from '../../types';
import { MetricModel } from './metric.model';
import { getIsMongooseConnected } from '../../db/connection';
import { logger } from '../../utils/logger';

const inMemoryMetrics: IMetric[] = [];

export class MetricRepository {
  async findLatestByDeploymentId(deploymentId: string): Promise<IMetric | null> {
    if (getIsMongooseConnected()) {
      try {
        const metric = await MetricModel.findOne({ deploymentId }).sort({ timestamp: -1 }).exec();
        return metric ? (metric.toJSON() as unknown as IMetric) : null;
      } catch (err: any) {
        logger.error(`MetricRepository findLatestByDeploymentId error: ${err.message}`);
      }
    }
    const filtered = inMemoryMetrics.filter((m) => m.deploymentId === deploymentId);
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  async getHistoryByDeploymentId(deploymentId: string, limit = 100): Promise<IMetric[]> {
    if (getIsMongooseConnected()) {
      try {
        const metrics = await MetricModel.find({ deploymentId })
          .sort({ timestamp: -1 })
          .limit(limit)
          .exec();
        // Return chronologically
        return metrics.map((m) => m.toJSON() as unknown as IMetric).reverse();
      } catch (err: any) {
        logger.error(`MetricRepository getHistoryByDeploymentId error: ${err.message}`);
      }
    }
    const filtered = inMemoryMetrics.filter((m) => m.deploymentId === deploymentId);
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .reverse();
  }

  async create(metric: Omit<IMetric, 'timestamp'> & { timestamp?: Date }): Promise<IMetric> {
    const newMetric: IMetric = {
      ...metric,
      timestamp: metric.timestamp || new Date(),
    };

    if (getIsMongooseConnected()) {
      try {
        const metricDoc = new MetricModel({
          _id: newMetric.id,
          deploymentId: newMetric.deploymentId,
          cpu: newMetric.cpu,
          ram: newMetric.ram,
          disk: newMetric.disk,
          bandwidth: newMetric.bandwidth,
          peerCount: newMetric.peerCount,
          validatorStatus: newMetric.validatorStatus,
          rpcStatus: newMetric.rpcStatus,
          rewards: newMetric.rewards,
          blockHeight: newMetric.blockHeight,
          missedBlocks: newMetric.missedBlocks,
          timestamp: newMetric.timestamp,
        });
        await metricDoc.save();
        return metricDoc.toJSON() as unknown as IMetric;
      } catch (err: any) {
        logger.error(`MetricRepository create error: ${err.message}. Saving to memory.`);
      }
    }

    inMemoryMetrics.push(newMetric);
    // Keep in-memory metrics size bounded
    if (inMemoryMetrics.length > 5000) {
      inMemoryMetrics.shift();
    }
    return newMetric;
  }
}
