import { loadNitroModule } from "./nitro";

export type DevicePhone =
  | { kind: "selected"; dial: string; national: string }
  | { kind: "cancelled" }
  | { kind: "unavailable" };

export async function pickDevicePhone(): Promise<DevicePhone> {
  const hint = await loadNitroModule(() => import("react-native-nitro-google-number-hint"));
  if (!hint) return { kind: "unavailable" };
  try {
    if (!hint.isPhoneNumberHintAvailable()) return { kind: "unavailable" };
    const result = await hint.requestPhoneNumberHint();
    if (result.status !== "selected") console.warn("[CITYDAY] phone hint", result.status);
    if (result.status !== "selected" || !result.phoneNumber) {
      return result.status === "cancelled" ? { kind: "cancelled" } : { kind: "unavailable" };
    }
    const parts = hint.parsePhoneNumber(result.phoneNumber);
    if (!parts?.countryCallingCode || !parts.nationalNumber) return { kind: "unavailable" };
    return {
      kind: "selected",
      dial: parts.countryCallingCode.replace(/\D/g, ""),
      national: parts.nationalNumber.replace(/\D/g, ""),
    };
  } catch (error) {
    console.warn("[CITYDAY] Phone number hint did not open.", error instanceof Error ? error.message : "unknown");
    return { kind: "unavailable" };
  }
}
