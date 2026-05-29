import crypto from "crypto";
import { appPublicUrl } from "@/lib/server/auth";

export function generateVoucherToken() {
  return crypto.randomBytes(16).toString("hex");
}

export function partnerVoucherUrl(token: string) {
  const base = appPublicUrl();
  return `${base}/partner?v=${token}`;
}

export function voucherExpiresAt(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function isPartnerKind(kind: string) {
  return kind === "partner" || kind === "quest";
}
