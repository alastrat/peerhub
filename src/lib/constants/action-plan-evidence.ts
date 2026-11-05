/**
 * Largest evidence file a plan task accepts. Files travel in the body of the
 * `uploadTaskEvidence` Server Action, which next.config.ts caps at 4.5 MB
 * (`experimental.serverActions.bodySizeLimit`, the same as Vercel's function
 * limit), so the file plus the multipart overhead has to stay below that.
 * Shared with the browser so it can reject a bigger file before sending it.
 */
export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;

/** MAX_EVIDENCE_BYTES in MB, for the `file_too_large` message. */
export const MAX_EVIDENCE_MB = MAX_EVIDENCE_BYTES / (1024 * 1024);
