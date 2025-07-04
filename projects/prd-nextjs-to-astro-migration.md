# PRD: Next.js to Astro Migration - Canvas Discussion Browser

## **Project Overview**

**Project Name**: Canvas Discussion Browser - Next.js to Astro Migration  
**Timeline**: 3-4 days  
**Strategy**: Hybrid Approach (Astro + React Islands)  
**Priority**: Medium  

## **Background & Motivation**

The Canvas Discussion Browser is currently built with Next.js but faces ongoing CSS framework integration challenges (DaisyUI, Tailwind, UnoCSS). Astro offers better CSS framework compatibility and performance benefits for our primarily static content with selective interactivity.

**Key Drivers**:
- Better CSS framework integration (resolve DaisyUI issues)
- Performance improvements through Astro's zero-JS default
- Standardize on Astro stack (user has another Astro project)
- Reduced bundle size and faster page loads

## **Current Architecture**

### **Next.js Implementation**
- **Pages**: File-based routing with dynamic routes
- **API Routes**: Canvas proxy for CORS handling
- **State Management**: React Context (`CanvasProvider`)
- **Components**: 15+ React components with hooks
- **CSS**: UnoCSS with attempted DaisyUI integration
- **Key Features**: Canvas API integration, discussion caching, markdown export

### **Technical Debt**
- CSS framework integration complexity
- Large JavaScript bundle for mostly static content
- Next.js-specific configurations causing build issues

## **Target Architecture**

### **Astro Hybrid Approach**
- **Static Pages**: Astro components for presentation
- **Interactive Components**: React islands for complex state
- **API Layer**: Astro server endpoints
- **State Management**: Nanostores for global state
- **Performance**: Zero-JS by default with selective hydration

## **Migration Strategy**

### **Phase 1: Foundation (Day 1)**
#### **1.1 Project Setup**
- [ ] Initialize Astro project with React integration
- [ ] Configure `astro.config.mjs`:
  - React integration with `@astrojs/react`
  - Node.js adapter for server endpoints
  - UnoCSS integration
  - TypeScript support (optional)

#### **1.2 Core Infrastructure**
- [ ] **API Migration**: Convert `/api/canvas-proxy.js` to Astro endpoint
- [ ] **Static Assets**: Port `public/` folder contents
- [ ] **CSS Setup**: Migrate UnoCSS configuration
- [ ] **Layout System**: Create base Astro layout

### **Phase 2: Page Migration (Day 1-2)**
#### **2.1 Static Pages**
- [ ] `pages/settings.js` → `src/pages/settings.astro`
- [ ] `pages/dashboard.js` → `src/pages/dashboard.astro`
- [ ] `pages/analysis.js` → `src/pages/analysis.astro`
- [ ] `pages/verify.js` → `src/pages/verify.astro`

#### **2.2 Dynamic Pages**
- [ ] `pages/user/[user_name].js` → `src/pages/user/[user_name].astro`
- [ ] `pages/index.js` → `src/pages/index.astro`

#### **2.3 State Management**
- [ ] Create Nanostores for Canvas credentials
- [ ] Set up cache management store
- [ ] Implement authentication state

### **Phase 3: Component Strategy (Day 2-3)**
#### **3.1 React Islands (Keep as React)**
- [ ] `CanvasProvider` → React island (`client:load`)
- [ ] `ActivityCard` → React island (`client:idle`)
- [ ] `TopicCard` → React island (`client:visible`)
- [ ] `UserCard` → React island (`client:visible`)
- [ ] Complex interactive components

#### **3.2 Astro Components (Convert)**
- [ ] `Layout.js` → `Layout.astro`
- [ ] `Header.js` → `Header.astro`
- [ ] `Navigation.js` → `Navigation.astro`
- [ ] `PageContainer.js` → `PageContainer.astro`
- [ ] `LoadingSpinner.js` → `LoadingSpinner.astro`
- [ ] `ErrorMessage.js` → `ErrorMessage.astro`

#### **3.3 Canvas API Integration**
- [ ] Port `js/canvasApi.js` to `src/lib/canvasApi.js`
- [ ] Update API calls for Astro server endpoints
- [ ] Implement client-side caching with Nanostores

### **Phase 4: Testing & Optimization (Day 3)**
- [ ] Test Canvas API proxy integration
- [ ] Verify discussion loading and caching
- [ ] Test user authentication flow
- [ ] Validate dynamic routing
- [ ] Optimize client directives and bundle splitting
- [ ] Test CSS framework integration

### **Phase 5: Completion (Day 4)**
- [ ] Final integration testing
- [ ] Documentation updates
- [ ] Cleanup and deployment preparation

## **Technical Specifications**

### **File Structure**
```
Current Next.js          →  Astro Target
pages/                   →  src/pages/
├── api/                 →  src/pages/api/
├── user/[user_name].js  →  src/pages/user/[user_name].astro
├── index.js             →  src/pages/index.astro
├── settings.js          →  src/pages/settings.astro
components/              →  src/components/
├── canvas/              →  src/components/canvas/ (React islands)
├── discussion/          →  src/components/discussion/ (React islands)
├── layout/              →  src/components/layout/ (Astro)
├── ui/                  →  src/components/ui/ (Mixed)
js/                      →  src/lib/
styles/                  →  src/styles/
public/                  →  public/
```

### **State Management Architecture**
```javascript
// Nanostores for global state
import { atom, map } from 'nanostores'

export const canvasAuth = map({
  apiUrl: '',
  apiKey: '',
  courseId: '',
  courseName: ''
})

export const canvasCache = map({
  discussions: [],
  timestamp: null,
  loading: false
})
```

### **Client Directive Strategy**
- `client:load` - Critical authentication components
- `client:idle` - Interactive cards and forms
- `client:visible` - Below-the-fold content
- `client:only` - React-specific components

## **Risk Assessment**

### **High Risk**
- Canvas API authentication flow in Astro environment
- LocalStorage management with SSR
- React island hydration timing

### **Medium Risk**
- CSS framework integration (though likely improved)
- State synchronization between Astro and React islands
- Build configuration complexity

### **Low Risk**
- Static page conversion
- Basic component migration
- File structure reorganization

## **Success Metrics**

### **Performance**
- [ ] 40-60% faster page load times
- [ ] Reduced JavaScript bundle size
- [ ] Improved Core Web Vitals scores

### **Developer Experience**
- [ ] Faster build times
- [ ] Better CSS framework integration
- [ ] Improved hot reloading

### **Functionality**
- [ ] All Canvas API features working
- [ ] Discussion loading and caching preserved
- [ ] User authentication flow maintained
- [ ] Markdown export functionality intact

## **Dependencies & Requirements**

### **New Dependencies**
- `@astrojs/react` - React integration
- `@astrojs/node` - Server-side rendering
- `nanostores` - State management
- `@nanostores/react` - React integration

### **Existing Dependencies (Keep)**
- `dompurify` - HTML sanitization
- `unocss` - CSS framework
- React ecosystem for islands

## **Rollback Plan**
- Maintain current Next.js version in separate branch
- Test migration on development environment first
- Staged deployment with immediate rollback capability
- Document all configuration changes for easy reversion

## **Post-Migration**
- Update deployment configuration
- Monitor performance metrics
- Gather user feedback
- Plan for gradual React island conversion to pure Astro (Phase 2)

## **Notes**
- This PRD focuses on the hybrid approach to minimize risk
- Future phases could convert React islands to pure Astro components
- CSS framework integration should be significantly improved
- Performance benefits expected to be substantial for this use case