import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { apiRequest, readAccessToken, writeAccessToken } from "../../api/client";

export function useSession() {
  const [signedIn, setSignedIn] = useState(false);
  const refresh = useCallback(async () => {
    setSignedIn(Boolean(await readAccessToken()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const signOut = useCallback(async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // The local session still has to end if the API cannot be reached.
    }
    await writeAccessToken(null);
    await refresh();
  }, [refresh]);

  return { signedIn, refresh, signOut };
}
