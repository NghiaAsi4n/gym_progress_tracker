interface ClosableServer {
  close: (callback: (error?: Error) => void) => unknown;
}

interface GracefulShutdownOptions {
  disconnect: () => Promise<void>;
  log: (message: string) => void;
  onError: () => void;
  server: ClosableServer;
}

async function closeServer(server: ClosableServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export function createShutdownHandler(options: GracefulShutdownOptions) {
  let isShuttingDown = false;

  return async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    options.log(`Received ${signal}; shutting down`);

    try {
      await closeServer(options.server);
      await options.disconnect();
    } catch {
      options.onError();
    }
  };
}
