import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "./components/common/toast";
import { AuthProvider } from "./contexts/AuthContext";
import { AppDataProvider } from "./features/core/providers";
import { queryClient } from "./lib/query";

export default function ApplicationProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppDataProvider>
          {children}
          <ToastContainer />
        </AppDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
