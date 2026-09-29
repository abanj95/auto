/**
 * Search engines may index the site only when NEXT_PUBLIC_ALLOW_INDEXING is
 * "true" (set it when the real domain launches). Otherwise robots.txt
 * disallows everything and every page is noindex.
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
