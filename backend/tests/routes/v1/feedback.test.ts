import { describe, it, expect, beforeEach, type Mocked } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createFeedbackRouter } from '@src/routes/v1/feedback.js';
import { createMockFeedbackService } from '@test/mocks/feedbackService.mock.js';
import { errorHandler } from '@src/middleware/errorHandler.js';
import type { FeedbackService } from '@src/lib/feedback/types.js';

function buildApp(service: Mocked<FeedbackService>) {
  const app = express();
  app.use(express.json());
  app.use(createFeedbackRouter(service));
  app.use(errorHandler());
  return app;
}

describe('POST /feedback', () => {
  let service: Mocked<FeedbackService>;

  beforeEach(() => {
    service = createMockFeedbackService();
  });

  const validBody = {
    messageId: 'msg-123',
    rating: 'up',
    reasonCode: 'other',
  };

  it('returns 200 with { ok: true } on valid submission', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-1')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('calls service.submit with correct arguments', async () => {
    await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-1')
      .send(validBody);
    expect(service.submit).toHaveBeenCalledWith('key-1', expect.objectContaining(validBody));
  });

  it('returns 200 on duplicate idempotency key (idempotent)', async () => {
    const app = buildApp(service);
    await request(app).post('/feedback').set('Idempotency-Key', 'key-dup').send(validBody);
    const res = await request(app)
      .post('/feedback')
      .set('Idempotency-Key', 'key-dup')
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 400 when Idempotency-Key header is missing', async () => {
    const res = await request(buildApp(service)).post('/feedback').send(validBody);
    expect(res.status).toBe(400);
  });

  it('returns 400 when messageId is missing', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-2')
      .send({ rating: 'up', reasonCode: 'other' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when messageId is empty', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-3')
      .send({ messageId: '', rating: 'up', reasonCode: 'other' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is invalid', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-4')
      .send({ messageId: 'msg-1', rating: 'neutral', reasonCode: 'other' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when reasonCode is missing', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-rc')
      .send({ messageId: 'msg-1', rating: 'down' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when reasonCode is invalid', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-5')
      .send({ messageId: 'msg-1', rating: 'down', reasonCode: 'bad_code' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when freeText exceeds max length', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-6')
      .send({ ...validBody, freeText: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('accepts valid optional fields', async () => {
    const res = await request(buildApp(service))
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
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-8')
      .send({ ...validBody, freeText: 'x'.repeat(500) });
    expect(res.status).toBe(200);
  });

  it('returns 400 when category is not a known usage category', async () => {
    const res = await request(buildApp(service))
      .post('/feedback')
      .set('Idempotency-Key', 'key-bad-cat')
      .send({ ...validBody, category: 'not-a-real-category' });
    expect(res.status).toBe(400);
    expect(service.submit).not.toHaveBeenCalled();
  });
});
