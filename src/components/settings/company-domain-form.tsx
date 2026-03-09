"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe } from "lucide-react";
import { updateCompanyDomain } from "@/lib/actions/platform";

export function CompanyDomainForm({
  companyId,
  currentDomain,
}: {
  companyId: string;
  currentDomain: string | null;
}) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await updateCompanyDomain({
        companyId,
        domain: domain.trim().toLowerCase() || null,
      });
      if (result.success) {
        setMessage({ type: "success", text: "Domain updated" });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="relative">
        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="ps-10"
          disabled={isPending}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Leave empty to disable auto-join. Users whose email matches this domain
        will be able to join the company automatically.
      </p>

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Domain"}
      </Button>
    </form>
  );
}
