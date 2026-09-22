@echo off
echo ==========================================
echo Phase 5: Core Transactions Completion Tests
echo ==========================================
echo.

echo Running Phase 5 Integration Tests...
echo.

npm run test:e2e -- test/integration/phase5-transactions-completion.e2e-spec.ts

echo.
echo ==========================================
echo Phase 5 Tests Complete
echo ==========================================
