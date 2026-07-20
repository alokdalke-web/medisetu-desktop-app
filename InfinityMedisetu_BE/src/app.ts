// src/app.ts
import compression from 'compression';
import cors from 'cors';
import express, { Request, Response } from 'express';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import corsOptions from './configurations/corsConfig';
import { baseApiTemplate } from './htmltamplates/api';
import { KafkaManager } from './kafka/kafkaManager';
import { registerNotificationHandlers } from './kafka/notification.consumer';
import {
  asyncHandler,
  errorHandler,
  notFoundHandler,
} from './middlewear/errorHandler';
import { standardRateLimit } from './middlewear/rateLimit.middleware';
import { requestLogger } from './middlewear/requestLogger';
import { SocketManager } from './socket/socketManager';
import { envConfig } from './utils/envConfig';
import { loadRoutes } from './utils/loadRoutes';
import { apiPlayground } from './utils/playground';
import { generateOpenApiSpec } from './utils/swagger';
import logger from './utils/logger';
import path from 'path';

const app = express();
const server = http.createServer(app);
const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
  .split(',')
  .map((b) => b.trim());
const kafkaClientId = process.env.KAFKA_CLIENT_ID || 'my-app';
const kafkaGroupId = process.env.KAFKA_GROUP_ID || 'my-group';

// instantiate managers
export const kafkaManager = new KafkaManager(
  brokers,
  kafkaClientId,
  kafkaGroupId
);

app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/api', express.static(path.join(process.cwd(), 'public')));

export const socketManager = new SocketManager(server, kafkaManager, {
  kafkaTopicPrefix: 'socket.events',
});

async function serverStarter() {
  // create SocketManager (attaches to HTTP server)

  app.use(cors(corsOptions));
  app.use(compression());
  app.use('/api/v1/prescription/scan/upload', express.json({ limit: '12mb' }));
  app.use('/api/v1/prescription/scan', express.json({ limit: '12mb' }));
  app.use('/api/v1/prescription/auto-align', express.json({ limit: '12mb' }));
  // Capture the raw request body so webhook HMAC signatures (e.g. Razorpay)
  // can be verified against the exact bytes the provider signed. The global
  // JSON parser otherwise consumes the stream, breaking signature checks.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  // Global rate limiting for all API routes (100 req/min per user or IP)
  app.use('/api', standardRateLimit);

  const forwardTopic = 'socket.events.chat.message';
  await socketManager.bindKafkaTopicToSockets(forwardTopic);

  // Another example: subscribe to server-side control topic to broadcast to all
  await socketManager.bindKafkaTopicToSockets('socket.events.broadcast');

  await socketManager.bindKafkaTopicToSockets(
    'socket.events.appointment.prescription.pdf_ready'
  );

  // Skip Kafka startup if brokers are not reachable or if we want to run without it
  try {
    await kafkaManager.start(); // ensure producer/consumer connected
    await registerNotificationHandlers(kafkaManager, socketManager);
  } catch (err) {
    logger.error(
      '[App] Failed to start Kafka. Application will continue without Kafka features.',
      err
    );
  }

  await loadRoutes(app);

  app.get(
    '/',
    asyncHandler((_req: Request, res: Response) => {
      const baseUrl = `http://localhost:${envConfig.PORT}`;
      res.status(200).type('html').send(baseApiTemplate(baseUrl));
    })
  );
  // Add this to your app.ts file after app.use(requestLogger) and before loadRoutes(app)

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/docs/json', apiPlayground);

  const openApiSpec = generateOpenApiSpec();
  app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  const shutdown = async () => {
    logger.info('Shutting down...');
    await socketManager.close();
    await kafkaManager.disconnect();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

export default serverStarter;
