/**
 * Performance monitoring utility for Canvas Discussion Browser
 * Tracks API call patterns and loading times for optimization analysis
 */

class PerformanceMonitor {
  constructor() {
    this.startTime = null;
    this.apiCalls = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  startPageLoad(pageName) {
    this.startTime = performance.now();
    this.apiCalls = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log(`🚀 Performance Monitor: Starting ${pageName} page load`);
  }

  trackApiCall(endpoint, duration, cached = false) {
    const call = {
      endpoint: endpoint.replace(/\/api\/canvas-proxy/, 'Canvas API'),
      duration: Math.round(duration),
      cached,
      timestamp: performance.now()
    };
    
    this.apiCalls.push(call);
    
    if (cached) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    console.log(`📡 API Call: ${call.endpoint} - ${call.duration}ms ${cached ? '(cached)' : '(fresh)'}`);
  }

  trackCacheHit(cacheKey) {
    this.cacheHits++;
    console.log(`⚡ Cache Hit: ${cacheKey}`);
  }

  trackCacheMiss(cacheKey) {
    this.cacheMisses++;
    console.log(`❌ Cache Miss: ${cacheKey}`);
  }

  endPageLoad(pageName) {
    if (!this.startTime) return;
    
    const totalTime = Math.round(performance.now() - this.startTime);
    const apiTime = this.apiCalls.reduce((sum, call) => sum + call.duration, 0);
    const cacheEfficiency = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;
    
    console.log(`\n📊 Performance Summary for ${pageName}:`);
    console.log(`   Total Load Time: ${totalTime}ms`);
    console.log(`   API Call Time: ${apiTime}ms (${Math.round(apiTime/totalTime*100)}% of total)`);
    console.log(`   API Calls Made: ${this.apiCalls.length}`);
    console.log(`   Cache Efficiency: ${Math.round(cacheEfficiency)}% (${this.cacheHits} hits, ${this.cacheMisses} misses)`);
    
    if (this.apiCalls.length > 0) {
      console.log(`   API Call Breakdown:`);
      const callsByType = {};
      this.apiCalls.forEach(call => {
        const type = call.endpoint.includes('submissions') ? 'Submissions' :
                    call.endpoint.includes('discussions') ? 'Discussions' :
                    call.endpoint.includes('enrollments') ? 'Enrollments' :
                    call.endpoint;
        callsByType[type] = (callsByType[type] || 0) + 1;
      });
      
      Object.entries(callsByType).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count} calls`);
      });
    }
    
    // Performance recommendations
    if (totalTime > 5000) {
      console.warn('⚠️  Slow page load detected (>5s). Consider further optimizations.');
    }
    
    if (this.apiCalls.length > 10) {
      console.warn(`⚠️  High API call count (${this.apiCalls.length}). Consider batching or caching.`);
    }
    
    if (cacheEfficiency < 50) {
      console.warn(`⚠️  Low cache efficiency (${Math.round(cacheEfficiency)}%). Check cache strategy.`);
    }
    
    console.log(`✅ Performance analysis complete\n`);
  }

  // Wrapper for fetch to automatically track API calls
  async trackFetch(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;
      
      // Determine if this was likely from cache based on response time
      const cached = duration < 50; // Very fast responses are likely cached
      
      this.trackApiCall(url, duration, cached);
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackApiCall(url, duration, false);
      throw error;
    }
  }
}

// Global performance monitor instance
window.performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;