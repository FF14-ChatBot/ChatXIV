import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { SqliteDatabase } from '@src/lib/persistence/sqlite/types.js';
import { openSqliteDatabase } from '@src/lib/persistence/sqlite/openDb.js';
import { runMigrations } from '@src/lib/persistence/sqlite/runMigrations.js';
import { createFeedbackRouter } from '@src/routes/v1/feedback.js';
import { errorHandler } from '@src/middleware/errorHandler.js';

function buildApp(db: SqliteDatabase) {
  const app = express();
  app.use(express.json());
  app.use(createFeedbackRouter(db));
  app.use(errorHandler());
  return app;
}

describe('POST /feedback', () => {
  let db: SqliteDatabase;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    runMigrations(db);
  });

  const validBody = {
    messageId: 'msg-123',
    rating: 'up',
  };

  it('returns 200 with { ok: true } on valid submission', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-1')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 200 on duplicate idempotency key (idempotent)', async () => {
    const app = buildApp(db);
    await request(app).post('/feedback').set('Idempotency-Key', 'key-dup').send(validBody);
    const res = await request(app)
      .post('/feedback')
      .set('Idempotency-Key', 'key-dup')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('does not insert a second row for a duplicate key', async () => {
    const app = buildApp(db);
    await request(app).post('/feedback').set('Idempotency-Key', 'key-dup').send(validBody);
    await request(app).post('/feedback').set('Idempotency-Key', 'key-dup').send(validBody);
    const count = (db.prepare('SELECT COUNT(*) AS c FROM feedback_submissions').get() as { c: number }).c;
    expect(count).toBe(1);
  });

  it('returns 400 when Idempotency-Key header is missing', async () => {
    const res = await request(buildApp(db)).post('/feedback').send(validBody);
    expect(res.status).toBe(400);
  });

  it('returns 400 when messageId is missing', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-2')
      .send({ rating: 'up' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when messageId is empty', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-3')
      .send({ messageId: '', rating: 'up' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is invalid', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-4')
      .send({ messageId: 'msg-1', rating: 'neutral' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when reasonCode is invalid', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-5')
      .send({ messageId: 'msg-1', rating: 'down', reasonCode: 'bad_code' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when freeText exceeds max length', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-6')
      .send({ messageId: 'msg-1', rating: 'down', freeText: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('accepts valid optional fields', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-7')
      .send({
        messageId: 'msg-1',
        rating: 'down',
        reasonCode: 'outdated',
        freeText: 'Needs update',
        category: 'RAIDING',
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('accepts freeText at exactly max length', async () => {
    const res = await request(buildApp(db))
      .post('/feedback')
      .set('Idempotency-Key', 'key-8')
      .send({ messageId: 'msg-1', rating: 'up', freeText: 'x'.repeat(500) });
    expect(res.status).toBe(200);
  });
});
