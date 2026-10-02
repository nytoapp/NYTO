import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

const expo = appJson.expo as ExpoConfig;
const iosScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim() ?? "";

const plugins: NonNullable<ExpoConfig["plugins"]> = [...(expo.plugins ?? []), "expo-dev-client"];

if (iosScheme.startsWith("com.googleusercontent.apps.")) {
  plugins.push(["react-native-nitro-google-signin", { iosUrlScheme: iosScheme }]);
}

const config: ExpoConfig = {
  ...expo,
  plugins,
  extra: {
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "",
  },
};

export default config;
