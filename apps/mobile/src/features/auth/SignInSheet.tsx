import { useState } from "react";
import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { AppText, Button, ErrorState, SearchField, Sheet } from "../../components/ui";
import { apiRequest, writeAccessToken } from "../../api/client";
import { useAuth } from "./session";
import { friendlyError } from "../../lib/errors";

export function SignInSheet({
  visible,
  onClose,
  onSignedIn,
}: {
  visible: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: async () => {
      const platform = Platform.OS === "android" ? "android" : Platform.OS === "web" ? "web" : "ios";
      const response = await apiRequest<{ accessToken: string }>("/api/v1/auth/email/login", {
        method: "POST",
        body: JSON.stringify({ email, password, device: { platform, label: "CITYDAY" } }),
      });
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Sign-in failed.");
      }
      await writeAccessToken(response.data.accessToken);
      useAuth.getState().markSignedIn();
    },
    onSuccess: () => {
      onSignedIn?.();
      onClose();
    },
  });

  return (
    <Sheet visible={visible} onClose={onClose}>
      <AppText role="title">Sign in</AppText>
      <AppText tone="muted">Saves and trips stay with your account.</AppText>
      <SearchField value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" hideIcon />
      <SearchField value={password} onChangeText={setPassword} placeholder="Password" secure hideIcon />
      {login.isError ? <ErrorState title="Couldn't sign in" body={friendlyError(login.error, "Check the email and password, then try again.")} /> : null}
      <Button label={login.isPending ? "Signing in" : "Continue"} onPress={() => login.mutate()} disabled={login.isPending || email.length === 0 || password.length === 0} />
    </Sheet>
  );
}
