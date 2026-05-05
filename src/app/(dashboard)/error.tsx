"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[dashboard] Server-side error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-xl space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Loading this page failed. The team has been notified — you can try
          again, and if it keeps happening, share the details below.
        </p>

        {error.message && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="mb-1 font-medium">Error</div>
            <code className="block break-words font-mono text-xs">
              {error.message}
            </code>
          </div>
        )}

        {error.digest && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="mb-1 font-medium">Digest</div>
            <code className="block font-mono text-xs">{error.digest}</code>
          </div>
        )}

        {isDev && error.stack && (
          <details className="rounded-lg border bg-muted/40 p-4 text-sm">
            <summary className="cursor-pointer font-medium">Stack trace</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-2">
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/login">Sign out and back in</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
