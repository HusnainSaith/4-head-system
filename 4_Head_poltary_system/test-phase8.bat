@echo off
echo ================================================
echo Phase 8 Integration Tests
echo Advanced Inventory and Fleet Features
echo ================================================
echo.

echo Running Phase 8 tests...
npm run test:e2e -- test/integration/phase8.spec.ts

echo.
echo ================================================
echo Phase 8 Test Execution Complete
echo ================================================
