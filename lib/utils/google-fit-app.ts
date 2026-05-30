export type MobilePlatform = "android" | "ios" | "other";

const STORAGE_KEY = "sputnik_gfit_app_confirmed";

export const GOOGLE_FIT = {
  androidPackage: "com.google.android.apps.fitness",
  playStore: "https://play.google.com/store/apps/details?id=com.google.android.apps.fitness",
  appStore: "https://apps.apple.com/app/google-fit-activity-tracker/id1433864494"
} as const;

export function detectMobilePlatform(): MobilePlatform {
  if (typeof window === "undefined") return "other";

  const tgPlatform = window.Telegram?.WebApp?.platform?.toLowerCase();
  if (tgPlatform === "android") return "android";
  if (tgPlatform === "ios") return "ios";

  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  return "other";
}

export function isMobilePlatform(): boolean {
  return detectMobilePlatform() !== "other";
}

/** Открывает ссылку во внешнем браузере (безопасно в Telegram WebView). */
export function openExternalLink(url: string) {
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function googleFitStoreUrl(platform: MobilePlatform = detectMobilePlatform()) {
  return platform === "ios" ? GOOGLE_FIT.appStore : GOOGLE_FIT.playStore;
}

export function markGoogleFitAppConfirmed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function isGoogleFitAppConfirmed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Открывает Google Play / App Store. Не используем intent:// или custom scheme —
 * в Telegram WebView это даёт чёрный экран.
 */
export function openGoogleFitAppOrStore(platform: MobilePlatform = detectMobilePlatform()) {
  openExternalLink(googleFitStoreUrl(platform));
}
