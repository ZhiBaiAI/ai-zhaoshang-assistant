/**
 * Create a YYYYMMDDHHmmss timestamp string.
 */
export function makeTimestamp(): string {
  return new Date().toISOString().replace(/[:.T-]/g, '').slice(0, 14);
}
