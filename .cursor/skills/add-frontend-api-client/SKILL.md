---
name: add-frontend-api-client
description: >-
  Add a new HTTP API client in the frontend for a new backend service. Use when
  integrating a new backend API, external service, or HTTP endpoint. See
  frontend/src/README.md for the full two-layer pattern.
---

# Add Frontend API Client

Follow the two-layer client pattern documented in `frontend/src/README.md`.

## Steps

1. **Create client directory:** `frontend/src/clients/<name>Api/`

2. **Scaffold files:**

```
clients/<name>Api/
├── client.ts            # request function and factory
├── config.ts            # base URL and config
├── types.ts             # config and request option types
├── instance.ts          # singleton set/get
├── errors/
│   └── <Name>ApiError.ts
```

3. **Config** (`config.ts`):

```typescript
export function getExampleApiBaseUrl(): string {
  return import.meta.env.VITE_EXAMPLE_BACKEND_URL || '';
}
```

4. **Client** (`client.ts`) — use the core fetch wrapper:

```typescript
import { request as coreRequest } from '../core/request';

export function createExampleApiClient(): IExampleApiClient {
  return {
    request<T>(method: string, path: string, options?) {
      // Build headers, call coreRequest, handle errors
    },
  };
}
```

5. **Wire in `main.tsx`** with direct imports:

```typescript
import { setExampleApiClient } from './clients/exampleApi/instance';
import { createExampleApiClient } from './clients/exampleApi/client';
setExampleApiClient(createExampleApiClient());
```

## Reference

See `frontend/src/README.md` for the complete two-layer architecture, error handling, and detailed examples.
