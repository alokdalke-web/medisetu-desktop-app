import Redis from 'ioredis';
import { envConfig } from '../utils/envConfig';
import logger from '../utils/logger';

// Create a Redis client instance
const redisClient = new Redis({
  host: envConfig.REDIS_HOST,
  port: envConfig.REDIS_PORT,
  password: envConfig.REDIS_PASSWORD,
  // Retry strategy: reconnect after 2 seconds if connection is lost
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export default redisClient;
