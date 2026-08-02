/**
 * The app is mounted under a path prefix on the HR platform
 * (hr.rdcc.ai/techno) but served from the root in local development and on
 * Railway. Next.js rewrites <Link> and router.push() automatically, but NOT
 * raw fetch() calls or plain <a href> — those go through withBase().
 *
 * Set at build time via NEXT_PUBLIC_BASE_PATH (empty = mounted at root).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
