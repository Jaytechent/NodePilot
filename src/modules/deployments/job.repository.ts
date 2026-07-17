import { IDeploymentJob } from '../../types';
import { DeploymentJobModel } from './job.model';
import { getIsMongooseConnected } from '../../db/connection';
import { logger } from '../../utils/logger';

const inMemoryJobs = new Map<string, IDeploymentJob>();

export class DeploymentJobRepository {
  async findById(id: string): Promise<IDeploymentJob | null> {
    if (getIsMongooseConnected()) {
      try {
        const job = await DeploymentJobModel.findById(id).exec();
        return job ? (job.toJSON() as unknown as IDeploymentJob) : null;
      } catch (err: any) {
        logger.error(`DeploymentJobRepository findById error: ${err.message}`);
      }
    }
    return inMemoryJobs.get(id) || null;
  }

  async listByDeploymentId(deploymentId: string): Promise<IDeploymentJob[]> {
    if (getIsMongooseConnected()) {
      try {
        const jobs = await DeploymentJobModel.find({ deploymentId }).sort({ createdAt: -1 }).exec();
        return jobs.map((j) => j.toJSON() as unknown as IDeploymentJob);
      } catch (err: any) {
        logger.error(`DeploymentJobRepository listByDeploymentId error: ${err.message}`);
      }
    }
    const list: IDeploymentJob[] = [];
    for (const job of inMemoryJobs.values()) {
      if (job.deploymentId === deploymentId) {
        list.push(job);
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listAll(): Promise<IDeploymentJob[]> {
    if (getIsMongooseConnected()) {
      try {
        const jobs = await DeploymentJobModel.find().sort({ createdAt: -1 }).exec();
        return jobs.map((j) => j.toJSON() as unknown as IDeploymentJob);
      } catch (err: any) {
        logger.error(`DeploymentJobRepository listAll error: ${err.message}`);
      }
    }
    return Array.from(inMemoryJobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(job: Omit<IDeploymentJob, 'createdAt' | 'updatedAt'>): Promise<IDeploymentJob> {
    const now = new Date();
    const newJob: IDeploymentJob = {
      ...job,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsMongooseConnected()) {
      try {
        const jobDoc = new DeploymentJobModel({
          _id: newJob.id,
          deploymentId: newJob.deploymentId,
          action: newJob.action,
          status: newJob.status,
          progress: newJob.progress,
          logs: newJob.logs,
        });
        await jobDoc.save();
        return jobDoc.toJSON() as unknown as IDeploymentJob;
      } catch (err: any) {
        logger.error(`DeploymentJobRepository create error: ${err.message}. Saving to memory.`);
      }
    }

    inMemoryJobs.set(newJob.id, newJob);
    return newJob;
  }

  async update(id: string, updates: Partial<Omit<IDeploymentJob, 'id' | 'deploymentId' | 'createdAt' | 'updatedAt'>>): Promise<IDeploymentJob | null> {
    if (getIsMongooseConnected()) {
      try {
        const job = await DeploymentJobModel.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        ).exec();
        return job ? (job.toJSON() as unknown as IDeploymentJob) : null;
      } catch (err: any) {
        logger.error(`DeploymentJobRepository update error: ${err.message}`);
      }
    }

    const job = inMemoryJobs.get(id);
    if (!job) return null;

    const updatedJob: IDeploymentJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryJobs.set(id, updatedJob);
    return updatedJob;
  }

  async addLog(id: string, logLine: string): Promise<IDeploymentJob | null> {
    if (getIsMongooseConnected()) {
      try {
        const job = await DeploymentJobModel.findByIdAndUpdate(
          id,
          { $push: { logs: logLine } },
          { new: true }
        ).exec();
        return job ? (job.toJSON() as unknown as IDeploymentJob) : null;
      } catch (err: any) {
        logger.error(`DeploymentJobRepository addLog error: ${err.message}`);
      }
    }

    const job = inMemoryJobs.get(id);
    if (!job) return null;

    const updatedJob: IDeploymentJob = {
      ...job,
      logs: [...job.logs, logLine],
      updatedAt: new Date(),
    };
    inMemoryJobs.set(id, updatedJob);
    return updatedJob;
  }
}
