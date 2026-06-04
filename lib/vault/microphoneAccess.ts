export type MicAccessIssue = "denied" | "policy" | "unavailable" | "unknown";

export function classifyMicrophoneError(error: unknown): MicAccessIssue {
  if (!(error instanceof DOMException)) return "unknown";
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "denied";
  }
  if (
    error.name === "SecurityError" ||
    /permissions policy/i.test(error.message) ||
    /not allowed/i.test(error.message)
  ) {
    return "policy";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "unavailable";
  }
  return "unknown";
}

export function microphoneErrorMessage(issue: MicAccessIssue): string {
  switch (issue) {
    case "denied":
      return "Microphone access is off for this site. Use the button below to open your browser’s permission controls, set Microphone to Allow, then try again.";
    case "policy":
      return "This page could not use the microphone. Reload after updating site permissions.";
    case "unavailable":
      return "No microphone was found. Connect a mic or use Upload your own.";
    default:
      return "Could not access your microphone. Check system settings or use Upload your own.";
  }
}
