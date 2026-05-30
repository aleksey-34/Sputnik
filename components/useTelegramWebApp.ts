"use client";

import { useEffect, useState } from "react";

export function useTelegramWebApp() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [startParam, setStartParam] = useState<string | undefined>();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) return;

    setIsTelegram(true);
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor("#1A3668");
    tg.setBackgroundColor("#F4F7FB");

    const params = new URLSearchParams(tg.initData);
    setStartParam(params.get("start_param") ?? tg.initDataUnsafe?.start_param);

    const applyViewport = () => {
      const h = tg.viewportStableHeight || tg.viewportHeight;
      if (h > 0) {
        document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
      }
    };
    applyViewport();
    tg.onEvent?.("viewportChanged", applyViewport);
    return () => tg.offEvent?.("viewportChanged", applyViewport);
  }, []);

  return { isTelegram, startParam, WebApp: typeof window !== "undefined" ? window.Telegram?.WebApp : undefined };
}
