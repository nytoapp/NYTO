import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../components/ui/toast";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireAdmin } from "../features/auth/RequireAdmin";
import { SessionProvider } from "../features/auth/session-context";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { NotAvailable } from "../features/dashboard/NotAvailable";
import { PlaceEditorPage } from "../features/places/PlaceEditorPage";
import { PlacesPage } from "../features/places/PlacesPage";
import { AppShell } from "../layout/AppShell";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<RequireAdmin><AppShell /></RequireAdmin>}>
                <Route index element={<DashboardPage />} />
                <Route path="places" element={<PlacesPage />} />
                <Route path="places/new" element={<PlaceEditorPage mode="create" />} />
                <Route path="places/:id" element={<PlaceEditorPage mode="edit" />} />
                <Route path="*" element={<NotAvailable />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </BrowserRouter>
        </SessionProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
