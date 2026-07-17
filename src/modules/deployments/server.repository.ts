import { IServer } from '../../types';
import { ServerModel } from './server.model';
import { getIsMongooseConnected } from '../../db/connection';
import { logger } from '../../utils/logger';

const inMemoryServers = new Map<string, IServer>();

export class ServerRepository {
  async findById(id: string): Promise<IServer | null> {
    if (getIsMongooseConnected()) {
      try {
        const server = await ServerModel.findById(id).exec();
        return server ? (server.toJSON() as unknown as IServer) : null;
      } catch (err: any) {
        logger.error(`ServerRepository findById error: ${err.message}`);
      }
    }
    return inMemoryServers.get(id) || null;
  }

  async listByProjectId(projectId: string): Promise<IServer[]> {
    if (getIsMongooseConnected()) {
      try {
        const servers = await ServerModel.find({ projectId }).exec();
        return servers.map((s) => s.toJSON() as unknown as IServer);
      } catch (err: any) {
        logger.error(`ServerRepository listByProjectId error: ${err.message}`);
      }
    }
    const list: IServer[] = [];
    for (const server of inMemoryServers.values()) {
      if (server.projectId === projectId) {
        list.push(server);
      }
    }
    return list;
  }

  async listAll(): Promise<IServer[]> {
    if (getIsMongooseConnected()) {
      try {
        const servers = await ServerModel.find().exec();
        return servers.map((s) => s.toJSON() as unknown as IServer);
      } catch (err: any) {
        logger.error(`ServerRepository listAll error: ${err.message}`);
      }
    }
    return Array.from(inMemoryServers.values());
  }

  async create(server: Omit<IServer, 'createdAt' | 'updatedAt'>): Promise<IServer> {
    const now = new Date();
    const newServer: IServer = {
      ...server,
      createdAt: now,
      updatedAt: now,
    };

    if (getIsMongooseConnected()) {
      try {
        const serverDoc = new ServerModel({
          _id: newServer.id,
          projectId: newServer.projectId,
          name: newServer.name,
          ipAddress: newServer.ipAddress,
          sshPort: newServer.sshPort,
          sshUser: newServer.sshUser,
          sshPrivateKey: newServer.sshPrivateKey,
          provider: newServer.provider,
          region: newServer.region,
          size: newServer.size,
          status: newServer.status,
        });
        await serverDoc.save();
        return serverDoc.toJSON() as unknown as IServer;
      } catch (err: any) {
        logger.error(`ServerRepository create error: ${err.message}. Saving to memory.`);
      }
    }

    inMemoryServers.set(newServer.id, newServer);
    return newServer;
  }

  async update(id: string, updates: Partial<Omit<IServer, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<IServer | null> {
    if (getIsMongooseConnected()) {
      try {
        const server = await ServerModel.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        ).exec();
        return server ? (server.toJSON() as unknown as IServer) : null;
      } catch (err: any) {
        logger.error(`ServerRepository update error: ${err.message}`);
      }
    }

    const server = inMemoryServers.get(id);
    if (!server) return null;

    const updatedServer: IServer = {
      ...server,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryServers.set(id, updatedServer);
    return updatedServer;
  }

  async delete(id: string): Promise<boolean> {
    if (getIsMongooseConnected()) {
      try {
        const res = await ServerModel.deleteOne({ _id: id }).exec();
        return (res.deletedCount ?? 0) > 0;
      } catch (err: any) {
        logger.error(`ServerRepository delete error: ${err.message}`);
      }
    }
    return inMemoryServers.delete(id);
  }
}
