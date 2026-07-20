// src/middleware/validateZod.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { docsRegistry } from '../utils/docsRegistry';
function recordValidationError(req: Request, err: ZodError, target: string) {
  docsRegistry.recordError({
    path: req.originalUrl,
    method: req.method,
    message: `Invalid ${target}: ${err.issues
      .map((i) => `${i.path.join('.') || '(root)'} → ${i.message}`)
      .join('; ')}`,
    status: 400,
    stack: err.stack,
  });
}

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      recordValidationError(req, result.error, 'body');
      // throw expressive error — your errorHandler should convert to HTTP 400
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = new Error('Invalid request body');
      err.status = 400;
      err.details = result.error.format();
      throw err;
    }
    // replace body with parsed data (useful for coercion)
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      recordValidationError(req, result.error, 'query');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = new Error('Invalid query parameters');
      err.status = 400;
      err.details = result.error.format();
      throw err;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.query = result.data as any;
    next();
  };
}

export function validateParams(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      recordValidationError(req, result.error, 'params');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = new Error('Invalid URL parameters');
      err.status = 400;
      err.details = result.error.format();
      throw err;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.params = result.data as any;
    next();
  };
}
