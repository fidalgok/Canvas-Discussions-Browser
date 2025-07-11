# Performance Debugging Guide

## The Issue Found: Markdown Export Function

**Problem:** The initial 147 API calls were caused by the **markdown export function** running `fetchCanvasDiscussions()` directly instead of using cached data.

**Fixed in:** 
- `pages/feedback.js` - Lines 172-189
- `pages/index.js` - Lines 243-260

## Testing Steps

### 1. **Clear Cache First** (Important!)
```javascript
// In browser console, run:
localStorage.clear();
```

### 2. **Test Optimized Load**
1. Open **Network tab** (F12 → Network)
2. Navigate to `/feedback` page  
3. Count API calls to `/api/canvas-proxy`

**Expected Results:**
- **~5-8 API calls** (not 147!)
- Calls should be:
  - 1x Discussion topics
  - 1x Discussion entries (per topic batch)
  - 1x Course enrollments  
  - 1x Assignment submissions (per assignment batch)

### 3. **Console Debug Output**
Look for these log messages:
```
→ Processing Canvas data for dashboards (optimized)
→ Batch fetching submissions for 3 assignments: [123, 456, 789]
✓ Fetched 25 submissions for assignment 123
✓ Fetched 30 submissions for assignment 456
✓ Processed Canvas data for dashboards { processingTime: "2500ms" }
```

### 4. **Test Cache Behavior**
1. Load feedback page (should be slow first time)
2. Navigate to homepage (should be fast)  
3. Back to feedback page (should be instant)

## Expected Performance

### **Before Optimization:**
- 147 API calls (2 per student × 75 students)
- 15-30 second load times
- Individual submission checks

### **After Optimization:**
- ~5-8 API calls total
- 3-8 second load times  
- Batch submission fetching
- Instant navigation between pages

## If Still Slow

### **Check Network Tab for:**
1. **Too many `/api/canvas-proxy` calls** - Should be <10
2. **Individual submission calls** - Should be batch calls instead
3. **Duplicate discussion fetching** - Should only happen once

### **Check Console for:**
1. **Error messages** - Red errors in console
2. **Cache hit/miss patterns** - Should see cache hits on navigation
3. **Processing times** - Should show timing info

### **Common Issues:**
1. **Cache not working** - Clear localStorage and try again
2. **Old code still running** - Hard refresh (Ctrl+F5)  
3. **Multiple tabs open** - Close other Canvas Discussion tabs

## Quick Network Analysis

**Good Pattern (Optimized):**
```
/api/canvas-proxy (discussions) - 2000ms
/api/canvas-proxy (enrollments) - 300ms
/api/canvas-proxy (assignments/123/submissions) - 800ms
/api/canvas-proxy (assignments/456/submissions) - 600ms
Total: 4 calls, ~3.7 seconds
```

**Bad Pattern (Not Optimized):**
```
/api/canvas-proxy (discussions) - 2000ms
/api/canvas-proxy (submissions/user1) - 500ms
/api/canvas-proxy (submissions/user2) - 500ms
/api/canvas-proxy (submissions/user3) - 500ms
... (×75 students)
Total: 76+ calls, 15+ seconds
```

## Next Steps if Issues Persist

1. **Share Network tab screenshot** - Shows actual API call pattern
2. **Share Console output** - Shows timing and cache behavior  
3. **Test with smaller course** - Isolate if it's dataset size issue
4. **Check Canvas API performance** - Individual API calls might just be slow

The fix should reduce API calls by 90%+ and improve load times significantly.