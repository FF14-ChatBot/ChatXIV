import { describe, it, expect } from 'vitest';
import express, { type RequestHandler } from 'express';
import request from 'supertest';
import {
  chainRequestHandlers,
  getOpenApiSpecPath,
  registerOpenApiDocs,
} from '@src/routes/openApiDocs.js';
import { readFileSync } from 'node:fs';

function buildApp(): express.Express {
  const app = express();
  registerOpenApiDocs(app);
  return app;
}

describe('OpenAPI docs', () => {
  it('getOpenApiSpecPath points at a readable openapi.yaml', () => {
    const p = getOpenApiSpecPath();
    const raw = readFileSync(p, 'utf8');
    expect(raw).toContain('openapi: 3.0.3');
  });

  it('GET /v1/openapi.yaml returns YAML', async () => {
    const res = await request(buildApp()).get('/v1/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/yaml/);
    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('/v1/flags');
    expect(res.text).toContain('- url: /');
  });

  it('GET /docs/ serves Swagger UI', async () => {
    const res = await request(buildApp()).get('/docs/');
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
    app.use((err: unknown, _req, res, next) => {
      void next;
      const message = err instanceof Error ? err.message : 'unknown';
      res.status(500).send(message);
    });
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.text).toBe('chain-fail');
  });
});
