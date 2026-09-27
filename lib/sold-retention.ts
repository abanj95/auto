/** Sold cars are deleted completely (row + photo files) this many days after sold_at. */
export const SOLD_RETENTION_DAYS = 31;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days until a sold car is purged (0 = due now). */
export function daysUntilPurge(soldAt: string) {
  const due = new Date(soldAt).getTime() + SOLD_RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((due - Date.now()) / DAY_MS));
}

/** ISO timestamp `days` days ago (for "sold in the last 30 days" etc.). */
export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}
