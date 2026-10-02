import * as SplashScreen from "expo-splash-screen";

let revealed = false;

/** Hide the native splash once the real destination has painted. */
export function revealApp(): void {
  if (revealed) return;
  revealed = true;
  void SplashScreen.hideAsync();
}
