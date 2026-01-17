// Performance monitoring utilities

interface PerformanceMetric {
  label: string;
  duration: number;
  timestamp: string;
  category: 'api' | 'render' | 'navigation';
}

class PerformanceMonitor {
  private timers: Map<string, { startTime: number; category: PerformanceMetric['category'] }> = new Map();
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 100; // Prevent memory leaks

  start(label: string, category: PerformanceMetric['category'] = 'api'): void {
    this.timers.set(label, { startTime: Date.now(), category });
  }

  end(label: string): void {
    const timer = this.timers.get(label);
    if (!timer) {
      if (__DEV__) {
        console.warn(`Performance: No timer found for ${label}`);
      }
      return;
    }

    const duration = Date.now() - timer.startTime;
    const metric: PerformanceMetric = {
      label,
      duration,
      timestamp: new Date().toISOString(),
      category: timer.category,
    };

    // Store metric
    this.metrics.push(metric);

    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) { // > 1 second
      if (__DEV__) {
        console.warn(`Slow operation detected: ${label} took ${duration}ms`);
      }
    } else if (__DEV__) {
      console.log(`Performance: ${label} took ${duration}ms`);
    }

    this.timers.delete(label);
  }

  // Helper function to measure async operations
  async measureAsync<T>(
    label: string,
    operation: () => Promise<T>,
    category: PerformanceMetric['category'] = 'api'
  ): Promise<T> {
    this.start(label, category);
    try {
      const result = await operation();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    return category 
      ? this.metrics.filter(m => m.category === category)
      : [...this.metrics];
  }

  getAverageTime(label: string): number {
    const labelMetrics = this.metrics.filter(m => m.label === label);
    if (labelMetrics.length === 0) return 0;
    
    const total = labelMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / labelMetrics.length;
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
