@echo off
echo ====================================
echo Phase 10: Department-Specific Features Tests
echo ====================================
echo.

echo Running Phase 10 integration tests...
call npm test -- test/integration/phase10.e2e-spec.ts

if %errorlevel% neq 0 (
    echo.
    echo Phase 10 tests FAILED!
    exit /b 1
)

echo.
echo ====================================
echo Phase 10 Tests PASSED!
echo ====================================
