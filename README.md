# async-retry-fn

Wrap any async function with retry logic, exponential backoff, and jitter.

## Install
```bash
npm install async-retry-fn
```

## Usage
```ts
import { asyncRetry } from "async-retry-fn";

const data = await asyncRetry(() => fetch("/api/data").then(r => r.json()), {
  retries: 3,
  delay: 500,
  backoff: "exponential",
  jitter: true,
  onRetry: (err, attempt) => console.warn(`Attempt ${attempt} failed:`, err),
  shouldRetry: (err) => err instanceof NetworkError,
});
```

## When to use `onRetry` and `shouldRetry`

**`onRetry`** — use it to log or monitor failures as they happen. Good for debugging or alerting.
```ts
onRetry: (err, attempt) => console.warn(`Attempt ${attempt} failed:`, err)
```

**`shouldRetry`** — use it to stop retrying on errors that won't fix themselves (e.g. 404, bad input). Without it, every error is retried.
```ts
shouldRetry: (err) => err.status !== 404
```

**`onExhausted`** — use it to handle the final failure after all attempts are done. Receives the last error and the total number of attempts made.
```ts
onExhausted: (err, totalAttempts) => {
  console.error(`Failed after ${totalAttempts} attempts:`, err)
}
```

## How backoff works

- **`fixed`** — waits the same amount of time between every retry (e.g. 300ms, 300ms, 300ms)
- **`exponential`** — doubles the wait each time (e.g. 300ms, 600ms, 1200ms) so a struggling server gets more breathing room
- **`jitter`** — adds a small random variation so multiple callers don't all retry at the exact same moment

## Options

| Option        | Type                          | Default         | Description                              |
|---------------|-------------------------------|-----------------|------------------------------------------|
| `retries`     | `number`                      | `3`             | Max retry attempts                       |
| `delay`       | `number`                      | `300`           | Base delay in ms                         |
| `backoff`     | `"fixed" \| "exponential"`   | `"exponential"` | Delay growth strategy                    |
| `jitter`      | `boolean`                     | `true`          | Randomize delay to avoid thundering herd |
| `onRetry`     | `(err, attempt) => void`           | —            | Called before each retry                        |
| `shouldRetry` | `(err) => boolean`                 | `() => true` | Return false to abort retrying                  |
| `onExhausted` | `(err, totalAttempts) => void`     | —            | Called once after all attempts have been made   |



## License

MIT — see [LICENSE](LICENSE)

---

Made by **Finluencer**


