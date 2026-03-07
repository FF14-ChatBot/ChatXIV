import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  sessionId?: string;
  /** Present when debug is on; ties debugCapture buffer to this request. */
  runId?: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(context: RequestContext, fn: () => T): T {
    return asyncLocalStorage.run(context, fn);
  },

  get(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  },

  getRunId(): number | undefined {
    return asyncLocalStorage.getStore()?.runId;
  },
};
