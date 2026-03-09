"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Globe } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  addSuperAdminDomain,
  removeSuperAdminDomain,
} from "@/lib/actions/platform";

interface Domain {
  id: string;
  domain: string;
  createdAt: string;
}

export function DomainsManager({ domains: initial }: { domains: Domain[] }) {
  const [domains, setDomains] = useState(initial);
  const [newDomain, setNewDomain] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await addSuperAdminDomain(newDomain.trim().toLowerCase());
      if (result.success && result.data) {
        setDomains((prev) => [
          { ...result.data!, createdAt: new Date().toISOString() },
          ...prev,
        ]);
        setNewDomain("");
      } else {
        setError(result.error || "Failed to add domain");
      }
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeSuperAdminDomain(id);
      if (result.success) {
        setDomains((prev) => prev.filter((d) => d.id !== id));
      } else {
        setError(result.error || "Failed to remove domain");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Add domain form */}
      <form onSubmit={handleAdd} className="flex items-center gap-3 max-w-lg">
        <div className="relative flex-1">
          <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="ps-10"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending || !newDomain.trim()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Domain
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Domains list */}
      {domains.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No admin domains configured. Add a domain to auto-assign Super Admin
            role to new users.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono text-sm">
                  @{d.domain}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Added {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove domain?</AlertDialogTitle>
                    <AlertDialogDescription>
                      New users with <strong>@{d.domain}</strong> email will no
                      longer be auto-assigned as Super Admin. Existing admins
                      are not affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(d.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
