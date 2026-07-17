import { Server as HttpServer } from 'http';
import { Server as SocketIoServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketService {
  private static instance: SocketService;
  private io: SocketIoServer | null = null;

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(server: HttpServer): void {
    if (this.io) {
      logger.warn('[Socket] SocketIoServer is already initialized.');
      return;
    }

    this.io = new SocketIoServer(server, {
      cors: {
        origin: '*', // Allow standard API connections
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`[Socket] Client connected: ${socket.id}`);

      // Join a project room for isolated real-time events
      socket.on('join:project', (projectId: string) => {
        socket.join(`project:${projectId}`);
        logger.info(`[Socket] Socket ${socket.id} joined room project:${projectId}`);
        socket.emit('joined', { room: `project:${projectId}` });
      });

      // Join a specific deployment progress channel
      socket.on('join:deployment', (deploymentId: string) => {
        socket.join(`deployment:${deploymentId}`);
        logger.info(`[Socket] Socket ${socket.id} joined room deployment:${deploymentId}`);
        socket.emit('joined', { room: `deployment:${deploymentId}` });
      });

      socket.on('disconnect', () => {
        logger.info(`[Socket] Client disconnected: ${socket.id}`);
      });
    });

    logger.info('[Socket] Socket.io server initialized successfully.');
  }

  /**
   * Emit progress logs of a deployment job
   */
  public emitJobProgress(deploymentId: string, jobId: string, progress: number, logLine?: string): void {
    if (!this.io) return;
    this.io.to(`deployment:${deploymentId}`).to(`project:${deploymentId}`).emit('job:progress', {
      deploymentId,
      jobId,
      progress,
      logLine,
      timestamp: new Date(),
    });
  }

  /**
   * Emit metrics in real-time
   */
  public emitMetrics(deploymentId: string, metrics: any): void {
    if (!this.io) return;
    this.io.to(`deployment:${deploymentId}`).emit('metrics:updated', {
      deploymentId,
      metrics,
      timestamp: new Date(),
    });
  }

  /**
   * Emit alert triggered
   */
  public emitAlert(projectId: string, alert: any): void {
    if (!this.io) return;
    this.io.to(`project:${projectId}`).emit('alert:new', {
      projectId,
      alert,
      timestamp: new Date(),
    });
  }
}

export const socketService = SocketService.getInstance();
