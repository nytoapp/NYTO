import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { AppText, Button, Screen, SearchField, Sheet } from "../components/ui";
import { useTheme } from "../components/theme/ThemeProvider";
import { space } from "../components/theme/tokens";
import { apiRequest, writeAccessToken } from "../api/client";
import { friendlyError } from "../lib/errors";
import { countryFlag, defaultPhoneCountry, matchCountries, nationalNumber, phoneReady as numberReady, type PhoneCountry } from "../features/auth/countries";
import { useAuth } from "../features/auth/session";
import { useOnboarding } from "../features/onboarding/store";

function device() {
  const platform = Platform.OS === "android" ? "android" : Platform.OS === "web" ? "web" : "ios";
  return { platform, label: "CITYDAY" } as const;
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const colors = useTheme();
  const cells = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  return (
    <View style={styles.codeWrap}>
      <View style={styles.cells} pointerEvents="none">
        {cells.map((cell, index) => (
          <View key={index} style={[styles.cell, { backgroundColor: colors.elevated, borderColor: cell ? colors.paper : colors.line }]}>
            <Text allowFontScaling style={{ color: colors.ink, fontSize: 22, fontWeight: "600" }}>
              {cell}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        accessibilityLabel="6-digit code"
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        autoFocus
        caretHidden
        style={[styles.hiddenInput, { color: colors.ink }]}
      />
    </View>
  );
}

export default function SignInScreen() {
  const colors = useTheme();
  const router = useRouter();
  const enterApp = useOnboarding((state) => state.enterApp);
  const setStage = useOnboarding((state) => state.setStage);
  const interests = useOnboarding((state) => state.interests);
  const markSignedIn = useAuth((state) => state.markSignedIn);
  const [step, setStep] = useState<"phone" | "code" | "email">("phone");
  const [country, setCountry] = useState<PhoneCountry>(defaultPhoneCountry);
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState("");
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [seconds, setSeconds] = useState(0);
  const sentCode = useRef("");
  const phoneE164 = `+${country.dial}${national}`;
  const ready = numberReady(country, national);
  const shown = matchCountries(filter);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function finish() {
    markSignedIn();
    if (interests.length === 0) {
      await setStage("interests");
      router.replace("/interests");
      return;
    }
    await enterApp(interests);
    router.replace("/");
  }

  const start = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ challengeId: string }>("/api/v1/auth/phone/start", {
        method: "POST",
        body: JSON.stringify({ phoneE164 }),
      });
      if (response.error) throw new Error(response.error.message);
    },
    onSuccess: () => {
      setStep("code");
      setSeconds(30);
    },
  });

  const verify = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ accessToken: string }>("/api/v1/auth/phone/verify", {
        method: "POST",
        body: JSON.stringify({ phoneE164, code, device: device() }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "That code is not valid.");
      await writeAccessToken(response.data.accessToken);
    },
    onSuccess: () => {
      void finish();
    },
  });

  useEffect(() => {
    if (step !== "code" || code.length !== 6 || verify.isPending || sentCode.current === code) return;
    sentCode.current = code;
    verify.mutate();
  }, [code, step, verify]);

  const emailLogin = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ accessToken: string }>("/api/v1/auth/email/login", {
        method: "POST",
        body: JSON.stringify({ email, password, device: device() }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Email or password is incorrect.");
      await writeAccessToken(response.data.accessToken);
    },
    onSuccess: () => {
      void finish();
    },
  });

  const error = start.error ?? verify.error ?? emailLogin.error;

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (step === "code" ? setStep("phone") : step === "email" ? setStep("phone") : router.back())}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
        </Pressable>
        <View style={styles.center}>
          <AppText role="brand" tone="tertiary">
            CITYDAY
          </AppText>
          <AppText role="title">{step === "email" ? "Log in" : step === "code" ? "Enter your code" : "Your number"}</AppText>
          <AppText tone="muted">
            {step === "code"
              ? `Enter the 6-digit code for ${phoneE164}`
              : step === "email"
                ? "Use your CITYDAY account."
                : "Enter your mobile number."}
          </AppText>
          {step === "phone" ? (
            <View style={[styles.phoneRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${country.name} +${country.dial}`} onPress={() => setPicker(true)} style={styles.dial}>
                <AppText role="label">
                  {countryFlag(country.iso)}  {country.iso}
                </AppText>
                <AppText role="caption" tone="tertiary">
                  +{country.dial}
                </AppText>
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TextInput
                accessibilityLabel="Mobile number"
                value={national}
                onChangeText={(value) => setNational(nationalNumber(value, country.max))}
                placeholder={country.iso === "SE" ? "7XX XXX XXX" : "Mobile number"}
                placeholderTextColor={colors.tertiary}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                style={[styles.national, { color: colors.ink }]}
              />
            </View>
          ) : null}
          {step === "code" ? <CodeBoxes value={code} onChange={setCode} /> : null}
          {step === "email" ? (
            <>
              <SearchField value={email} onChangeText={setEmail} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" hideIcon />
              <SearchField value={password} onChangeText={setPassword} placeholder="Password" secure hideIcon />
            </>
          ) : null}
          {step === "phone" ? (
            <>
              <Button label={start.isPending ? "Continuing" : "Continue"} disabled={start.isPending || !ready} onPress={() => start.mutate()} />
              <Pressable accessibilityRole="button" accessibilityLabel="Use email instead" onPress={() => setStep("email")} style={styles.secondary}>
                <AppText role="label">Use email instead</AppText>
              </Pressable>
            </>
          ) : null}
          {step === "code" ? (
            <>
              <Button label={verify.isPending ? "Checking" : "Continue"} disabled={verify.isPending || code.length !== 6} onPress={() => verify.mutate()} />
              <Pressable accessibilityRole="button" accessibilityLabel="Resend code" disabled={seconds > 0 || start.isPending} onPress={() => start.mutate()} style={styles.secondary}>
                <AppText role="label" tone={seconds > 0 ? "muted" : "ink"}>
                  {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
                </AppText>
              </Pressable>
            </>
          ) : null}
          {step === "email" ? (
            <>
              <Button
                label={emailLogin.isPending ? "Signing in" : "Continue"}
                disabled={emailLogin.isPending || email.length === 0 || password.length === 0}
                onPress={() => emailLogin.mutate()}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Use phone instead" onPress={() => setStep("phone")} style={styles.secondary}>
                <AppText role="label">Use your number</AppText>
              </Pressable>
            </>
          ) : null}
          {error ? (
            <AppText role="bodySmall" tone="clay">
              {friendlyError(error, "That did not work. Try again.")}
            </AppText>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <Sheet
        visible={picker}
        onClose={() => {
          setPicker(false);
          setFilter("");
        }}
      >
        <AppText role="headline">Country</AppText>
        <SearchField value={filter} onChangeText={setFilter} placeholder="Search countries" hideIcon />
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.countryList}>
          {shown.map((item) => {
            const selected = item.iso === country.iso;
            return (
              <Pressable
                key={item.iso}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.name} +${item.dial}`}
                onPress={() => {
                  setCountry(item);
                  setNational("");
                  setPicker(false);
                  setFilter("");
                }}
                style={[styles.country, { borderBottomColor: colors.divider }]}
              >
                <AppText role="label">
                  {countryFlag(item.iso)}  {item.name}
                </AppText>
                <AppText role="label" tone={selected ? "accent" : "muted"}>
                  +{item.dial}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: "center", gap: space[3], paddingBottom: space[8] },
  back: { minHeight: 48, justifyContent: "center" },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  phoneRow: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space[3],
  },
  dial: { minHeight: 48, paddingRight: space[3], justifyContent: "center" },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginVertical: 12 },
  national: { flex: 1, fontSize: 18, paddingVertical: space[3], paddingLeft: space[3] },
  countryList: { maxHeight: 360 },
  codeWrap: { position: "relative" },
  cells: { flexDirection: "row", gap: space[2] },
  cell: { flex: 1, height: 56, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  hiddenInput: { position: "absolute", left: 0, right: 0, top: 0, height: 56, opacity: 0.02 },
  country: { minHeight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
});
