import type { Href } from "expo-router";
import { useOnboarding } from "../onboarding/store";

type Nav = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

export function leave(router: Nav, fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

function homeFromTabs(pathname: string): boolean {
  return pathname === "/explore" || pathname === "/saved" || pathname === "/trips" || pathname === "/profile";
}

/** Hardware back when this screen is the only one in the stack. */
export function dismiss(router: Nav, pathname: string): boolean {
  if (pathname === "/" || pathname === "/welcome") return false;
  if (pathname === "/interests") {
    if (useOnboarding.getState().stage === "app") leave(router, "/");
    else void useOnboarding.getState().setStage("welcome").then(() => router.replace("/welcome"));
    return true;
  }
  if (router.canGoBack()) {
    router.back();
    return true;
  }
  if (pathname === "/sign-in") {
    router.replace("/welcome");
    return true;
  }
  if (pathname === "/name") {
    router.replace(useOnboarding.getState().stage === "app" ? "/profile" : "/welcome");
    return true;
  }
  if (pathname === "/info") {
    router.replace("/profile");
    return true;
  }
  if (pathname.startsWith("/trip/") || pathname.startsWith("/edit/") || pathname.startsWith("/preview")) {
    router.replace("/trips");
    return true;
  }
  if (homeFromTabs(pathname)) {
    router.replace("/");
    return true;
  }
  router.replace("/");
  return true;
}
