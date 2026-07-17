import { Request, Response, NextFunction } from 'express';
import { adapterLoader } from './adapter.loader';

export class AdapterController {
  public list(req: Request, res: Response, next: NextFunction): void {
    try {
      const adapters = adapterLoader.listAdapters();
      res.status(200).json({
        success: true,
        data: adapters.map((a) => ({
          id: a.id,
          name: a.name,
          version: a.version,
          description: a.description,
          supportedTypes: a.supportedTypes,
          defaultPort: a.defaultPort,
          minSpecs: a.minSpecs,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  public get(req: Request, res: Response, next: NextFunction): void {
    try {
      const adapter = adapterLoader.getAdapter(req.params.id);
      if (!adapter) {
        res.status(404).json({ success: false, message: 'Blockchain adapter not registered.' });
        return;
      }
      res.status(200).json({
        success: true,
        data: {
          id: adapter.id,
          name: adapter.name,
          version: adapter.version,
          description: adapter.description,
          supportedTypes: adapter.supportedTypes,
          defaultPort: adapter.defaultPort,
          minSpecs: adapter.minSpecs,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
export const adapterController = new AdapterController();
