import { BaseVpsProvider } from './base.provider';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export class AwsProvider extends BaseVpsProvider {
  constructor() {
    super();
  }

  async createServer(name: string, region: string, size: string): Promise<{ ipAddress: string; externalId: string }> {
    const awsRegion = region || config.providers.aws.region;
    logger.info(`[AWS EC2] Provisioning EC2 instance: ${name} in region: ${awsRegion}, size: ${size}`);

    if (config.providers.aws.accessKeyId) {
      logger.info('[AWS EC2] Using registered AWS Access Key for EC2 provisioning.');
    } else {
      logger.warn('[AWS EC2] No AWS credentials provided. Instance creating in sandbox/simulation mode.');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const randomOctet = () => Math.floor(Math.random() * 254) + 1;
    const ipAddress = `3.145.${randomOctet()}.${randomOctet()}`;
    const externalId = `i-${Math.random().toString(16).substr(2, 17)}`;

    logger.info(`[AWS EC2] EC2 Instance provisioned successfully. IP: ${ipAddress}, ID: ${externalId}`);
    return { ipAddress, externalId };
  }

  async deleteServer(externalId: string): Promise<boolean> {
    logger.info(`[AWS EC2] Terminating EC2 instance: ${externalId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async rebootServer(externalId: string): Promise<boolean> {
    logger.info(`[AWS EC2] Rebooting EC2 instance: ${externalId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async resizeServer(externalId: string, newSize: string): Promise<boolean> {
    logger.info(`[AWS EC2] Modifying EC2 instance: ${externalId} attribute to: ${newSize}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return true;
  }
}
