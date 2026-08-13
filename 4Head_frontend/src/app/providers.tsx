import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "@/store/store";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthBootstrap } from "@/app/AuthBootstrap";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Root providers: Redux store, router, toast host, and the tooltip context.
 * Every screen renders inside this tree, so global concerns live here once.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <AuthBootstrap>
        <BrowserRouter>
          <TooltipProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </BrowserRouter>
      </AuthBootstrap>
    </Provider>
  );
}
