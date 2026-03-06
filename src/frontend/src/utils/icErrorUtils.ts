/**
 * Utilities for handling Internet Computer canister errors gracefully.
 * IC0508 = canister is stopped
 * IC0503 = canister is not running / frozen
 * IC0504 = canister is out of cycles
 */

export const IC_ERROR_PATTERNS = [
  "ic0508",
  "ic0503",
  "ic0504",
  "canister is stopped",
  "canister stopped",
  "canister not running",
  "canister is not running",
  "canister is out of cycles",
  "canister has no update calls",
  "canister trapped",
  "request_processing_error",
  "canister rejected",
  "replica error",
];

/**
 * Returns true if the error is a known IC canister availability error.
 */
export function isCanisterUnavailableError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? err.message.toLowerCase()
      : String(err).toLowerCase();
  return IC_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

/**
 * Maps any error into a user-friendly message string.
 * - IC canister errors → generic credential error (don't expose internal details)
 * - Credential errors → pass through as-is
 * - Unknown errors → generic fallback
 */
export function getFriendlyErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!err) return fallback;

  if (isCanisterUnavailableError(err)) {
    // Don't show service unavailable -- just use the fallback so we retry silently
    return fallback;
  }

  if (err instanceof Error) {
    const msg = err.message;
    // Don't expose raw IC/replica error dumps — check for long technical strings
    if (
      msg.length > 300 ||
      msg.includes("Reject code") ||
      msg.includes("Canister")
    ) {
      return fallback;
    }
    return msg || fallback;
  }

  const strErr = String(err);
  if (strErr.length > 300) {
    return fallback;
  }
  return strErr || fallback;
}
