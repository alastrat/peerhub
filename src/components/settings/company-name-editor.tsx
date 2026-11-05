"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateCompanyName } from "@/lib/actions/company";

/** The company's name, editable in place by its admins. */
export function CompanyNameEditor({ name }: { name: string }) {
  const t = useTranslations("dashboard.settings");
  const router = useRouter();
  const { update } = useSession();
  const [saved, setSaved] = useState(name);
  const [value, setValue] = useState(name);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function cancel() {
    setValue(saved);
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      const result = await updateCompanyName(value);
      if (!result.success) {
        toast.error(result.error ?? t("name_error"));
        return;
      }
      setSaved(result.data!.name);
      setValue(result.data!.name);
      setEditing(false);
      toast.success(t("name_updated"));
      // The header and company switcher read the name from the session
      await update({});
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="font-medium">{saved}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => setEditing(true)}
          aria-label={t("edit_name")}
          title={t("edit_name")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        maxLength={100}
        autoFocus
        disabled={isPending}
        aria-label={t("name")}
      />
      <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isPending || value.trim().length < 2} aria-label={t("save_name")}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={cancel} disabled={isPending} aria-label={t("cancel_edit")}>
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}
