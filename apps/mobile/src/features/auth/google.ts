import Constants from "expo-constants";
import { loadNitroModule } from "./nitro";

const unavailable = "Google sign-in isn't available right now.";
const failed = "Google sign-in didn't go through. Try again.";

type GoogleModule = typeof import("react-native-nitro-google-signin");

type GoogleResult = { idToken: string; nonce: string } | "cancelled";

function webClientId(): string {
  const extra = Constants.expoConfig?.extra?.googleWebClientId;
  const fromExtra = typeof extra === "string" ? extra.trim() : "";
  if (fromExtra.length > 0) return fromExtra;
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";
}

function createNonce(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(32);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  const uuid = (globalThis as { expo?: { uuidv4?: () => string } }).expo?.uuidv4;
  if (typeof uuid === "function") {
    return Array.from({ length: 4 }, () => uuid().replace(/-/g, "")).join("");
  }

  console.warn("[CITYDAY auth] Google nonce could not be created. No random source is available.");
  throw new Error(unavailable);
}

function diagnostic(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    const message = "message" in error ? String((error as { message: unknown }).message) : "";
    return message ? `${code}: ${message}` : code;
  }
  return error instanceof Error ? error.message : "unknown";
}

/**
 * Opens the Android Credential Manager account dialog and returns a Google ID token.
 * The nonce is the same value placed in the ID token and sent to the API.
 * Nothing here logs the token.
 */
export async function signInWithGoogle(): Promise<GoogleResult> {
  const clientId = webClientId();
  if (!clientId) {
    console.warn(
      "[CITYDAY auth] Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the Web OAuth client ID, add that same ID to API GOOGLE_CLIENT_IDS, and register an Android OAuth client for package com.atlas.discovery with the debug SHA-1. A development build is required; Expo Go cannot open the account picker.",
    );
    throw new Error(unavailable);
  }

  const native = await loadNitroModule(() => import("react-native-nitro-google-signin"));
  if (!native) {
    console.warn("[CITYDAY auth] Google native module did not load. A development build with Nitro is required.");
    throw new Error(unavailable);
  }

  const nonce = createNonce();
  try {
    native.GoogleOneTapSignIn.configure({
      webClientId: clientId,
      nonce,
      offlineAccess: false,
    });
    await native.GoogleOneTapSignIn.checkPlayServices(true);
    let response = await native.GoogleOneTapSignIn.presentExplicitSignIn();
    if (response.type === "noSavedCredentialFound") {
      response = await native.GoogleOneTapSignIn.createAccount();
    }
    if (native.isCancelledResponse(response) || response.type === "cancelled") {
      return "cancelled";
    }
    if (!native.isSuccessResponse(response)) {
      console.warn("[CITYDAY auth] Google sign-in returned no ID token.", response.type);
      throw new Error(failed);
    }
    if (response.data.idToken.length < 20) {
      console.warn("[CITYDAY auth] Google sign-in returned an unusable ID token.");
      throw new Error(failed);
    }
    return { idToken: response.data.idToken, nonce };
  } catch (error) {
    if (native.isErrorWithCode(error) && error.code === native.statusCodes.SIGN_IN_CANCELLED) {
      return "cancelled";
    }
    console.warn("[CITYDAY auth] Google sign-in failed.", diagnostic(error));
    if (error instanceof Error && (error.message === unavailable || error.message === failed)) {
      throw error;
    }
    throw new Error(failed);
  }
}
