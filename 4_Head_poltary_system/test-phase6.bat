@echo off
echo ========================================
echo Running Phase 6: Personnel Management Tests
echo ========================================

echo.
echo Running Personnel Consolidation Tests...
npx jest --config=test/jest-e2e.json test/integration/phase6-personnel-consolidation.e2e-spec.ts --runInBand --detectOpenHandles --forceExit

echo.
echo ========================================
echo Phase 6 Tests Complete
echo ========================================
