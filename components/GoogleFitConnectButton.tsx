"use client";

import { useState } from "react";
import {
  detectMobilePlatform,
  isGoogleFitAppConfirmed,
  isMobilePlatform,
  markGoogleFitAppConfirmed,
  openGoogleFitAppOrStore,
  type MobilePlatform
} from "@/lib/utils/google-fit-app";

type Props = {
  onConnectOAuth: () => void;
  className?: string;
  label?: string;
};

export function GoogleFitConnectButton({
  onConnectOAuth,
  className = "w-full btn-accent py-2",
  label = "Подключить Google Fit"
}: Props) {
  const [showPrompt, setShowPrompt] = useState(false);
  const platform = detectMobilePlatform();

  const startConnect = () => {
    if (!isMobilePlatform()) {
      onConnectOAuth();
      return;
    }
    if (isGoogleFitAppConfirmed()) {
      onConnectOAuth();
      return;
    }
    setShowPrompt(true);
  };

  return (
    <>
      <button type="button" className={className} onClick={startConnect}>
        {label}
      </button>

      {showPrompt && (
        <GoogleFitInstallModal
          platform={platform}
          onClose={() => setShowPrompt(false)}
          onConnectOAuth={() => {
            markGoogleFitAppConfirmed();
            setShowPrompt(false);
            onConnectOAuth();
          }}
        />
      )}
    </>
  );
}

function GoogleFitInstallModal({
  platform,
  onClose,
  onConnectOAuth
}: {
  platform: MobilePlatform;
  onClose: () => void;
  onConnectOAuth: () => void;
}) {
  const storeLabel = platform === "ios" ? "App Store" : "Google Play";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-primary">Нужно приложение Google Fit</h3>
        <p className="mt-2 text-sm text-slate-600">
          Спутник читает шаги через Google Fit. Шаги из «Здоровья» Xiaomi, Samsung Health и других
          приложений сами не попадут — сначала установите Google Fit и войдите в свой Google-аккаунт.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Установите Google Fit ({storeLabel})</li>
          <li>Откройте его и пройдите 50–100 шагов</li>
          <li>Затем подключите аккаунт в Спутнике</li>
        </ol>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="w-full btn-accent py-2.5"
            onClick={() => openGoogleFitAppOrStore(platform)}
          >
            {platform === "ios" ? "Установить Google Fit (App Store)" : "Установить Google Fit (Google Play)"}
          </button>
          <button type="button" className="w-full btn-primary py-2.5" onClick={onConnectOAuth}>
            Google Fit уже есть — подключить аккаунт
          </button>
          <button type="button" className="w-full text-sm text-slate-500 underline" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoogleFitOpenAppButton({ className }: { className?: string }) {
  if (!isMobilePlatform()) return null;
  const platform = detectMobilePlatform();

  return (
    <button
      type="button"
      className={className ?? "mt-2 w-full rounded-2xl border border-primary py-2 text-sm text-primary"}
      onClick={() => openGoogleFitAppOrStore(platform)}
    >
      Открыть Google Play / App Store
    </button>
  );
}
