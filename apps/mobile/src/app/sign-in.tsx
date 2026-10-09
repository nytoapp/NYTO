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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMutation } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest, writeSession } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";
import { loadAccount } from "../features/auth/account";
import { pickDevicePhone } from "../features/auth/phone-hint";
import { countryFlag, countryLabel, matchCountries, nationalNumber, phoneCountries, phoneReady, suggestPhoneCountry, type PhoneCountry } from "../features/auth/countries";
import { signInWithGoogle } from "../features/auth/google";
import { useAuth } from "../features/auth/session";
import { clearSignInDraft, saveSignInDraft, useSignInDraft } from "../features/auth/sign-in-draft";
import { useOnboarding } from "../features/onboarding/store";
import { leave } from "../features/nav/leave";
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

type AccountMode = "create" | "login";

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const enterApp = useOnboarding((state) => state.enterApp);
  const setStage = useOnboarding((state) => state.setStage);
  const stage = useOnboarding((state) => state.stage);
  const interests = useOnboarding((state) => state.interests);
  const markSignedIn = useAuth((state) => state.markSignedIn);
  const [mode, setMode] = useState<AccountMode>(params.mode === "create" ? "create" : params.mode === "login" ? "login" : useSignInDraft.getState().draft?.mode ?? "login");
  const [legal, setLegal] = useState<"terms" | "privacy" | null>(null);
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState<PhoneCountry | null>(() => {
    const iso = useSignInDraft.getState().draft?.countryIso;
    return phoneCountries.find((item) => item.iso === iso) ?? suggestPhoneCountry(getLocales()[0]?.regionCode);
  });
  const countryRef = useRef(country);
  countryRef.current = country;
  const [picking, setPicking] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [national, setNational] = useState(() => useSignInDraft.getState().draft?.national ?? "");
  const [focused, setFocused] = useState(false);
  const [fieldNote, setFieldNote] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const sentCode = useRef("");
  const phoneLock = useRef(false);
  const hinted = useRef(false);
  const hinting = useRef(false);
  const providerLock = useRef(false);
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const ready = country ? phoneReady(country, national) : false;
  const phoneE164 = country ? `+${country.dial}${national}` : "";

  useEffect(() => {
    void saveSignInDraft({ mode, countryIso: country?.iso ?? null, national, hinting: hinting.current });
  }, [country, mode, national]);

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
    await clearSignInDraft();
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
    if (stage === "app" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  }

  const start = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ challengeId: string }>("/api/v1/auth/phone/start", {
        method: "POST",
        body: JSON.stringify({ phoneE164, intent: mode }),
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
      const response = await apiRequest<{ accessToken: string; refreshToken: string }>("/api/v1/auth/phone/verify", {
        method: "POST",
        body: JSON.stringify({ phoneE164, code, device: device(), intent: mode }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? t("signIn.badCode"));
      await writeSession(response.data);
    },
    onSuccess: () => {
      void finish();
    },
  });

  function switchMode(next: AccountMode) {
    setMode(next);
    setStep("phone");
    setCode("");
    sentCode.current = "";
    setFieldNote(null);
    setProviderNotice(null);
    start.reset();
    verify.reset();
    router.setParams({ mode: next });
  }

  useEffect(() => {
    if (step !== "code" || code.length !== 6 || verify.isPending || sentCode.current === code) return;
    sentCode.current = code;
    verify.mutate();
  }, [code, step, verify]);

  async function offerDeviceNumber() {
    if (hinted.current || hinting.current) return;
    hinting.current = true;
    try {
      await saveSignInDraft({ mode, countryIso: countryRef.current?.iso ?? null, national, hinting: true });
      // Let a closing country sheet finish. The hint needs the login screen in front.
      await new Promise((resolve) => setTimeout(resolve, 350));
      const picked = await pickDevicePhone();
      if (picked.kind === "unavailable") return;
      hinted.current = true;
      if (picked.kind !== "selected") return;
      const chosen = countryRef.current;
      if (!chosen) return;
      setNational(nationalNumber(picked.national, chosen.max));
      setFieldNote(null);
    } catch (error) {
      console.warn("[CITYDAY] Phone number hint did not open.", error instanceof Error ? error.message : "unknown");
    } finally {
      hinting.current = false;
      const current = useSignInDraft.getState().draft;
      if (current?.hinting) void saveSignInDraft({ ...current, hinting: false });
    }
  }

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
      const response = await apiRequest<{ accessToken: string; refreshToken: string }>("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken: result.idToken, nonce: result.nonce, device: device() }),
      });
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? t("signIn.googleFailed"));
      }
      await writeSession(response.data);
      await finish();
    } catch (error) {
      setProviderNotice(friendlyError(error, t("signIn.googleFailed")));
    } finally {
      providerLock.current = false;
    }
  }

  function back() {
    if (step === "code") {
      setStep("phone");
      setCode("");
      sentCode.current = "";
      verify.reset();
      return;
    }
    void clearSignInDraft();
    leave(router, "/welcome");
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
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("signIn.back")}
            hitSlop={8}
            onPress={back}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={ink} />
          </Pressable>

          <Animated.View style={motion}>
            <Text allowFontScaling maxFontSizeMultiplier={1.2} accessibilityRole="header" style={styles.heading}>
              {step === "code" ? t("signIn.codeTitle") : mode === "create" ? t("signIn.create") : t("signIn.login")}
            </Text>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.support}>
              {step === "code"
                ? t("signIn.codeBody", { number: country ? spokenNumber(country, national) : t("signIn.yourNumber") })
                : mode === "create"
                  ? t("signIn.createBody")
                  : t("signIn.loginBody")}
            </Text>

            {step === "phone" ? (
              <View style={styles.form}>
                <View style={[styles.phone, focused && styles.phoneFocused]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={country ? `${countryLabel(country)}, +${country.dial}. ${t("signIn.changeCountry")}` : t("signIn.chooseCountry")}
                    onPress={() => setPicking(true)}
                    style={styles.country}
                  >
                    <Text allowFontScaling style={styles.flag} importantForAccessibility="no">
                      {country ? countryFlag(country.iso) : "🌐"}
                    </Text>
                    <Text allowFontScaling style={styles.dial} importantForAccessibility="no">
                      {country ? `+${country.dial}` : t("signIn.country")}
                    </Text>
                  </Pressable>
                  <View style={styles.phoneRule} />
                  <TextInput
                    accessibilityLabel={t("signIn.mobile")}
                    accessibilityHint={country ? `${countryLabel(country)}, +${country.dial}` : t("signIn.numberHint")}
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
                      void offerDeviceNumber();
                    }}
                    onBlur={() => {
                      setFocused(false);
                      if (country && national.length > 0 && !phoneReady(country, national)) setFieldNote(t("signIn.numberFor", { country: countryLabel(country) }));
                    }}
                    placeholder={t("signIn.mobile")}
                    placeholderTextColor={quiet}
                    keyboardType="phone-pad"
                    inputMode="tel"
                    textContentType="telephoneNumber"
                    autoComplete="tel-device"
                    importantForAutofill="yes"
                    maxLength={24}
                    style={styles.national}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("signIn.continue")}
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
                    {t("signIn.continue")}
                  </Text>
                  {start.isPending ? <ActivityIndicator color={page} style={styles.continueSpinner} /> : null}
                </Pressable>

                {fieldNote || phoneError ? (
                  <Text allowFontScaling style={styles.error}>
                    {fieldNote ?? friendlyError(phoneError, t("signIn.failed"))}
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
                    label={t("signIn.google")}
                    onPress={() => void onGoogle()}
                    mark={<Image source={googleMark} style={styles.googleMark} resizeMode="contain" accessibilityElementsHidden />}
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
                    {friendlyError(phoneError, t("signIn.badCode"))}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={seconds > 0 ? t("signIn.resendIn", { seconds }) : t("signIn.resend")}
                  accessibilityState={{ disabled: seconds > 0 || start.isPending }}
                  disabled={seconds > 0 || start.isPending}
                  onPress={requestCode}
                  style={styles.resend}
                >
                  <Text allowFontScaling style={[styles.resendLabel, (seconds > 0 || start.isPending) && styles.resendDisabled]}>
                    {start.isPending ? t("signIn.resending") : seconds > 0 ? t("signIn.resendIn", { seconds }) : t("signIn.resend")}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {step === "phone" ? (
            <View style={styles.footer}>
              <Text allowFontScaling maxFontSizeMultiplier={1.35} style={styles.legal}>
                {t("signIn.legalLead")}
              </Text>
              <View style={styles.legalLinks}>
                <Text allowFontScaling style={styles.legalLink} onPress={() => setLegal("terms")}>
                  {t("signIn.terms")}
                </Text>
                <Text allowFontScaling style={styles.legal}>
                  {t("signIn.and")}
                </Text>
                <Text allowFontScaling style={styles.legalLink} onPress={() => setLegal("privacy")}>
                  {t("signIn.privacy")}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={mode === "create" ? t("signIn.login") : t("signIn.create")}
                onPress={() => switchMode(mode === "create" ? "login" : "create")}
                style={styles.switchMode}
              >
                <Text allowFontScaling style={styles.switchLabel}>
                  {mode === "create" ? t("signIn.switchToLogin") : t("signIn.switchToCreate")}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={legal !== null} animationType="slide" onRequestClose={() => setLegal(null)}>
        <View style={[styles.picker, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("signIn.close")} onPress={() => setLegal(null)} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={ink} />
          </Pressable>
          <Text allowFontScaling accessibilityRole="header" style={styles.heading}>
            {legal === "privacy" ? t("signIn.privacy") : t("signIn.terms")}
          </Text>
          <Text allowFontScaling style={styles.legalBody}>
            {legal === "privacy" ? t("signIn.privacyBody") : t("signIn.termsBody")}
          </Text>
        </View>
      </Modal>
      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={[styles.picker, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("signIn.close")} onPress={() => setPicking(false)} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={ink} />
          </Pressable>
          <Text allowFontScaling accessibilityRole="header" style={styles.heading}>
            {t("signIn.country")}
          </Text>
          <TextInput
            accessibilityLabel={t("signIn.search")}
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder={t("signIn.search")}
            placeholderTextColor={quiet}
            style={styles.countrySearch}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {matchCountries(countryQuery).map((item) => (
              <Pressable
                key={item.iso}
                accessibilityRole="button"
                accessibilityLabel={`${countryLabel(item)}, +${item.dial}`}
                accessibilityState={{ selected: country?.iso === item.iso }}
                onPress={() => {
                  countryRef.current = item;
                  setCountry(item);
                  setNational((current) => digitsFor(item, current));
                  setFieldNote(null);
                  if (start.isError) start.reset();
                  setPicking(false);
                  setCountryQuery("");
                  void offerDeviceNumber();
                }}
                style={styles.countryRow}
              >
                <Text allowFontScaling style={styles.flag}>
                  {countryFlag(item.iso)}
                </Text>
                <Text allowFontScaling style={styles.countryName}>
                  {countryLabel(item)}
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
  form: { marginTop: 28, gap: 12 },
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
  footer: { marginTop: 28, gap: 8, alignItems: "center" },
  legal: { color: muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  legalLinks: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6 },
  legalLink: { color: ink, fontSize: 12, lineHeight: 18, textDecorationLine: "underline" },
  legalBody: { color: ink, fontSize: 16, lineHeight: 24, marginTop: 16 },
  switchMode: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  switchLabel: { color: ink, fontSize: 15, fontWeight: "600", textAlign: "center" },
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
