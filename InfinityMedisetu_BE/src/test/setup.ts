// src/test/setup.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Mock database connection if needed
jest.mock('../configurations/dbConnection', () => ({
  database: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    transaction: jest.fn((cb) =>
      cb({
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      })
    ),
    execute: jest.fn(),
    returning: jest.fn().mockResolvedValue([]),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  },
}));

// Mock redis
jest.mock('../configurations/redisConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    scan: jest.fn().mockResolvedValue(['0', []]),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  },
}));
