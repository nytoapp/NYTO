import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton } from "../features/city/chrome";
import { city, cityRadius, citySpace, color } from "../features/city/theme";
import { loadAccount, saveDisplayName } from "../features/auth/account";
import { leave } from "../features/nav/leave";
import { useOnboarding } from "../features/onboarding/store";

export default function NameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = params.next === "interests" || params.next === "stay" ? params.next : "app";
  const interests = useOnboarding((state) => state.interests);
  const setStage = useOnboarding((state) => state.setStage);
  const enterApp = useOnboarding((state) => state.enterApp);
  const account = useQuery({ queryKey: ["account"], queryFn: loadAccount });
  const seeded = useRef(false);
  const [name, setName] = useState("");
  useEffect(() => {
    if (seeded.current || !account.data?.displayName) return;
    seeded.current = true;
    setName(account.data.displayName);
  }, [account.data?.displayName]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = name.trim().length > 0;

  async function save() {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const account = await saveDisplayName(trimmed);
      queryClient.setQueryData(["account"], account);
      if (next === "stay") {
        leave(router, "/profile");
        return;
      }
      if (next === "interests" || interests.length === 0) {
        await setStage("interests");
        router.replace("/interests");
        return;
      }
      await enterApp(interests);
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save your name.");
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: city.page, paddingTop: insets.top + 28, paddingHorizontal: citySpace.page, paddingBottom: insets.bottom + 24 }}>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: city.page },
          statusBarStyle: "dark",
          statusBarTranslucent: true,
          navigationBarColor: city.page,
        }}
      />
      <StatusBar style="dark" />
      <CityText size="display">What should we call you?</CityText>
      <CityText tone="muted" style={{ marginTop: 8 }}>
        {next === "stay" ? "This is the name on your CITYDAY profile." : "This finishes your account."}
      </CityText>
      <TextInput
        accessibilityLabel="Your name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        placeholder="Your name"
        placeholderTextColor={city.quiet}
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        style={{
          marginTop: 28,
          minHeight: 56,
          borderRadius: cityRadius.card,
          borderWidth: 1,
          borderColor: city.line,
          backgroundColor: city.paper,
          paddingHorizontal: 16,
          fontSize: 18,
          color: city.ink,
        }}
      />
      {error ? (
        <CityText style={{ marginTop: 12, color: color.error }}>
          {error}
        </CityText>
      ) : null}
      <View style={{ marginTop: 24 }}>
        <DarkButton label={saving ? "Saving" : "Continue"} disabled={!ready || saving} onPress={() => void save()} />
      </View>
    </View>
  );
}
