import { useAuth } from "./session";

export function useSession() {
  const status = useAuth((state) => state.status);
  const refresh = useAuth((state) => state.refresh);
  const signOut = useAuth((state) => state.signOut);
  return { signedIn: status === "signedIn", restoring: status === "restoring", refresh, signOut };
}
