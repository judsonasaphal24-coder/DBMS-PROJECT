const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriablePgError = (error: unknown) => {
  const err = error as { code?: string; meta?: { code?: string } };
  const code = err.code || err.meta?.code;
  return code === "P2034" || code === "40P01" || code === "40001";
};

export const withDeadlockRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
): Promise<T> => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;

      if (!isRetriablePgError(error) || attempt >= maxAttempts) {
        throw error;
      }

      const backoffMs = 40 * 2 ** attempt;
      await wait(backoffMs);
    }
  }

  throw lastError;
};
