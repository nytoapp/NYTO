import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { AppText, Button, EmptyState, ErrorState, Screen, SearchField, Sheet } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { apiRequest, readAccessToken, writeAccessToken } from "../../api/client";
import { useEffect } from "react";

export function SavedScreen() {
  const { t } = useTranslation();
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    void readAccessToken().then((token) => setSignedIn(Boolean(token)));
  }, []);
  return (
    <Screen>
      <View style={{ gap: space[4] }}>
        <AppText role="title">Saved</AppText>
        {signedIn ? (
          <EmptyState title="No saves yet" body="Places you save will stay on this account." />
        ) : (
          <>
            <EmptyState title={t("signInToSave")} body={t("authRequired")} />
            <Button label={t("signIn")} onPress={() => setOpen(true)} />
          </>
        )}
        <SignInSheet visible={open} onClose={() => setOpen(false)} />
      </View>
    </Screen>
  );
}

export function TripsScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={{ gap: space[4] }}>
        <AppText role="title">Trips</AppText>
        <EmptyState title={t("authRequired")} body="A trip keeps a destination and dates separate from where you are standing." />
      </View>
    </Screen>
  );
}

function SignInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ accessToken: string }>("/api/v1/auth/email/login", {
        method: "POST",
        body: JSON.stringify({ email, password, device: { platform: "ios", label: "Atlas" } }),
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      await writeAccessToken(response.data.accessToken);
      return response.data;
    },
  });
  return (
    <Sheet visible={visible} onClose={onClose}>
      <AppText role="headline">Sign in</AppText>
      <SearchField value={email} onChangeText={setEmail} placeholder="Email" />
      <SearchField value={password} onChangeText={setPassword} placeholder="Password" secure />
      {login.isError ? <ErrorState title="Sign-in failed" body={login.error instanceof Error ? login.error.message : "Try again."} /> : null}
      <Button label="Continue" onPress={() => login.mutate()} disabled={login.isPending} />
    </Sheet>
  );
}
