@echo off
echo ========================================
echo Phase 4: Advanced Features Tests
echo ========================================

REM Run Phase 4 integration tests
call npm run test:e2e -- test/integration/phase4-advanced-features.integration.spec.ts

echo.
echo ========================================
echo Phase 4 Tests Completed
echo ========================================
pause
