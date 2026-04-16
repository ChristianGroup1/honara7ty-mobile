import { BOOTSTRAP_TIMEOUT_MS, withTimeout } from '../lib/withTimeout';

describe('useAppBootstrap helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    (console.warn as jest.Mock).mockRestore();
  });

  it('returns the original result when the promise resolves in time', async () => {
    const resultPromise = withTimeout(
      Promise.resolve('ready'),
      BOOTSTRAP_TIMEOUT_MS,
      'fallback',
      'bootstrap-step',
    );

    await expect(resultPromise).resolves.toBe('ready');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('returns the fallback when the promise takes too long', async () => {
    const neverResolvingPromise = new Promise<string>(() => {});

    const resultPromise = withTimeout(
      neverResolvingPromise,
      50,
      'fallback',
      'bootstrap-step',
    );

    jest.advanceTimersByTime(50);

    await expect(resultPromise).resolves.toBe('fallback');
    expect(console.warn).toHaveBeenCalledWith(
      'bootstrap-step timed out after 50ms',
    );
  });
});
