import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, SearchField, Sheet } from "../components/ui";
import { useTheme } from "../components/theme/ThemeProvider";
import { apiRequest, writeAccessToken } from "../api/client";
import { friendlyError } from "../lib/errors";
import { countryFlag, defaultPhoneCountry, matchCountries, nationalNumber, phoneReady as numberReady, type PhoneCountry } from "../features/auth/countries";
import { useAuth } from "../features/auth/session";
import { useOnboarding } from "../features/onboarding/store";

const page = "#F7F5F1";
const ink = "#1A1C1A";
const muted = "#8A8680";
const field = "#FBFBF9";
const line = "#E4E0D8";
const danger = "#9C3B32";

type Step = "choose" | "phone" | "code" | "email";

function device() {
  const platform = Platform.OS === "android" ? "android" : Platform.OS === "web" ? "web" : "ios";
  return { platform, label: "CITYDAY" } as const;
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const cells = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  return (
    <View style={styles.codeWrap}>
      <View style={styles.cells} pointerEvents="none">
        {cells.map((cell, index) => (
          <View key={index} style={[styles.cell, cell ? styles.cellFilled : null]}>
            <Text allowFontScaling style={styles.cellText}>
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
        style={styles.hiddenInput}
      />
    </View>
  );
}

function Choice({
  label,
  icon,
  onPress,
  filled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  filled?: boolean;
}) {
  const color = filled ? "#F7F5F1" : ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, filled ? styles.choiceFilled : styles.choiceQuiet, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={color} style={styles.choiceIcon} />
      <Text allowFontScaling style={[styles.choiceLabel, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignInScreen() {
  const colors = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const enterApp = useOnboarding((state) => state.enterApp);
  const setStage = useOnboarding((state) => state.setStage);
  const interests = useOnboarding((state) => state.interests);
  const markSignedIn = useAuth((state) => state.markSignedIn);
  const [step, setStep] = useState<Step>("choose");
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
  const heading = step === "email" ? "Gmail" : step === "code" ? "Enter your code" : step === "phone" ? "Your number" : "Log in";
  const support =
    step === "code"
      ? `Enter the 6-digit code for ${phoneE164}.`
      : step === "email"
        ? "Use your Gmail address and password."
        : step === "phone"
          ? "Enter your mobile number."
          : "";

  function back() {
    if (step === "code") {
      setStep("phone");
      return;
    }
    if (step === "phone" || step === "email") {
      setStep("choose");
      return;
    }
    router.back();
  }

  const phoneCanContinue = ready && !start.isPending;
  const emailCanContinue = email.length > 0 && password.length > 0 && !emailLogin.isPending;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: page },
          statusBarStyle: "dark",
          statusBarTranslucent: true,
          navigationBarColor: page,
        }}
      />
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={24} color={ink} />
        </Pressable>
        <ScrollView contentContainerStyle={[styles.body, step === "choose" && styles.bodyChoose]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text allowFontScaling maxFontSizeMultiplier={1.25} accessibilityRole="header" style={styles.heading}>
            {heading}
          </Text>
          {support ? (
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.support}>
              {support}
            </Text>
          ) : null}

          {step === "choose" ? <View style={styles.flex} /> : null}
          {step === "choose" ? (
            <View style={[styles.choices, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
              <Choice label="Gmail" icon="logo-google" onPress={() => setStep("email")} />
              <Choice label="Mobile number" icon="call-outline" onPress={() => setStep("phone")} />
              <Choice label="Apple" icon="logo-apple" filled onPress={() => undefined} />
            </View>
          ) : null}

          {step === "phone" ? (
            <View style={styles.phoneRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${country.name} +${country.dial}`} onPress={() => setPicker(true)} style={styles.dial}>
                <Text allowFontScaling style={styles.dialIso}>
                  {countryFlag(country.iso)}  {country.iso}
                </Text>
                <Text allowFontScaling style={styles.dialCode}>
                  +{country.dial}
                </Text>
              </Pressable>
              <View style={styles.divider} />
              <TextInput
                accessibilityLabel="Mobile number"
                value={national}
                onChangeText={(value) => setNational(nationalNumber(value, country.max))}
                placeholder={country.iso === "SE" ? "7XX XXX XXX" : "Mobile number"}
                placeholderTextColor={muted}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                style={styles.national}
              />
            </View>
          ) : null}

          {step === "code" ? <CodeBoxes value={code} onChange={setCode} /> : null}

          {step === "email" ? (
            <View style={styles.fields}>
              <TextInput
                accessibilityLabel="Gmail address"
                value={email}
                onChangeText={setEmail}
                placeholder="Gmail address"
                placeholderTextColor={muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                style={styles.field}
              />
              <TextInput
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={muted}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                style={styles.field}
              />
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{friendlyError(error, "That did not work. Try again.")}</Text> : null}

          {step === "phone" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !phoneCanContinue }}
              disabled={!phoneCanContinue}
              onPress={() => start.mutate()}
              style={({ pressed }) => [styles.continue, !phoneCanContinue && styles.continueDisabled, pressed && phoneCanContinue && styles.pressed]}
            >
              <Text style={[styles.continueLabel, !phoneCanContinue && styles.continueLabelDisabled]}>{start.isPending ? "Continuing" : "Continue"}</Text>
            </Pressable>
          ) : null}
          {step === "code" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={seconds > 0 ? `Resend in ${seconds} seconds` : "Resend code"}
              disabled={seconds > 0 || start.isPending}
              onPress={() => start.mutate()}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}</Text>
            </Pressable>
          ) : null}
          {step === "email" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !emailCanContinue }}
              disabled={!emailCanContinue}
              onPress={() => emailLogin.mutate()}
              style={({ pressed }) => [styles.continue, !emailCanContinue && styles.continueDisabled, pressed && emailCanContinue && styles.pressed]}
            >
              <Text style={[styles.continueLabel, !emailCanContinue && styles.continueLabelDisabled]}>
                {emailLogin.isPending ? "Signing in" : "Continue"}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: page, paddingHorizontal: 24 },
  fill: { flex: 1 },
  back: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  body: { flexGrow: 1, paddingTop: 36, paddingBottom: 24 },
  bodyChoose: { paddingBottom: 0 },
  flex: { flexGrow: 1, minHeight: 32 },
  heading: { color: ink, fontSize: 40, lineHeight: 46, fontWeight: "600", letterSpacing: -0.8 },
  support: { color: muted, fontSize: 16, lineHeight: 23, maxWidth: 320, marginTop: 8, marginBottom: 8 },
  choices: { gap: 10 },
  choice: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceQuiet: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3DED6" },
  choiceFilled: { backgroundColor: ink },
  choiceIcon: { position: "absolute", left: 20 },
  choiceLabel: { fontSize: 16, fontWeight: "600" },
  phoneRow: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: field,
    borderWidth: 1,
    borderColor: line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  dial: { minHeight: 48, paddingRight: 12, justifyContent: "center" },
  dialIso: { color: ink, fontSize: 15, fontWeight: "600" },
  dialCode: { color: muted, fontSize: 13, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginVertical: 12, backgroundColor: line },
  national: { flex: 1, color: ink, fontSize: 18, paddingVertical: 12, paddingLeft: 12 },
  fields: { gap: 12 },
  field: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: field,
    borderWidth: 1,
    borderColor: line,
    color: ink,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  continue: { minHeight: 56, borderRadius: 28, backgroundColor: ink, alignItems: "center", justifyContent: "center", marginTop: 8 },
  continueDisabled: { backgroundColor: "#E3DFD8" },
  continueLabel: { color: "#F7F5F1", fontSize: 16, fontWeight: "600" },
  continueLabelDisabled: { color: "#A39E96" },
  textButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  textButtonLabel: { color: ink, fontSize: 15, fontWeight: "600" },
  error: { color: danger, fontSize: 14, lineHeight: 20 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  countryList: { maxHeight: 360 },
  country: { minHeight: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  codeWrap: { position: "relative" },
  cells: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: field,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: { borderColor: ink },
  cellText: { color: ink, fontSize: 22, fontWeight: "600" },
  hiddenInput: { position: "absolute", left: 0, right: 0, top: 0, height: 56, opacity: 0.02, color: ink },
});
