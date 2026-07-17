import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { config } from './config';
import { logger } from './utils/logger';
import { connectDB } from './db/connection';
import { errorHandler } from './utils/errors';
import { apiRoutes } from './routes/api.routes';
import { socketService } from './services/socket.service';
import { queueService } from './jobs/queue.service';
import { monitoringService } from './modules/monitoring/monitoring.service';
import { setupSwagger } from './utils/swagger';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  logger.info('==================================================');
  logger.info('              NodePilot AI Backend                ');
  logger.info('==================================================');

  // 1. Basic Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Turn off CSP for dev Swagger iframe compatibility
  }));
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // 2. Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP. Please try again later.',
  });
  app.use('/api', limiter);

  // 3. Connect DB and Services
  await connectDB();
  await queueService.init();

  // 4. Initialize Sockets
  socketService.init(server);

  // 5. Start Monitoring background daemon
  await monitoringService.startMonitoringDaemon();

  // 6. Mount REST API master router
  app.use('/api', apiRoutes);

  // 7. Configure Swagger interactive playground
  setupSwagger(app as any);

  // 8. Integrate Vite middleware in development or serve static folder in production
  if (config.nodeEnv !== 'production') {
    logger.info('[Vite] Launching dynamic asset middleware server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    logger.info('[Vite] Mounting production static bundle files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 9. Centralized Error Handling Middleware
  app.use(errorHandler as any);

  // 10. Start Listening
  const port = config.port || 3000;
  server.listen(port, '0.0.0.0', () => {
    logger.info(`[Server] NodePilot AI started on http://localhost:${port}`);
    logger.info(`[Server] Interactive REST endpoints documentation: http://localhost:${port}/docs`);
  });
}

bootstrap().catch((err) => {
  logger.error(`[Server] Bootstrap panic: ${err.message}`);
  process.exit(1);
});
