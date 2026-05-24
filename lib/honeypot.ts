const MIN_FILL_TIME_MS = 2500;

type HoneypotInput = FormData | { _hp?: string; _ts?: string | number | null };

function read(input: HoneypotInput, key: "_hp" | "_ts"): string | null {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    const v = input.get(key);
    return typeof v === "string" ? v : null;
  }
  const v = (input as { _hp?: unknown; _ts?: unknown })[key];
  if (v === null || v === undefined) return null;
  return String(v);
}

export function validateHoneypot(input: HoneypotInput): boolean {
  const hp = read(input, "_hp");
  if (hp && hp.trim() !== "") return false;

  const tsRaw = read(input, "_ts");
  if (!tsRaw) return false;
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || ts <= 0) return false;

  const elapsed = Date.now() - ts;
  if (elapsed < MIN_FILL_TIME_MS) return false;

  return true;
}
