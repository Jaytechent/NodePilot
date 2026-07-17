import { Request, Response, NextFunction } from 'express';
import { monitoringService } from './monitoring.service';
import { BadRequestError } from '../../utils/errors';

export class MonitoringController {
  public async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deploymentId } = req.params;
      if (!deploymentId) throw new BadRequestError('deploymentId param is required.');
      const result = await monitoringService.getLatestMetric(deploymentId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deploymentId } = req.params;
      if (!deploymentId) throw new BadRequestError('deploymentId param is required.');
      const result = await monitoringService.getMetricHistory(deploymentId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
export const monitoringController = new MonitoringController();
