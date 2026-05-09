/** Join class names; omit falsy entries (for CVA + ad-hoc overrides). */
export function cx(...parts: (string | undefined | null | false)[]): string {
  return parts.filter(Boolean).join(" ");
}
