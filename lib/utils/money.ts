export function calcSettlementAmounts(billRub: number, userDiscountPct: number, platformFeePct: number) {
  const discountAmountRub = Math.round(billRub * userDiscountPct / 100);
  const platformFeeAmountRub = Math.round(billRub * platformFeePct / 100);
  const clientPaysRub = billRub - discountAmountRub;
  return { discountAmountRub, platformFeeAmountRub, clientPaysRub };
}

export function formatRub(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
}
