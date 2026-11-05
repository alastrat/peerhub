/**
 * Where a portal sign-in may send the employee afterwards: portal pages and
 * printable climate reports (a leader's team report). Same-origin paths only,
 * so the `redirect` parameter can't become an open redirect.
 */
export function isPortalRedirect(path: string | null | undefined): path is string {
  return !!path && (path.startsWith("/portal/") || path.startsWith("/climate-report/"));
}
