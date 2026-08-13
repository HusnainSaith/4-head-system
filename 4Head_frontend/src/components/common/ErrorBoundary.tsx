import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { PageContainer } from "@/components/layout/PageContainer";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageContainer centered>
          <ErrorState
            title="The application encountered an error"
            description="Reload the page to start from a clean state."
            onRetry={() => window.location.reload()}
          />
        </PageContainer>
      );
    }
    return this.props.children;
  }
}
