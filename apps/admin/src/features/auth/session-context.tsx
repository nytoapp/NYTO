import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ClientSession } from "../../lib/session";
import { browserStorage, clearSession, readSession, writeSession } from "../../lib/session";

type SessionValue = {
  session: ClientSession | null;
  setFromAuth: (session: { accessToken: string; userId: string; expiresInSeconds: number }) => void;
  clear: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(() => readSession(browserStorage()));
  const value = useMemo<SessionValue>(() => ({
    session,
    setFromAuth: (next) => setSession(writeSession(browserStorage(), next)),
    clear: () => {
      clearSession(browserStorage());
      setSession(null);
    },
  }), [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("Session is unavailable");
  }
  return value;
}
