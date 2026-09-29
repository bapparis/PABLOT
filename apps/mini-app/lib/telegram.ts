export function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();

  if (!webApp) {
    return null;
  }

  webApp.ready();
  webApp.expand();

  return webApp;
}
