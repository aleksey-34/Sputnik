export function normalizeVoucherToken(input: string) {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const v = url.searchParams.get("v");
    if (v) return v;
  } catch { /* not a url */ }
  return trimmed.replace(/^.*[?&]v=/, "").split("&")[0];
}
