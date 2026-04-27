export const BOOTSTRAP_TIMEOUT_MS = 4000;

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>(resolve => {
        timeoutId = setTimeout(() => {
          console.warn(`${label} timed out after ${timeoutMs}ms`);
          resolve(fallbackValue);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
