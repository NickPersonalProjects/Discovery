import "server-only";

export interface PoliteFetcherOptions {
  userAgent: string;
  minDelayMs: number;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PoliteFetcher {
  private lastRequestAt = 0;
  private readonly options: PoliteFetcherOptions;

  constructor(options: PoliteFetcherOptions) {
    this.options = options;
  }

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.options.minDelayMs) {
      await wait(this.options.minDelayMs - elapsed);
    }
  }

  async fetchText(url: string): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        await this.throttle();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
        const response = await fetch(url, {
          headers: {
            "User-Agent": this.options.userAgent,
            Accept: "text/html,application/xhtml+xml",
          },
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timer);

        this.lastRequestAt = Date.now();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.text();
      } catch (error) {
        lastError = error;
        if (attempt < this.options.maxRetries) {
          await wait(this.options.retryBackoffMs * (attempt + 1));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to fetch Eatwild page.");
  }
}

export async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  maxConcurrency: number,
  iteratee: (value: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const output: TOutput[] = new Array(values.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, maxConcurrency) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) {
        break;
      }
      output[index] = await iteratee(values[index], index);
    }
  });

  await Promise.all(workers);
  return output;
}
