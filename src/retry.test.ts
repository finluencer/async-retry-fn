import { describe, it, expect, vi } from "vitest";
import { asyncRetry } from "./retry";
import { computeDelay } from "./delay";

describe("asyncRetry()", () => {
    it("resolves immediately on success", async () => {
        const fn = vi.fn().mockResolvedValue("ok");
        const result = await asyncRetry(fn);
        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on failure and eventually resolves", async () => {
        let calls = 0;
        const fn = vi.fn().mockImplementation(async () => {
            if (++calls < 3) throw new Error("fail");
            return "success";
        });

        const result = await asyncRetry(fn, { retries: 3, delay: 0, jitter: false });
        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it("throws after exhausting retries", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("always fails"));
        await expect(asyncRetry(fn, { retries: 2, delay: 0 })).rejects.toThrow(
            "always fails"
        );
        expect(fn).toHaveBeenCalledTimes(3); // 1 original + 2 retries
    });

    it("calls onRetry with error and attempt number", async () => {
        const onRetry = vi.fn();
        const fn = vi.fn().mockRejectedValue(new Error("err"));

        await expect(
            asyncRetry(fn, { retries: 2, delay: 0, onRetry })
        ).rejects.toThrow();

        expect(onRetry).toHaveBeenCalledTimes(2);
        expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it("calls onExhausted with final error and total attempts", async () => {
        const onExhausted = vi.fn();
        const fn = vi.fn().mockRejectedValue(new Error("boom"));

        await expect(
            asyncRetry(fn, { retries: 2, delay: 0, onExhausted })
        ).rejects.toThrow("boom");

        expect(onExhausted).toHaveBeenCalledTimes(1);
        expect(onExhausted).toHaveBeenCalledWith(expect.any(Error), 3);
    });

    it("onExhausted reports correct attempts when shouldRetry exits early", async () => {
        const onExhausted = vi.fn();
        const fn = vi.fn().mockRejectedValue(new Error("fatal"));

        await expect(
            asyncRetry(fn, { retries: 5, delay: 0, shouldRetry: () => false, onExhausted })
        ).rejects.toThrow("fatal");

        expect(onExhausted).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it("stops retrying when shouldRetry returns false", async () => {
        const fn = vi.fn().mockRejectedValue(new Error("fatal"));
        const shouldRetry = vi.fn().mockReturnValue(false);

        await expect(
            asyncRetry(fn, { retries: 5, delay: 0, shouldRetry })
        ).rejects.toThrow("fatal");

        expect(fn).toHaveBeenCalledTimes(1);
    });

    describe("maxDelay", () => {
        it("caps the computed delay", () => {
            const delay = computeDelay(5, 300, "exponential", false, 500);
            expect(delay).toBe(500);
        });

        it("does not cap when delay is within limit", () => {
            const delay = computeDelay(1, 300, "exponential", false, 500);
            expect(delay).toBe(300);
        });
    });

    describe("timeout", () => {
        it("rejects with timeout error if attempt exceeds timeout", async () => {
            const fn = vi.fn(() => new Promise<never>(() => {}));
            await expect(asyncRetry(fn, { retries: 0, timeout: 1 })).rejects.toThrow("timed out after 1ms");
        });

        it("does not timeout when fn resolves in time", async () => {
            const fn = vi.fn().mockResolvedValue("ok");
            const result = await asyncRetry(fn, { timeout: 1000 });
            expect(result).toBe("ok");
        });
    });

    describe("AbortSignal", () => {
        it("throws immediately if signal is already aborted", async () => {
            const controller = new AbortController();
            controller.abort();
            const fn = vi.fn().mockResolvedValue("ok");

            await expect(
                asyncRetry(fn, { signal: controller.signal })
            ).rejects.toThrow();

            expect(fn).not.toHaveBeenCalled();
        });

        it("does not leak abort listeners when sleep resolves normally", async () => {
            const controller = new AbortController();
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error("fail"))
                .mockResolvedValue("ok");

            const result = await asyncRetry(fn, {
                retries: 1,
                delay: 0,
                jitter: false,
                signal: controller.signal,
            });

            expect(result).toBe("ok");
            expect(controller.signal.aborted).toBe(false);
        });

        it("stops retrying when signal is aborted during sleep", async () => {
            vi.useFakeTimers();
            const fn = vi.fn().mockRejectedValue(new Error("fail"));
            const controller = new AbortController();

            const promise = asyncRetry(fn, {
                retries: 5,
                delay: 1000,
                jitter: false,
                signal: controller.signal,
            });

            await vi.advanceTimersByTimeAsync(500);
            controller.abort();

            await expect(promise).rejects.toThrow();
            expect(fn).toHaveBeenCalledTimes(1);
            vi.useRealTimers();
        });

        it("rejects if signal is aborted after fn resolves", async () => {
            const controller = new AbortController();
            const fn = vi.fn().mockImplementation(async () => {
                controller.abort();
                return "ok";
            });

            await expect(
                asyncRetry(fn, { signal: controller.signal })
            ).rejects.toThrow();
        });
    });
});
