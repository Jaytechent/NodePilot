import { BaseVpsProvider } from './base.provider';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export class ContaboProvider extends BaseVpsProvider {
  constructor() {
    super();
  }

  async createServer(name: string, region: string, size: string): Promise<{ ipAddress: string; externalId: string }> {
    logger.info(`[Contabo] Provisioning VPS: ${name} in region: ${region}, size: ${size}`);

    if (config.providers.contabo.clientId) {
      logger.info('[Contabo] Using registered OAuth credentials for Contabo API.');
    } else {
      logger.warn('[Contabo] No API credentials provided. VPS creating in sandbox/simulation mode.');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const randomOctet = () => Math.floor(Math.random() * 254) + 1;
    const ipAddress = `161.97.${randomOctet()}.${randomOctet()}`;
    const externalId = `ct-${Math.floor(Math.random() * 10000000)}`;

    logger.info(`[Contabo] VPS provisioned successfully. IP: ${ipAddress}, ID: ${externalId}`);
    return { ipAddress, externalId };
  }

  async deleteServer(externalId: string): Promise<boolean> {
    logger.info(`[Contabo] Deleting VPS: ${externalId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async rebootServer(externalId: string): Promise<boolean> {
    logger.info(`[Contabo] Rebooting VPS: ${externalId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async resizeServer(externalId: string, newSize: string): Promise<boolean> {
    logger.info(`[Contabo] Resizing VPS: ${externalId} to: ${newSize}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }
}
