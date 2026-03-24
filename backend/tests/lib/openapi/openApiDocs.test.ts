import { describe, it, expect } from 'vitest';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import request from 'supertest';
import {
  chainRequestHandlers,
  getOpenApiAdminSpecPath,
  getOpenApiPublicSpecPath,
  loadAdminOpenApiDocument,
  registerOpenApiDocs,
} from '@src/lib/openapi/openApiDocs.js';
import { readFileSync } from 'node:fs';
import type { AdminAuthMiddleware } from '@src/middleware/adminAuth.js';
import { AppError } from '@src/lib/errors/AppError.js';
import { errorHandler } from '@src/middleware/errorHandler.js';

function noopAdminAuth(): AdminAuthMiddleware {
  return {
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next();
    },
  } as AdminAuthMiddleware;
}

function rejectingAdminAuth(): AdminAuthMiddleware {
  return {
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(AppError.unauthorized('Valid admin credentials required', 'test-req-id'));
    },
  } as AdminAuthMiddleware;
}

function buildApp(adminAuth: AdminAuthMiddleware): express.Express {
  const app = express();
  registerOpenApiDocs(app, adminAuth);
  app.use(errorHandler());
  return app;
}

describe('OpenAPI docs', () => {
  it('getOpenApiPublicSpecPath points at readable openapi.public.yaml', () => {
    const p = getOpenApiPublicSpecPath();
    const raw = readFileSync(p, 'utf8');
    expect(raw).toContain('openapi: 3.0.3');
    expect(raw).toContain('ChatXIV API (public)');
  });

  it('getOpenApiAdminSpecPath points at readable openapi.admin.yaml', () => {
    const p = getOpenApiAdminSpecPath();
    const raw = readFileSync(p, 'utf8');
    expect(raw).toContain('openapi: 3.0.3');
    expect(raw).toContain('ChatXIV API (full)');
    expect(raw).toContain('/v1/admin/flags');
  });

  it('loadAdminOpenApiDocument returns a parsed OpenAPI object', () => {
    const doc = loadAdminOpenApiDocument();
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info).toMatchObject({ title: 'ChatXIV API (full)' });
  });

  it('GET /v1/openapi.yaml returns public YAML without admin paths', async () => {
    const res = await request(buildApp(noopAdminAuth())).get('/v1/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('/v1/flags');
    expect(res.text).toContain('ChatXIV API (public)');
    expect(res.text).not.toContain('/v1/admin/flags');
  });

  it('GET /v1/docs/ serves Swagger UI', async () => {
    const res = await request(buildApp(noopAdminAuth())).get('/v1/docs/');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });

  it('GET /v1/admin/docs/ returns 401 when admin auth rejects', async () => {
    const res = await request(buildApp(rejectingAdminAuth())).get('/v1/admin/docs/');
    expect(res.status).toBe(401);
  });

  it('GET /v1/admin/docs/ serves Swagger UI when admin auth passes', async () => {
    const res = await request(buildApp(noopAdminAuth())).get('/v1/admin/docs/');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});

describe('chainRequestHandlers', () => {
  it('continues to the next middleware when the chain is empty', async () => {
    const app = express();
    app.get('/x', chainRequestHandlers([]), (_req, res) => {
      res.status(200).send('after');
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(200);
    expect(res.text).toBe('after');
  });

  it('forwards next(err) from a handler', async () => {
    const app = express();
    const fail: RequestHandler = (_req, _res, next) => {
      next(new Error('chain-fail'));
    };
    app.get('/x', chainRequestHandlers([fail]));
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      void next;
      const message = err instanceof Error ? err.message : 'unknown';
      res.status(500).send(message);
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.text).toBe('chain-fail');
  });
});
