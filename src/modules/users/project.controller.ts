import { Response, NextFunction } from 'express';
import { ProjectService } from './project.service';
import { ZodError, z } from 'zod';
import { BadRequestError } from '../../utils/errors';

const projectService = new ProjectService();

const createProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export class ProjectController {
  public async create(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProjectSchema.parse(req.body);
      const project = await projectService.createProject(validated.name, validated.description, req.user.id);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      if (err instanceof ZodError) return next(new BadRequestError(err.issues[0].message));
      next(err);
    }
  }

  public async get(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProject(req.params.id, req.user.id);
      res.status(200).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  public async list(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      // Admins/Operators can view all projects. Standard users view their own.
      const list = (req.user.role === 'Admin' || req.user.role === 'Operator')
        ? await projectService.listAllProjects()
        : await projectService.listUserProjects(req.user.id);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }

  public async update(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      const project = await projectService.updateProject(req.params.id, name, description, req.user.id);
      res.status(200).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  }

  public async delete(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteProject(req.params.id, req.user.id);
      res.status(200).json({ success: true, message: 'Project deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
}
