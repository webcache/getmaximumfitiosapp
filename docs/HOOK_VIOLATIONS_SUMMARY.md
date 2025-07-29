# React Hook Rules Violations - Critical Issues

## Major Problems Found
The lint output shows serious React Hook rule violations that MUST be fixed immediately. These violations occur when hooks are called conditionally or after early returns, which violates the Rules of Hooks.

## Critical Files With Hook Violations

### 1. app/(tabs)/dashboard.tsx
**Issue**: All hooks (useState, useEffect, useCallback, useChat, etc.) are called AFTER a conditional return statement.
**Lines**: 48-223 (multiple hook calls after early return)
**Fix Required**: Move ALL hooks to the top of the component, before any conditional logic.

### 2. app/(tabs)/profile.tsx  
**Issue**: useState and useEffect hooks called after conditional return
**Lines**: 39, 49 (hooks after early return)
**Fix Required**: Move hooks before the isReady check

### 3. app/(tabs)/progress.tsx
**Issue**: Multiple useState, useCallback, and useEffect hooks called after conditional return
**Lines**: 33-300 (extensive hook violations)
**Fix Required**: Complete restructure needed

### 4. app/(tabs)/workouts.tsx
**Issue**: Multiple hooks called after conditional return
**Lines**: 50-150 (multiple violations)
**Fix Required**: Move all hooks to component top

## Fixed Issues ✅
- ✅ app/login/loginScreen.tsx - Added missing hasNavigated dependency
- ✅ Removed unused router variables from multiple components
- ✅ Fixed unused error variables in catch blocks
- ✅ Removed non-existent refreshUserProfile function calls
- ✅ Fixed @typescript-eslint/no-require-imports warning
- ✅ Commented out unused favorite workout state variables

## Required Actions

### CRITICAL: Fix Hook Rule Violations
These files need immediate attention to fix hook rule violations:

1. **dashboard.tsx** - File appears corrupted with duplicate code sections
2. **profile.tsx** - File has syntax corruption from overlapping edits  
3. **progress.tsx** - Needs complete hook restructure
4. **workouts.tsx** - Needs complete hook restructure

### Pattern to Follow:
```typescript
export default function ComponentName() {
  // 1. ALL HOOKS FIRST - no exceptions
  const hookValue1 = useHook1();
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  
  useEffect(() => {
    // effect logic
  }, [deps]);
  
  const callback = useCallback(() => {
    // callback logic  
  }, [deps]);
  
  // 2. CONDITIONAL LOGIC AFTER ALL HOOKS
  if (!isReady) {
    return <LoadingComponent />;
  }
  
  // 3. MAIN COMPONENT LOGIC
  return <MainComponent />;
}
```

## File Corruption Issues
Several files appear to have syntax corruption from overlapping edits:
- dashboard.tsx has duplicate code blocks
- profile.tsx has declaration/statement errors
- workouts.tsx likely has similar issues

**Recommendation**: These files may need to be completely rewritten or restored from a clean backup, then restructured properly with hooks at the top.

## Next Steps
1. Fix the 4 critical tab files with hook violations
2. Test that all components render without errors
3. Verify React Hook rules compliance
4. Run lint again to confirm fixes
