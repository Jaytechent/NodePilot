import { ServerRepository } from './server.repository';
import { IServer } from '../../types';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { ProviderFactory } from '../../services/providers/provider.factory';

const serverRepo = new ServerRepository();

export class ServerService {
  async getServer(id: string): Promise<IServer> {
    const server = await serverRepo.findById(id);
    if (!server) throw new NotFoundError('Server not found.');
    return server;
  }

  async listProjectServers(projectId: string): Promise<IServer[]> {
    return serverRepo.listByProjectId(projectId);
  }

  async createServer(
    projectId: string,
    name: string,
    provider: 'Hetzner' | 'DigitalOcean' | 'Contabo' | 'AWS EC2',
    region: string,
    size: string,
    customIp?: string
  ): Promise<IServer> {
    const id = `srv-${Math.random().toString(36).substr(2, 9)}`;

    // Set up standard SSH metadata
    const sshPort = 22;
    const sshUser = 'root';
    const sshPrivateKey = 'simulation-handshake-v1';

    const server = await serverRepo.create({
      id,
      projectId,
      name,
      ipAddress: customIp || undefined, // If customIp provided, skip provider createServer step during job
      sshPort,
      sshUser,
      sshPrivateKey,
      provider,
      region,
      size,
      status: customIp ? 'active' : 'provisioning',
    });

    return server;
  }

  async rebootServer(id: string): Promise<boolean> {
    const server = await this.getServer(id);
    const providerInstance = ProviderFactory.getProvider(server.provider);
    return providerInstance.rebootServer(`provider-id-${server.id}`);
  }

  async deleteServer(id: string): Promise<boolean> {
    const server = await this.getServer(id);
    const providerInstance = ProviderFactory.getProvider(server.provider);
    await providerInstance.deleteServer(`provider-id-${server.id}`);
    return serverRepo.delete(id);
  }
}
