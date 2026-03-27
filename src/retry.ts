import { RetryOptions } from "./types";
import { computeDelay, sleep, withTimeout } from "./delay";

export async function asyncRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        retries = 3,
        delay = 300,
        backoff = "exponential",
        jitter = true,
        maxDelay = Infinity,
        timeout,
        signal,
        onRetry,
        shouldRetry = () => true,
        onExhausted,
    } = options;

    let lastError: unknown;
    let totalAttempts = 0;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        if (signal?.aborted) {
            throw signal.reason ?? new DOMException("Aborted", "AbortError");
        }

        try {
            const result = await (timeout ? withTimeout(fn, timeout) : fn());
            if (signal?.aborted) {
                throw signal.reason ?? new DOMException("Aborted", "AbortError");
            }
            return result;
        } catch (err) {
            lastError = err;
            totalAttempts = attempt;

            const isLastAttempt = attempt === retries + 1;
            if (isLastAttempt || !shouldRetry(err)) break;

            onRetry?.(err, attempt);

            const waitTime = computeDelay(attempt, delay, backoff, jitter, maxDelay);
            await sleep(waitTime, signal);
        }
    }

    onExhausted?.(lastError, totalAttempts);
    throw lastError;
}
