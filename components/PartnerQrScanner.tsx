"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type Props = {
  active: boolean;
  onScan: (text: string) => void;
};

export function PartnerQrScanner({ active, onScan }: Props) {
  const uid = useId().replace(/:/g, "");
  const regionId = `qr-reader-${uid}`;
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [error, setError] = useState("");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }

    let cancelled = false;

    const start = async () => {
      setError("");
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decoded) => {
            onScanRef.current(decoded);
          },
          () => { /* ignore scan failures */ }
        );
      } catch {
        if (!cancelled) {
          setError("Не удалось открыть камеру. Разрешите доступ к камере в браузере и обновите страницу.");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [active, regionId, stopScanner]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div
        id={regionId}
        className="overflow-hidden rounded-2xl border-2 border-accent bg-black [&_video]:rounded-2xl"
      />
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <p className="text-center text-xs text-brand-muted">Наведите камеру на QR клиента</p>
    </div>
  );
}
