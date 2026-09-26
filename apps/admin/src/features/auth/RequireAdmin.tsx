import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { ErrorState, Skeleton } from "../../components/ui/primitives";
import { ApiRequestError, createApiClient } from "../../services/api";
import { useSession } from "./session-context";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, clear } = useSession();
  const location = useLocation();
  const status = useQuery({
    queryKey: ["admin", "status", session?.userId ?? "none"],
    enabled: Boolean(session),
    retry: false,
    queryFn: () => createApiClient(() => session?.accessToken ?? null).request<{ status: string }>("/api/v1/admin/status"),
  });

  const unauthorized = status.error instanceof ApiRequestError && (status.error.status === 401 || status.error.code === "AUTHENTICATION_REQUIRED");
  useEffect(() => {
    if (unauthorized) {
      clear();
    }
  }, [unauthorized, clear]);

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (unauthorized) {
    return <div className="gate" aria-busy="true" aria-label="Ending session">Checking session</div>;
  }
  if (status.isLoading) {
    return (
      <div className="gate" aria-busy="true" aria-label="Checking access">
        <div className="login-panel">
          <Skeleton height={28} />
          <Skeleton height={14} />
          <Skeleton height={14} />
        </div>
      </div>
    );
  }
  if (status.error instanceof ApiRequestError && status.error.code === "FORBIDDEN") {
    return (
      <div className="gate">
        <div className="panel login-panel">
          <h1 className="page-title">This account cannot open operations</h1>
          <p className="muted">The signed-in account does not have the admin role. Sign out and use an admin account.</p>
          <button type="button" className="btn secondary" onClick={clear}>Clear session</button>
        </div>
      </div>
    );
  }
  if (status.isError) {
    const message = status.error instanceof ApiRequestError ? status.error.message : "Access could not be checked.";
    const requestId = status.error instanceof ApiRequestError ? status.error.requestId : "";
    return (
      <div className="gate">
        <ErrorState title="Operations is unavailable" body={requestId ? `${message} Reference ${requestId}.` : message} onRetry={() => void status.refetch()} />
      </div>
    );
  }
  return children;
}
