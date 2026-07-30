// Egyptian mobile number normalization: users type only the local part
// (10 digits, e.g. 1155336849) and it is stored/transmitted as E.164
// (+201155336849). Shared between the frontend (src/) and server.ts.

const EGYPT_LOCAL_REGEX = /^1[0125]\d{8}$/;
const EGYPT_E164_REGEX = /^\+201[0125]\d{8}$/;

export function isValidEgyptLocalPhone(local: string): boolean {
  return EGYPT_LOCAL_REGEX.test((local || "").trim());
}

export function isValidEgyptE164(value: string): boolean {
  return EGYPT_E164_REGEX.test((value || "").trim());
}

export function toEgyptE164(local: string): string {
  return `+20${(local || "").trim()}`;
}

// Recovers the 10-digit local part from a stored/legacy value for display in
// an edit field, e.g. "+20 100 123 4567" -> "1001234567". Returns "" if a
// valid Egyptian mobile number can't be recovered.
export function extractEgyptLocalPhone(stored: string | undefined | null): string {
  if (!stored) return "";
  const digits = stored.replace(/\D/g, "");
  const local = digits.startsWith("20") ? digits.slice(2) : digits;
  return isValidEgyptLocalPhone(local) ? local : "";
}

// Normalizes any stored/legacy value (with or without +20, spaces, leading 0)
// into digits-only international format for wa.me links, e.g. "201155336849".
// Returns null if a valid Egyptian mobile number can't be recovered.
export function toWhatsappDigits(stored: string | undefined | null): string | null {
  if (!stored) return null;
  const digits = stored.replace(/\D/g, "");
  let local = "";
  if (digits.startsWith("20") && digits.length === 12) {
    local = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    local = digits.slice(1);
  } else if (digits.length === 10) {
    local = digits;
  } else {
    return null;
  }
  return isValidEgyptLocalPhone(local) ? `20${local}` : null;
}

export function toWhatsappLink(stored: string | undefined | null): string | null {
  const digits = toWhatsappDigits(stored);
  return digits ? `https://wa.me/${digits}` : null;
}
