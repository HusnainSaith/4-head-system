import { AppRoutes } from "@/routes/AppRoutes";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

/**
 * Root component: the providers (Redux, Router, Toaster, Tooltip) wrap this
 * in main.tsx, so App only needs to mount the route table.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
