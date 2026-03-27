export function computeDelay(
    attempt: number,
    baseDelay: number,
    backoff: "fixed" | "exponential",
    jitter: boolean,
    maxDelay: number = Infinity
): number {
    const base =
        backoff === "exponential"
            ? baseDelay * Math.pow(2, attempt - 1)
            : baseDelay;

    const delay = jitter ? base * (0.5 + Math.random() * 0.5) : base;
    return Math.min(delay, maxDelay);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            clearTimeout(timer);
            reject(signal!.reason ?? new DOMException("Aborted", "AbortError"));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

export function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`asyncRetry: attempt timed out after ${ms}ms`)),
            ms
        );
        fn().then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}
