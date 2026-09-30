// Staff session limits. The database enforces the same values
// (private.session_idle_limit / private.session_max_age, migration 015).
export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const IDLE_WARNING_MS = 25 * 60 * 1000;
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
/** How often an active tab tells the server "still here". */
export const HEARTBEAT_MS = 2 * 60 * 1000;
