/**
 * API Call Counter - Debug utility to track Canvas API usage
 * Helps identify performance bottlenecks and verify optimizations
 */

class ApiCallCounter {
  constructor() {
    this.reset();
  }

  reset() {
    this.calls = [];
    this.startTime = performance.now();
    console.log('🔄 API Call Counter: Reset');
  }

  track(endpoint, method = 'GET', duration = null) {
    const call = {
      endpoint: endpoint.replace('/api/canvas-proxy', 'Canvas API'),
      method,
      duration: duration ? Math.round(duration) : null,
      timestamp: Math.round(performance.now() - this.startTime)
    };
    
    this.calls.push(call);
    console.log(`📡 API Call #${this.calls.length}: ${call.endpoint} (${call.method}) - ${call.duration}ms at +${call.timestamp}ms`);
  }

  getSummary() {
    const totalCalls = this.calls.length;
    const totalTime = Math.round(performance.now() - this.startTime);
    const apiTime = this.calls.reduce((sum, call) => sum + (call.duration || 0), 0);
    
    const callsByEndpoint = {};
    this.calls.forEach(call => {
      const endpoint = call.endpoint.split('?')[0]; // Remove query params
      callsByEndpoint[endpoint] = (callsByEndpoint[endpoint] || 0) + 1;
    });

    return {
      totalCalls,
      totalTime,
      apiTime,
      callsByEndpoint,
      efficiency: totalCalls > 0 ? Math.round(apiTime / totalCalls) : 0
    };
  }

  printSummary() {
    const summary = this.getSummary();
    
    console.log('\n📊 API Call Summary:');
    console.log(`   Total API Calls: ${summary.totalCalls}`);
    console.log(`   Total Time: ${summary.totalTime}ms`);
    console.log(`   API Time: ${summary.apiTime}ms`);
    console.log(`   Avg per call: ${summary.efficiency}ms`);
    
    console.log('\n📋 Calls by endpoint:');
    Object.entries(summary.callsByEndpoint).forEach(([endpoint, count]) => {
      console.log(`   ${count}x ${endpoint}`);
    });
    
    // Performance warnings
    if (summary.totalCalls > 20) {
      console.warn(`⚠️  High API call count (${summary.totalCalls}). Expected <10 for optimized version.`);
    }
    
    if (summary.totalCalls > 75) {
      console.error(`🚨 Very high API call count (${summary.totalCalls}). Optimization failed!`);
    }
    
    console.log('');
  }
}

// Global instance
window.apiCallCounter = new ApiCallCounter();

export default ApiCallCounter;