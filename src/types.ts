export interface RetryOptions {
    retries?: number;          // max attempts (default: 3)
    delay?: number;            // base delay in ms (default: 300)
    backoff?: "fixed" | "exponential"; // delay strategy (default: "exponential")
    jitter?: boolean;          // add randomness to delay (default: true)
    maxDelay?: number;         // cap on delay in ms (default: Infinity)
    timeout?: number;          // per-attempt timeout in ms (default: none)
    signal?: AbortSignal;      // cancel the retry loop externally
    onRetry?: (error: unknown, attempt: number) => void;
    shouldRetry?: (error: unknown) => boolean;
    onExhausted?: (error: unknown, totalAttempts: number) => void;
}