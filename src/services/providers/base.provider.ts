import { IVpsProvider } from '../../types';

export abstract class BaseVpsProvider implements IVpsProvider {
  abstract createServer(name: string, region: string, size: string): Promise<{ ipAddress: string; externalId: string }>;
  abstract deleteServer(externalId: string): Promise<boolean>;
  abstract rebootServer(externalId: string): Promise<boolean>;
  abstract resizeServer(externalId: string, newSize: string): Promise<boolean>;
}
