// In-memory rate limiter — protects the $5 API budget.
// Limits: 2 requests per minute, 20 requests per day (rolling windows).

const PER_MINUTE = 2;
const PER_DAY = 20;

const timestamps: number[] = [];

export function checkRateLimit(): { allowed: boolean; message: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const oneDayAgo = now - 86_400_000;

  // Drop timestamps outside the day window
  while (timestamps.length > 0 && timestamps[0] < oneDayAgo) {
    timestamps.shift();
  }

  const lastMinute = timestamps.filter((t) => t > oneMinuteAgo).length;
  const lastDay = timestamps.length;

  if (lastDay >= PER_DAY) {
    return { allowed: false, message: `Daily limit reached (${PER_DAY} requests). Resets in 24 hours.` };
  }
  if (lastMinute >= PER_MINUTE) {
    const oldestInWindow = timestamps.find((t) => t > oneMinuteAgo)!;
    const waitSec = Math.ceil((oldestInWindow + 60_000 - now) / 1000);
    return { allowed: false, message: `Rate limit: max ${PER_MINUTE} requests/min. Wait ${waitSec}s.` };
  }

  timestamps.push(now);
  return { allowed: true, message: "" };
}
