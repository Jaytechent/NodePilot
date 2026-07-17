import { Request, Response, NextFunction } from 'express';

export class NotificationController {
  public async getLogs(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: [
          {
            id: 'ntf-10293',
            type: 'alert',
            channel: 'slack',
            title: 'Critical CPU Usage',
            message: 'High CPU utilization detected on Ethereum Node Geth-01.',
            dispatchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
            status: 'success',
          },
          {
            id: 'ntf-10292',
            type: 'deployment',
            channel: 'email',
            title: 'Node Deployment Successful',
            message: 'Solana RPC Node has successfully finished deployment in aws-us-east-1.',
            dispatchedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            status: 'success',
          },
        ],
      });
    } catch (err) {
      next(err);
    }
  }

  public async getSettings(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          channels: {
            email: { enabled: true, address: req.user.email || 'developer@nodepilot.ai' },
            slack: { enabled: true, webhookUrl: 'https://hooks.slack.com/services/...' },
            telegram: { enabled: false, chatId: '' },
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
export const notificationController = new NotificationController();
