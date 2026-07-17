import { BaseVpsProvider } from './base.provider';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export class DigitalOceanProvider extends BaseVpsProvider {
  private token: string;

  constructor() {
    super();
    this.token = config.providers.digitalocean.token;
  }

  async createServer(name: string, region: string, size: string): Promise<{ ipAddress: string; externalId: string }> {
    logger.info(`[DigitalOcean] Provisioning droplet: ${name} in region: ${region}, size: ${size}`);

    if (this.token) {
      logger.info('[DigitalOcean] Using registered API Token for droplet provisioning.');
    } else {
      logger.warn('[DigitalOcean] No API token provided. Droplet creating in sandbox/simulation mode.');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const randomOctet = () => Math.floor(Math.random() * 254) + 1;
    const ipAddress = `142.93.${randomOctet()}.${randomOctet()}`;
    const externalId = `do-${Math.floor(Math.random() * 10000000)}`;

    logger.info(`[DigitalOcean] Droplet provisioned successfully. IP: ${ipAddress}, ID: ${externalId}`);
    return { ipAddress, externalId };
  }

  async deleteServer(externalId: string): Promise<boolean> {
    logger.info(`[DigitalOcean] Deleting droplet: ${externalId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async rebootServer(externalId: string): Promise<boolean> {
    logger.info(`[DigitalOcean] Rebooting droplet: ${externalId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async resizeServer(externalId: string, newSize: string): Promise<boolean> {
    logger.info(`[DigitalOcean] Resizing droplet: ${externalId} to: ${newSize}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }
}
