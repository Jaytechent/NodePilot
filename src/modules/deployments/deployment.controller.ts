import { Request, Response, NextFunction } from 'express';
import { DeploymentService } from './deployment.service';
import { ZodError, z } from 'zod';
import { BadRequestError } from '../../utils/errors';

const deploymentService = new DeploymentService();

const createDeploymentSchema = z.object({
  projectId: z.string().min(1),
  serverId: z.string().min(1),
  blockchainId: z.string().min(1),
  nodeType: z.enum(['validator', 'full', 'rpc']),
  config: z.record(z.string(), z.any()).default({}),
});

const actionSchema = z.object({
  action: z.enum(['update', 'restart', 'backup', 'restore', 'delete']),
  config: z.record(z.string(), z.any()).optional(),
});

export class DeploymentController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createDeploymentSchema.parse(req.body);
      const result = await deploymentService.createDeployment(
        validated.projectId,
        validated.serverId,
        validated.blockchainId,
        validated.nodeType,
        validated.config,
        (req as any).user.id
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) return next(new BadRequestError(err.issues[0].message));
      next(err);
    }
  }

  public async pay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await deploymentService.payDeployment(req.params.id, (req as any).user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deployment = await deploymentService.getDeployment(req.params.id);
      res.status(200).json({ success: true, data: deployment });
    } catch (err) {
      next(err);
    }
  }

  public async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) {
        throw new BadRequestError('projectId query parameter is required.');
      }
      const list = await deploymentService.listProjectDeployments(projectId);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }

  public async triggerAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = actionSchema.parse(req.body);
      const job = await deploymentService.triggerAction(req.params.id, validated.action, validated.config);
      res.status(202).json({ success: true, data: { job } });
    } catch (err) {
      if (err instanceof ZodError) return next(new BadRequestError(err.issues[0].message));
      next(err);
    }
  }

  public async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobs = await deploymentService.getDeploymentJobs(req.params.id);
      res.status(200).json({ success: true, data: jobs });
    } catch (err) {
      next(err);
    }
  }

  public async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await deploymentService.getJob(req.params.jobId);
      res.status(200).json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  public async listAllJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await deploymentService.listAllJobs();
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }
}
export const deploymentController = new DeploymentController();
