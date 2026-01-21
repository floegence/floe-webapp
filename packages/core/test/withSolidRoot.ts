import { createRoot } from 'solid-js';

export async function withSolidRoot<T>(fn: () => T | Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    createRoot((dispose) => {
      const run = async () => {
        try {
          const value = await fn();
          resolve(value);
        } catch (err) {
          reject(err);
        } finally {
          dispose();
        }
      };

      void run();
    });
  });
}
