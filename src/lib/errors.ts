/**
 * Map unknown errors to user-safe messages. Never expose SQL / stack traces.
 */
export function getUserFriendlyError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;

  if (typeof error === "string") {
    return sanitizeAuthMessage(error) ?? fallback;
  }

  if (error instanceof Error) {
    return sanitizeAuthMessage(error.message) ?? fallback;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (
      sanitizeAuthMessage((error as { message: string }).message) ?? fallback
    );
  }

  return fallback;
}

function sanitizeAuthMessage(message: string): string | null {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  if (normalized.includes("password should be at least")) {
    return "Password must be at least 8 characters.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (
    normalized.includes("schema cache") ||
    normalized.includes("could not find the function") ||
    normalized.includes("amvs_")
  ) {
    return "Database setup is incomplete. Run scripts/SETUP_ALL.sql in the Supabase SQL Editor, then try again.";
  }

  // Avoid leaking internal details
  if (
    normalized.includes("postgres") ||
    normalized.includes("jwt") ||
    normalized.includes("stack") ||
    normalized.includes("supabase")
  ) {
    return null;
  }

  // Short, non-technical messages can pass through
  if (message.length <= 120 && !message.includes("\n")) {
    return message;
  }

  return null;
}
