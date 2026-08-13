@echo off
echo ========================================
echo Phase 7: Accounting & Reporting Tests
echo ========================================
echo.

npm run test:e2e -- test/integration/phase7-accounting-reporting.e2e-spec.ts

echo.
echo ========================================
echo Phase 7 Tests Complete
echo ========================================
