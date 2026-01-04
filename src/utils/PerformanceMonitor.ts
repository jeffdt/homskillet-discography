/**
 * Performance monitoring utilities for profiling app performance
 *
 * Usage:
 * - Add ?perf=true to URL to enable performance overlay
 * - Monitors: FPS, frame time, CPU usage, memory, re-render count
 */

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  avgFrameTime: number;
  minFrameTime: number;
  maxFrameTime: number;
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
  renderCount: number;
  timestamp: number;
}

interface PerformanceConfig {
  sampleSize: number;
  updateInterval: number;
  enableMemory: boolean;
  enableOverlay: boolean;
}

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private renderCount: number = 0;
  private config: PerformanceConfig;
  private rafId: number | null = null;
  private overlayElement: HTMLDivElement | null = null;
  private startTime: number = performance.now();
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      sampleSize: config.sampleSize ?? 60,
      updateInterval: config.updateInterval ?? 1000,
      enableMemory: config.enableMemory ?? true,
      enableOverlay: config.enableOverlay ?? true,
    };
  }

  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.rafId !== null) {
      return; // Already running
    }

    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;

    if (this.config.enableOverlay) {
      this.createOverlay();
    }

    this.measureFrame();
  }

  /**
   * Stop monitoring and clean up
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  /**
   * Track a React component render
   */
  trackRender(componentName?: string): void {
    this.renderCount++;
    if (componentName) {
      console.debug(`[Perf] Render: ${componentName} (#${this.renderCount})`);
    }
  }

  /**
   * Subscribe to performance metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const now = performance.now();
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;

    const minFrameTime = this.frameTimes.length > 0
      ? Math.min(...this.frameTimes)
      : 0;

    const maxFrameTime = this.frameTimes.length > 0
      ? Math.max(...this.frameTimes)
      : 0;

    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    const metrics: PerformanceMetrics = {
      fps,
      frameTime: this.frameTimes[this.frameTimes.length - 1] || 0,
      avgFrameTime,
      minFrameTime,
      maxFrameTime,
      renderCount: this.renderCount,
      timestamp: now - this.startTime,
    };

    // Add memory info if available and enabled
    if (this.config.enableMemory && (performance as any).memory) {
      const memory = (performance as any).memory;
      metrics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    return metrics;
  }

  /**
   * Measure frame time
   */
  private measureFrame = (): void => {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameCount++;

    // Store frame time
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.config.sampleSize) {
      this.frameTimes.shift();
    }

    // Update overlay every second
    if (this.frameCount % 60 === 0) {
      this.updateOverlay();

      // Notify subscribers
      const metrics = this.getMetrics();
      this.callbacks.forEach(callback => callback(metrics));
    }

    this.rafId = requestAnimationFrame(this.measureFrame);
  };

  /**
   * Create performance overlay UI
   */
  private createOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'perf-monitor-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 999999;
      pointer-events: none;
      min-width: 200px;
      line-height: 1.4;
      border: 1px solid #00ff00;
    `;

    document.body.appendChild(overlay);
    this.overlayElement = overlay;
  }

  /**
   * Update performance overlay with current metrics
   */
  private updateOverlay(): void {
    if (!this.overlayElement) return;

    const metrics = this.getMetrics();

    let html = `
      <div style="font-weight: bold; margin-bottom: 4px; color: #9bfe38;">⚡ PERFORMANCE</div>
      <div>FPS: ${metrics.fps.toFixed(1)}</div>
      <div>Frame: ${metrics.frameTime.toFixed(2)}ms</div>
      <div>Avg: ${metrics.avgFrameTime.toFixed(2)}ms</div>
      <div>Min: ${metrics.minFrameTime.toFixed(2)}ms</div>
      <div>Max: ${metrics.maxFrameTime.toFixed(2)}ms</div>
      <div>Renders: ${metrics.renderCount}</div>
    `;

    if (metrics.memory) {
      const usedMB = (metrics.memory.used / 1024 / 1024).toFixed(1);
      const totalMB = (metrics.memory.total / 1024 / 1024).toFixed(1);
      const limitMB = (metrics.memory.limit / 1024 / 1024).toFixed(0);
      html += `
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #333;">
          Memory: ${usedMB} / ${totalMB} MB
          <div style="font-size: 10px; color: #888;">(Limit: ${limitMB} MB)</div>
        </div>
      `;
    }

    // Performance warning
    if (metrics.fps < 30) {
      html += `<div style="color: #ff0000; margin-top: 4px;">⚠️ LOW FPS</div>`;
    } else if (metrics.fps < 50) {
      html += `<div style="color: #ffaa00; margin-top: 4px;">⚠️ REDUCED FPS</div>`;
    }

    this.overlayElement.innerHTML = html;
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const metrics = this.getMetrics();
    console.group('🔍 Performance Summary');
    console.log(`FPS: ${metrics.fps.toFixed(1)}`);
    console.log(`Frame Time (avg): ${metrics.avgFrameTime.toFixed(2)}ms`);
    console.log(`Frame Time (min): ${metrics.minFrameTime.toFixed(2)}ms`);
    console.log(`Frame Time (max): ${metrics.maxFrameTime.toFixed(2)}ms`);
    console.log(`Total Renders: ${metrics.renderCount}`);
    console.log(`Runtime: ${(metrics.timestamp / 1000).toFixed(1)}s`);

    if (metrics.memory) {
      console.log(`Memory Used: ${(metrics.memory.used / 1024 / 1024).toFixed(1)} MB`);
      console.log(`Memory Total: ${(metrics.memory.total / 1024 / 1024).toFixed(1)} MB`);
    }

    console.groupEnd();
  }
}

/**
 * Global performance monitor instance
 * Enable with ?perf=true URL parameter
 */
let globalMonitor: PerformanceMonitor | null = null;

export function initGlobalPerformanceMonitor(): PerformanceMonitor | null {
  // Check URL parameter
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get('perf') === 'true';

  if (!enabled) {
    return null;
  }

  if (globalMonitor) {
    return globalMonitor;
  }

  globalMonitor = new PerformanceMonitor({
    sampleSize: 60,
    updateInterval: 1000,
    enableMemory: true,
    enableOverlay: true,
  });

  globalMonitor.start();

  // Log summary on page unload
  window.addEventListener('beforeunload', () => {
    globalMonitor?.logSummary();
  });

  // Add keyboard shortcut (Ctrl+Shift+P) to toggle overlay
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      if (globalMonitor) {
        globalMonitor.stop();
        globalMonitor = null;
      } else {
        initGlobalPerformanceMonitor();
      }
    }
  });

  console.log('🔍 Performance Monitor enabled (?perf=true)');
  console.log('   Press Ctrl+Shift+P to toggle');

  return globalMonitor;
}

/**
 * Get the global performance monitor instance
 */
export function getGlobalPerformanceMonitor(): PerformanceMonitor | null {
  return globalMonitor;
}

/**
 * React hook for tracking component renders
 */
export function useRenderTracking(componentName: string): void {
  if (globalMonitor) {
    globalMonitor.trackRender(componentName);
  }
}
