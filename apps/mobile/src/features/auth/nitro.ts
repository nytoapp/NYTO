import { Platform, TurboModuleRegistry, type TurboModule } from "react-native";

type NitroInstaller = TurboModule & {
  install: () => string | null | undefined;
};

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsShape = {
  getGlobalHandler: () => ErrorHandler;
  setGlobalHandler: (handler: ErrorHandler) => void;
};

function nitroProxyReady(): boolean {
  return (globalThis as { NitroModulesProxy?: object }).NitroModulesProxy != null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

/**
 * Nitro's JavaScript throws while the package is first evaluated when the
 * native module is missing. React Native reports that as a fatal screen, so a
 * try/catch around import() does not protect the screen. This loads the
 * package only after the native module is present, and keeps that evaluation
 * from taking the screen down.
 */
export async function loadNitroModule<T>(load: () => Promise<T>): Promise<T | null> {
  if (Platform.OS === "web") return null;
  let installer: NitroInstaller | null = null;
  try {
    installer = TurboModuleRegistry.get<NitroInstaller>("NitroModules") ?? null;
  } catch (error) {
    console.warn("[CITYDAY] Nitro native module is not available.", messageOf(error));
    return null;
  }
  if (!installer) {
    console.warn("[CITYDAY] Nitro native module is not in this build.");
    return null;
  }
  if (!nitroProxyReady()) {
    try {
      const installError = installer.install();
      if (installError && !nitroProxyReady()) {
        console.warn("[CITYDAY] Nitro did not install.", installError);
        return null;
      }
    } catch (error) {
      if (!nitroProxyReady()) {
        console.warn("[CITYDAY] Nitro did not install.", messageOf(error));
        return null;
      }
    }
  }

  return guardModuleLoad(load);
}

/**
 * A module that throws while it is first evaluated is reported as a fatal
 * screen before import() rejects. Hold the fatal handler only for that load.
 */
async function guardModuleLoad<T>(load: () => Promise<T>): Promise<T | null> {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  const previousHandler = utils?.getGlobalHandler?.();
  if (utils && previousHandler) {
    utils.setGlobalHandler(() => {
      // The caller treats a failed load as "feature unavailable".
    });
  }
  try {
    return await load();
  } catch (error) {
    console.warn("[CITYDAY] Nitro package did not load.", messageOf(error));
    return null;
  } finally {
    if (utils && previousHandler) utils.setGlobalHandler(previousHandler);
  }
}
