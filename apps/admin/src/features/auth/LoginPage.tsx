import { useState } from "react";
import { Navigate } from "react-router-dom";
import type { AuthSession } from "@atlas/contracts";
import { Button, ErrorState, TextField } from "../../components/ui/primitives";
import { ApiRequestError, createApiClient } from "../../services/api";
import { useSession } from "./session-context";

export function LoginPage() {
  const { session, setFromAuth } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/admin" replace />;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const api = createApiClient(() => null);
    try {
      const auth = await api.request<AuthSession>("/api/v1/auth/email/login", {
        method: "POST",
        body: JSON.stringify({ email, password, device: { platform: "web", label: "Operations console" } }),
      });
      const client = createApiClient(() => auth.accessToken);
      await client.request<{ status: string }>("/api/v1/admin/status");
      setFromAuth(auth);
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === "FORBIDDEN") {
        setError("This account is not an admin.");
      } else if (caught instanceof ApiRequestError) {
        setError(caught.requestId && caught.requestId !== "unavailable" ? `${caught.message} Reference ${caught.requestId}.` : caught.message);
      } else {
        setError("Sign-in could not be completed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form
        className="panel login-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <p className="meta">Operations</p>
          <h1 className="page-title">Sign in</h1>
          <p className="page-intro muted">Use an account with the admin role. Guest discovery accounts cannot open this console.</p>
        </div>
        <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" />
        <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error ? <ErrorState title="Sign-in failed" body={error} /> : null}
        <Button type="submit" disabled={busy || email.length === 0 || password.length === 0}>{busy ? "Checking access" : "Continue"}</Button>
      </form>
    </div>
  );
}
