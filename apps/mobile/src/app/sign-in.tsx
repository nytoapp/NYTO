import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMutation } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest, writeAccessToken } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";
import { loadAccount } from "../features/auth/account";
import { countryFlag, matchCountries, nationalNumber, phoneReady, suggestPhoneCountry, type PhoneCountry } from "../features/auth/countries";
import { signInWithGoogle } from "../features/auth/google";
import { useAuth } from "../features/auth/session";
import { useOnboarding } from "../features/onboarding/store";
import { friendlyError } from "../lib/errors";

const page = "#F7F5F1";
const ink = "#1A1C1A";
const muted = "#8A8680";
const quiet = "#A39E96";
const line = "#E4E0D8";
const field = "#FFFFFF";
const danger = "#9C3B32";

const googleMark = require("../../assets/auth/google-g.png");

type Step = "phone" | "code";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

function device() {
  const platform = Platform.OS === "android" ? "android" : Platform.OS === "web" ? "web" : "ios";
  return { platform, label: "CITYDAY" } as const;
}

function digitsFor(country: PhoneCountry, input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith(country.dial) && digits.length > country.max) digits = digits.slice(country.dial.length);
  return nationalNumber(digits, country.max);
}

function spokenNumber(country: PhoneCountry, national: string): string {
  return `+${country.dial} ${national}`.trim();
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const cells = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  return (
    <View style={styles.codeWrap}>
      <View style={styles.cells} pointerEvents="none">
        {cells.map((cell, index) => (
          <View key={index} style={[styles.cell, cell ? styles.cellFilled : null]}>
            <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.cellText}>
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
        importantForAutofill="yes"
        maxLength={6}
        autoFocus
        caretHidden
        style={styles.hiddenInput}
      />
    </View>
  );
}

function ProviderButton({
  label,
  onPress,
  mark,
}: {
  label: string;
  onPress: () => void;
  mark: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.provider, pressed && styles.pressed]}
    >
      <View style={styles.markSlot}>{mark}</View>
      <Text allowFontScaling maxFontSizeMultiplier={1.25} style={styles.providerLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SignInScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const enterApp = useOnboarding((state) => state.enterApp);
  const setStage = useOnboarding((state) => state.setStage);
  const interests = useOnboarding((state) => state.interests);
  const markSignedIn = useAuth((state) => state.markSignedIn);
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState<PhoneCountry | null>(() => suggestPhoneCountry(getLocales()[0]?.regionCode));
  const [picking, setPicking] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [national, setNational] = useState("");
  const [focused, setFocused] = useState(false);
  const [fieldNote, setFieldNote] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const sentCode = useRef("");
  const phoneLock = useRef(false);
  const providerLock = useRef(false);
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const ready = country ? phoneReady(country, national) : false;
  const phoneE164 = country ? `+${country.dial}${national}` : "";

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [enter, reduced]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function finish() {
    markSignedIn();
    let needsName = true;
    try {
      const account = await loadAccount();
      queryClient.setQueryData(["account"], account);
      needsName = !account.displayName;
    } catch {
      needsName = true;
    }
    if (needsName) {
      router.replace({ pathname: "/name", params: { next: interests.length === 0 ? "interests" : "app" } });
      return;
    }
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
      setCode("");
      sentCode.current = "";
      setSeconds(30);
    },
    onSettled: () => {
      phoneLock.current = false;
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

  function requestCode() {
    if (!ready || !country || start.isPending || phoneLock.current) return;
    phoneLock.current = true;
    setProviderNotice(null);
    setFieldNote(null);
    start.mutate();
  }

  async function onGoogle() {
    if (providerLock.current || start.isPending) return;
    providerLock.current = true;
    setProviderNotice(null);
    try {
      const result = await signInWithGoogle();
      if (result === "cancelled") return;
      const response = await apiRequest<{ accessToken: string }>("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken: result.idToken, nonce: result.nonce, device: device() }),
      });
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Google sign-in didn't go through. Try again.");
      }
      await writeAccessToken(response.data.accessToken);
      await finish();
    } catch (error) {
      setProviderNotice(friendlyError(error, "Google sign-in didn't go through. Try again."));
    } finally {
      providerLock.current = false;
    }
  }

  function onApple() {
    if (providerLock.current || start.isPending) return;
    providerLock.current = true;
    console.warn("[CITYDAY auth] Apple sign-in is not configured. APPLE_CLIENT_IDS is empty, and Android has no Sign in with Apple session.");
    setProviderNotice("Apple sign-in isn't available right now.");
    providerLock.current = false;
  }

  function back() {
    if (step === "code") {
      setStep("phone");
      setCode("");
      sentCode.current = "";
      verify.reset();
      return;
    }
    router.back();
  }

  const phoneError = start.error ?? (step === "code" ? verify.error : null);
  const motion = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
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
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={back}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={ink} />
          </Pressable>

          <Animated.View style={motion}>
            <Text allowFontScaling maxFontSizeMultiplier={1.2} accessibilityRole="header" style={styles.heading}>
              {step === "code" ? "Enter your code" : "Log in"}
            </Text>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.support}>
              {step === "code"
                ? `Enter the 6-digit code for ${country ? spokenNumber(country, national) : "your number"}.`
                : "Sign in to continue to CITYDAY"}
            </Text>

            {step === "phone" ? (
              <View style={styles.form}>
                <View style={[styles.phone, focused && styles.phoneFocused]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={country ? `${country.name}, plus ${country.dial}. Change country` : "Choose country"}
                    onPress={() => setPicking(true)}
                    style={styles.country}
                  >
                    <Text allowFontScaling style={styles.flag} importantForAccessibility="no">
                      {country ? countryFlag(country.iso) : "🌐"}
                    </Text>
                    <Text allowFontScaling style={styles.dial} importantForAccessibility="no">
                      {country ? `+${country.dial}` : "Country"}
                    </Text>
                  </Pressable>
                  <View style={styles.phoneRule} />
                  <TextInput
                    accessibilityLabel="Mobile phone number"
                    accessibilityHint={country ? `${country.name}, country code plus ${country.dial}` : "Choose a country, then enter the mobile number."}
                    value={national}
                    onChangeText={(value) => {
                      const next = country ? digitsFor(country, value) : value.replace(/\D/g, "");
                      setNational(next);
                      if (!country || next.length === 0 || phoneReady(country, next)) setFieldNote(null);
                      if (start.isError) start.reset();
                    }}
                    onFocus={() => {
                      setFocused(true);
                      setFieldNote(null);
                    }}
                    onBlur={() => {
                      setFocused(false);
                      if (country && national.length > 0 && !phoneReady(country, national)) setFieldNote(`Enter a mobile number for ${country.name}.`);
                    }}
                    placeholder="Mobile number"
                    placeholderTextColor={quiet}
                    keyboardType="phone-pad"
                    inputMode="tel"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    importantForAutofill="yes"
                    maxLength={24}
                    style={styles.national}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                  accessibilityState={{ disabled: !ready || start.isPending, busy: start.isPending }}
                  disabled={!ready || start.isPending}
                  onPress={requestCode}
                  style={({ pressed }) => [
                    styles.continue,
                    !ready && styles.continueDisabled,
                    pressed && ready && !start.isPending && styles.pressed,
                  ]}
                >
                  <Text
                    allowFontScaling
                    maxFontSizeMultiplier={1.25}
                    style={[styles.continueLabel, !ready && styles.continueLabelDisabled, start.isPending && styles.hiddenLabel]}
                  >
                    Continue
                  </Text>
                  {start.isPending ? <ActivityIndicator color={page} style={styles.continueSpinner} /> : null}
                </Pressable>

                {fieldNote || phoneError ? (
                  <Text allowFontScaling style={styles.error}>
                    {fieldNote ?? friendlyError(phoneError, "That did not work. Try again.")}
                  </Text>
                ) : null}

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text allowFontScaling style={styles.dividerLabel}>
                    or
                  </Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.providers}>
                  <ProviderButton
                    label="Continue with Google"
                    onPress={() => void onGoogle()}
                    mark={<Image source={googleMark} style={styles.googleMark} resizeMode="contain" accessibilityElementsHidden />}
                  />
                  <ProviderButton
                    label="Continue with Apple"
                    onPress={onApple}
                    mark={<Ionicons name="logo-apple" size={20} color={ink} />}
                  />
                </View>

                {providerNotice ? (
                  <Text allowFontScaling style={styles.error}>
                    {providerNotice}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.form}>
                <CodeBoxes value={code} onChange={setCode} />
                {verify.isPending ? <ActivityIndicator color={ink} style={styles.codeSpinner} /> : null}
                {phoneError ? (
                  <Text allowFontScaling style={styles.error}>
                    {friendlyError(phoneError, "That code is not valid.")}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={seconds > 0 ? `Resend in ${seconds} seconds` : "Resend code"}
                  accessibilityState={{ disabled: seconds > 0 || start.isPending }}
                  disabled={seconds > 0 || start.isPending}
                  onPress={requestCode}
                  style={styles.resend}
                >
                  <Text allowFontScaling style={[styles.resendLabel, (seconds > 0 || start.isPending) && styles.resendDisabled]}>
                    {start.isPending ? "Resending" : seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {step === "phone" ? (
            <Text allowFontScaling maxFontSizeMultiplier={1.35} style={styles.legal}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={[styles.picker, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close countries" onPress={() => setPicking(false)} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={ink} />
          </Pressable>
          <Text allowFontScaling accessibilityRole="header" style={styles.heading}>
            Country
          </Text>
          <TextInput
            accessibilityLabel="Search countries"
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder="Search"
            placeholderTextColor={quiet}
            style={styles.countrySearch}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {matchCountries(countryQuery).map((item) => (
              <Pressable
                key={item.iso}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, plus ${item.dial}`}
                accessibilityState={{ selected: country?.iso === item.iso }}
                onPress={() => {
                  setCountry(item);
                  setNational((current) => digitsFor(item, current));
                  setFieldNote(null);
                  if (start.isError) start.reset();
                  setPicking(false);
                  setCountryQuery("");
                }}
                style={styles.countryRow}
              >
                <Text allowFontScaling style={styles.flag}>
                  {countryFlag(item.iso)}
                </Text>
                <Text allowFontScaling style={styles.countryName}>
                  {item.name}
                </Text>
                <Text allowFontScaling style={styles.dial}>
                  +{item.dial}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: page },
  fill: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: 24 },
  back: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  heading: { color: ink, fontSize: 32, lineHeight: 38, fontWeight: "600", letterSpacing: -0.45, marginTop: 8 },
  support: { color: "#736E68", fontSize: 16, lineHeight: 22, marginTop: 6 },
  form: { marginTop: 28 },
  phone: {
    height: 56,
    borderRadius: 16,
    backgroundColor: field,
    borderWidth: 1,
    borderColor: line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  phoneFocused: { borderColor: ink },
  flag: { fontSize: 18, lineHeight: 22 },
  country: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  dial: { color: ink, fontSize: 16, lineHeight: 20, fontWeight: "600", marginLeft: 10, includeFontPadding: false },
  picker: { flex: 1, backgroundColor: page, paddingHorizontal: 22 },
  countrySearch: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: line,
    backgroundColor: field,
    paddingHorizontal: 16,
    color: ink,
    fontSize: 16,
    marginBottom: 8,
  },
  countryRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  countryName: { flex: 1, color: ink, fontSize: 16 },
  phoneRule: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: "#E3DDD4", marginHorizontal: 12 },
  national: {
    flex: 1,
    color: ink,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    height: 56,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  continue: {
    height: 56,
    borderRadius: 28,
    backgroundColor: ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  continueDisabled: { backgroundColor: "#E3DFD8" },
  continueLabel: { color: page, fontSize: 16, lineHeight: 20, fontWeight: "600" },
  continueLabelDisabled: { color: quiet },
  hiddenLabel: { opacity: 0 },
  continueSpinner: { position: "absolute" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 28 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#D9D3CB" },
  dividerLabel: { color: quiet, fontSize: 13, lineHeight: 18, marginHorizontal: 12 },
  providers: { marginTop: 16, gap: 10 },
  provider: {
    height: 56,
    borderRadius: 28,
    backgroundColor: field,
    borderWidth: 1,
    borderColor: line,
    alignItems: "center",
    justifyContent: "center",
  },
  markSlot: { position: "absolute", left: 18, width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  googleMark: { width: 18, height: 18 },
  providerLabel: { color: ink, fontSize: 16, fontWeight: "600", textAlign: "center", paddingHorizontal: 44 },
  error: { color: danger, fontSize: 14, lineHeight: 20, marginTop: 12 },
  legal: { color: muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 28 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  codeWrap: { position: "relative" },
  cells: { flexDirection: "row", gap: 8 },
  cell: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: line,
    backgroundColor: field,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: { borderColor: ink },
  cellText: { color: ink, fontSize: 22, fontWeight: "600" },
  hiddenInput: { position: "absolute", left: 0, right: 0, top: 0, height: 58, opacity: 0.02, color: ink },
  codeSpinner: { marginTop: 16 },
  resend: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  resendLabel: { color: ink, fontSize: 15, fontWeight: "600" },
  resendDisabled: { color: quiet },
});
