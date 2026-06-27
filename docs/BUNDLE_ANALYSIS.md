# Bundle Size Analysis

## Current Bundle Composition (2026-06-28)

### Build Output Summary
```
dist/assets/firebase-CSOJ-jHY.js         452.68 kB │ gzip: 105.94 kB
dist/assets/dndkit-Doncco4W.js           182.96 kB │ gzip:  59.08 kB
dist/assets/index-DJn47o2r.js            108.49 kB │ gzip:  30.59 kB
dist/assets/vendor-HtZ1NXb2.js            38.80 kB │ gzip:  15.26 kB
dist/assets/CardDetailModal-CWwH5nPw.js   18.42 kB │ gzip:   6.02 kB
dist/assets/ColumnManager-BitU7KdZ.js      7.61 kB │ gzip:   2.81 kB
dist/assets/TrashModal-Cwvq_0VL.js         6.33 kB │ gzip:   2.22 kB
```

**Total**: ~815 kB (raw) / ~222 kB (gzip)

### Manual Chunk Configuration
```typescript
manualChunks: {
  firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
  dndkit: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  vendor: ['react', 'react-dom', 'zustand', 'styled-components'],
}
```

## Findings

### 1. Firebase Bundle Size (🔴 High Priority)
- **Size**: 452.68 kB (105.94 kB gzipped)
- **Percentage**: ~55% of total bundle
- **Issue**: Firebase SDK is large even when only using Firestore + Auth
- **Recommendation**: 
  - Consider tree-shaking improvements
  - Evaluate if modular imports are properly configured
  - Check if unused Firebase features can be excluded

### 2. DnD Kit (🟡 Medium)
- **Size**: 182.96 kB (59.08 kB gzipped)
- **Percentage**: ~22% of total bundle
- **Status**: Acceptable for drag-and-drop functionality
- **Note**: Already properly code-split into separate chunk

### 3. Vendor Bundle (🟢 Good)
- **Size**: 38.80 kB (15.26 kB gzipped)
- **Includes**: React, React-DOM, Zustand, styled-components
- **Status**: Well optimized

### 4. Circular Dependency Warning
```
Circular chunk: dndkit -> vendor -> dndkit
```
- **Issue**: Circular dependency between dndkit and vendor chunks
- **Impact**: May cause duplicate code in bundles
- **Recommendation**: Review manual chunk configuration

## Optimization Opportunities

### Immediate Actions
1. **Firebase Optimization**
   - ✅ Already using modular imports (`firebase/app`, `firebase/firestore`)
   - ⚠️ Verify no unused Firebase modules are included
   - Consider lazy-loading Firebase for offline-first mode

2. **Fix Circular Dependencies**
   - Review why dndkit references vendor and vice versa
   - Adjust manual chunks to avoid circular references

3. **Code Splitting**
   - ✅ Modal components already code-split
   - Consider lazy-loading BoardModal and other infrequently used components

### Future Considerations
1. **Dynamic Imports for Firebase**
   ```typescript
   // Only load Firebase when user logs in
   const loadFirebase = () => import('./lib/firebase')
   ```

2. **Evaluate Alternatives**
   - styled-components alternatives (CSS Modules, Tailwind) would reduce vendor bundle
   - But requires significant refactoring

3. **PWA Service Worker**
   - Already configured with proper caching strategies
   - ✅ Firebase Storage and Google Fonts properly cached

## How to Run Analysis

```bash
# Generate bundle visualization
npm run build:analyze

# View results
open dist/stats.html
```

## Performance Metrics

### Current Status
- ✅ All gzipped chunks under 150 kB except Firebase
- ✅ Proper code splitting for large dependencies
- ✅ PWA caching configured
- ⚠️ Firebase bundle could be optimized further

### Target Goals
- Firebase chunk: < 400 kB (currently 452 kB)
- Total gzipped: < 200 kB (currently ~222 kB)
- Initial load: < 100 kB gzipped

## Related Configuration

### Vite Config
- `esbuild.drop`: Removes console/debugger in production
- PWA precaching: 16 entries (~1 MB)
- Runtime caching: Firebase Storage + Google Fonts

### Build Command
```json
"build": "tsc && vite build",
"build:analyze": "ANALYZE=true tsc && vite build"
```
