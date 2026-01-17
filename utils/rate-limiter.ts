// Rate limiting utilities

class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  async checkLimit(userId: string, action: string): Promise<{ allowed: boolean; resetTime?: number }> {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      // Reset or create new attempt record
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true };
    }

    if (attempt.count >= this.maxAttempts) {
      return { allowed: false, resetTime: attempt.resetTime };
    }

    // Increment attempt count
    attempt.count++;
    return { allowed: true };
  }
}

export const serviceRequestLimiter = new RateLimiter(5, 60 * 1000); // 5 requests per minute