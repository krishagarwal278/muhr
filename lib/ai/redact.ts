export function redactPII(text: string): string {
  // redact emails
  let out = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
  // redact phone numbers (simple)
  out = out.replace(/\+?\d[\d ()-]{6,}\d/g, "[REDACTED_PHONE]");
  // redact common id numbers (rough)
  out = out.replace(/\b(SSN|Aadhaar|PAN|passport)[:#]?\s*[A-Z0-9-]{4,}\b/gi, "[REDACTED_ID]");
  // redact URLs
  out = out.replace(/https?:\/\/[^\s]+/gi, "[REDACTED_URL]");
  return out;
}
