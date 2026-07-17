import { Request, Response, NextFunction } from 'express';
import { ServerService } from './server.service';
import { ZodError, z } from 'zod';
import { BadRequestError } from '../../utils/errors';

const serverService = new ServerService();

const createServerSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2),
  provider: z.enum(['Hetzner', 'DigitalOcean', 'Contabo', 'AWS EC2']),
  region: z.string().min(1),
  size: z.string().min(1),
  customIp: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP Address').optional(),
});

export class ServerController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createServerSchema.parse(req.body);
      const server = await serverService.createServer(
        validated.projectId,
        validated.name,
        validated.provider,
        validated.region,
        validated.size,
        validated.customIp
      );
      res.status(211).json({ success: true, data: server });
    } catch (err) {
      if (err instanceof ZodError) return next(new BadRequestError(err.issues[0].message));
      next(err);
    }
  }

  public async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const server = await serverService.getServer(req.params.id);
      res.status(200).json({ success: true, data: server });
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
      const list = await serverService.listProjectServers(projectId);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  }

  public async reboot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await serverService.rebootServer(req.params.id);
      res.status(200).json({ success: true, data: { rebooted: result } });
    } catch (err) {
      next(err);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await serverService.deleteServer(req.params.id);
      res.status(200).json({ success: true, message: 'Server decommissioned successfully.' });
    } catch (err) {
      next(err);
    }
  }
}
