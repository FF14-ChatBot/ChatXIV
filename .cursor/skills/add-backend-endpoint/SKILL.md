---
name: add-backend-endpoint
description: >-
  Step-by-step procedure for adding a new Express API route with validation,
  error handling, and tests. Use when creating new API endpoints, routes, or
  handlers in the backend.
---

# Add Backend Endpoint

## Steps

1. **Define CDM types** in the appropriate `packages/cdm/src/*.ts` module (e.g. `flags.ts`, `appError.ts`, `usage.ts`, `metrics.ts`) and add a re-export from `index.ts` if you add a new file. Rebuild with `npm run build:cdm`.

2. **Create a router file** (e.g. `backend/src/routes/chat.ts`):

```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { wrapAsync } from '../middleware/asyncHandler.js';
import { AppError } from '../lib/errors/AppError.js';

const router = Router();

router.post(
  '/v1/chat',
  validate([body('query').isString().notEmpty()]),
  wrapAsync(async (req, res) => {
    // AppError for HTTP errors: throw AppError.validation('Missing query');
    res.json({ answer: '...' });
  })
);

export { router as chatRouter };
```

3. **Wire into app.ts:** Import and `app.use(chatRouter)` before the error handler.

4. **Write tests** with `supertest`:

```typescript
import request from 'supertest';
import { app } from '../app.js';

describe('POST /v1/chat', () => {
  it('returns 400 for missing query', async () => {
    const res = await request(app).post('/v1/chat').send({});
    expect(res.status).toBe(400);
  });
});
```

5. **Run checks:** `npm run test && npm run lint` in `backend/`.

## Key Patterns

- `validate([...chains])` wraps express-validator
- `wrapAsync(fn)` forwards rejected promises to the error handler
- `AppError.validation()`, `.internal()`, etc. for HTTP-layer errors
- ESM imports with `.js` extension
