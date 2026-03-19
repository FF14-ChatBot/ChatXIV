---
name: add-frontend-feature
description: >-
  Scaffold a new feature module in the frontend with components, hooks, types,
  and tests. Use when creating a new feature, page, or module in the React
  frontend.
---

# Add Frontend Feature

## Steps

1. **Create feature directory:** `frontend/src/features/<name>/`

2. **Scaffold files:**

```
features/<name>/
├── <Name>Page.tsx         # main component
├── <Name>Page.module.css  # scoped styles
├── use<Name>.ts           # hook for state/data (if needed)
├── types.ts               # feature-specific types (if needed)
└── <Name>.test.tsx         # tests
```

3. **Component pattern:**

```tsx
import { chatxivApiRequest } from '../../clients/chatxivApi/instance';
import styles from './ChatPage.module.css';

export function ChatPage() {
  // Use hooks for state and data fetching
  return <main className={styles.container}>...</main>;
}
```

4. **Add route** in `frontend/src/App.tsx`:

```tsx
import { ChatPage } from './features/chat/ChatPage';

// Inside <Routes>:
<Route path="/chat" element={<ChatPage />} />
```

5. **Write tests** using the custom render:

```tsx
import { render, screen } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ChatPage } from './ChatPage';

it('renders', () => {
  render(
    <MemoryRouter>
      <ChatPage />
    </MemoryRouter>
  );
  expect(screen.getByRole('heading')).toBeInTheDocument();
});
```

6. **Run checks:** `npm run test && npm run lint` in `frontend/`.

## Key Patterns

- Functional components; hooks for logic
- API calls via `chatxivApiRequest` (never raw `fetch` in components)
- Custom `render` from `test-utils.tsx` for testing
