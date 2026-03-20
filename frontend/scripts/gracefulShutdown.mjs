const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Registers signal handlers that attempt a clean close before forcing exit.
 * The returned function can be used to trigger the same path manually.
 */
export const registerGracefulShutdown = ({
  close,
  name,
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
}) => {
  let shuttingDown = false;

  const handleSignal = (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info(`[${name}] Received ${signal}, shutting down...`);

    const forceExitTimer = setTimeout(() => {
      console.error(`[${name}] Forced shutdown after ${timeoutMs}ms timeout`);
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    Promise.resolve(close())
      .then(() => {
        clearTimeout(forceExitTimer);
        console.info(`[${name}] Shutdown complete`);
        process.exit(0);
      })
      .catch((error) => {
        clearTimeout(forceExitTimer);
        console.error(`[${name}] Failed to shut down cleanly`, error);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));

  return handleSignal;
};
