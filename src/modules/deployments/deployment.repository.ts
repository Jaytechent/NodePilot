import { IDeployment } from '../../types';
import { DeploymentModel } from './deployment.model';
import { getIsMongooseConnected } from '../../db/connection';
import { logger } from '../../utils/logger';

const inMemoryDeployments = new Map<string, IDeployment>();

export class DeploymentRepository {
  async findById(id: string): Promise<IDeployment | null> {
    if (getIsMongooseConnected()) {
      try {
        const deployment = await DeploymentModel.findById(id).exec();
        return deployment ? (deployment.toJSON() as unknown as IDeployment) : null;
      } catch (err: any) {
        logger.error(`DeploymentRepository findById error: ${err.message}`);
      }
    }
    return inMemoryDeployments.get(id) || null;
  }

  async listByProjectId(projectId: string): Promise<IDeployment[]> {
    if (getIsMongooseConnected()) {
      try {
        const deployments = await DeploymentModel.find({ projectId }).exec();
        return deployments.map((d) => d.toJSON() as unknown as IDeployment);
      } catch (err: any) {
        logger.error(`DeploymentRepository listByProjectId error: ${err.message}`);
      }
    }
    const list: IDeployment[] = [];
    for (const d of inMemoryDeployments.values()) {
      if (d.projectId === projectId) {
        list.push(d);
      }
    }
    return list;
  }

  async listByServerId(serverId: string): Promise<IDeployment[]> {
    if (getIsMongooseConnected()) {
      try {
        const deployments = await DeploymentModel.find({ serverId }).exec();
        return deployments.map((d) => d.toJSON() as unknown as IDeployment);
      } catch (err: any) {
        logger.error(`DeploymentRepository listByServerId error: ${err.message}`);
      }
    }
    const list: IDeployment[] = [];
    for (const d of inMemoryDeployments.values()) {
      if (d.serverId === serverId) {
        list.push(d);
      }
    }
    return list;
  }

  async listAll(): Promise<IDeployment[]> {
    if (getIsMongooseConnected()) {
      try {
        const deployments = await DeploymentModel.find().exec();
        return deployments.map((d) => d.toJSON() as unknown as IDeployment);
      } catch (err: any) {
        logger.error(`DeploymentRepository listAll error: ${err.message}`);
      }
    }
    return Array.from(inMemoryDeployments.values());
  }

  async create(deployment: Omit<IDeployment, 'createdAt' | 'updatedAt'>): Promise<IDeployment> {
    const now = new Date();
    const newDeployment: IDeployment = {
      ...deployment,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsMongooseConnected()) {
      try {
        const deploymentDoc = new DeploymentModel({
          _id: newDeployment.id,
          serverId: newDeployment.serverId,
          projectId: newDeployment.projectId,
          blockchainId: newDeployment.blockchainId,
          nodeType: newDeployment.nodeType,
          status: newDeployment.status,
          config: newDeployment.config,
          vpsCost: newDeployment.vpsCost,
          storageCost: newDeployment.storageCost,
          bandwidthCost: newDeployment.bandwidthCost,
          profitMargin: newDeployment.profitMargin,
          totalCost: newDeployment.totalCost,
          totalPrice: newDeployment.totalPrice,
          billingStatus: newDeployment.billingStatus,
          infrastructureStatus: newDeployment.infrastructureStatus,
        });
        await deploymentDoc.save();
        return deploymentDoc.toJSON() as unknown as IDeployment;
      } catch (err: any) {
        logger.error(`DeploymentRepository create error: ${err.message}. Saving to memory.`);
      }
    }

    inMemoryDeployments.set(newDeployment.id, newDeployment);
    return newDeployment;
  }

  async update(id: string, updates: Partial<Omit<IDeployment, 'id' | 'serverId' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<IDeployment | null> {
    if (getIsMongooseConnected()) {
      try {
        const deployment = await DeploymentModel.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        ).exec();
        return deployment ? (deployment.toJSON() as unknown as IDeployment) : null;
      } catch (err: any) {
        logger.error(`DeploymentRepository update error: ${err.message}`);
      }
    }

    const deployment = inMemoryDeployments.get(id);
    if (!deployment) return null;

    const updatedDeployment: IDeployment = {
      ...deployment,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryDeployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  async delete(id: string): Promise<boolean> {
    if (getIsMongooseConnected()) {
      try {
        const res = await DeploymentModel.deleteOne({ _id: id }).exec();
        return (res.deletedCount ?? 0) > 0;
      } catch (err: any) {
        logger.error(`DeploymentRepository delete error: ${err.message}`);
      }
    }
    return inMemoryDeployments.delete(id);
  }
}
