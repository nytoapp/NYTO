import { Platform } from "react-native";

export async function pickDevicePhone(): Promise<{ dial: string; national: string } | null> {
  if (Platform.OS !== "android") return null;
  try {
    const hint = await import("react-native-nitro-google-number-hint");
    if (!hint.isPhoneNumberHintAvailable()) return null;
    const parts = await hint.getParsedPhoneNumberHint();
    if (!parts?.countryCallingCode || !parts.nationalNumber) return null;
    return {
      dial: parts.countryCallingCode.replace(/\D/g, ""),
      national: parts.nationalNumber.replace(/\D/g, ""),
    };
  } catch {
    return null;
  }
}
