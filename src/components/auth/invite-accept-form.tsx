"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "@/lib/actions/invitations";

interface InviteAcceptFormProps {
  token: string;
  email: string;
  // When set (super-admin pre-filled the invitation), the form expands into a
  // review-and-edit step so the invitee can correct values before they're
  // written to their freshly-minted User + Employee rows.
  prefilled?: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    jobTitle: string | null;
  } | null;
}

export function InviteAcceptForm({
  token,
  email,
  prefilled,
}: InviteAcceptFormProps) {
  const t = useTranslations("auth.invite.form");
  const [isPending, startTransition] = useTransition();

  // When we have prefill data, branch into the richer review form. Otherwise
  // keep the original single "Your name" UX intact for regular member invites.
  const hasPrefill =
    !!prefilled &&
    (!!prefilled.firstName ||
      !!prefilled.lastName ||
      !!prefilled.phone ||
      !!prefilled.jobTitle);

  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState(prefilled?.firstName ?? "");
  const [lastName, setLastName] = useState(prefilled?.lastName ?? "");
  const [phone, setPhone] = useState(prefilled?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(prefilled?.jobTitle ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPrefill) {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      if (!trimmedFirst || !trimmedLast) {
        toast.error(t("errors.first_last_required"));
        return;
      }

      startTransition(async () => {
        const result = await acceptInvitation(token, "", {
          firstName: trimmedFirst,
          lastName: trimmedLast,
          phone: phone || "",
          jobTitle: jobTitle.trim(),
        });
        if (!result.success) {
          toast.error(result.error || t("errors.accept_failed"));
          return;
        }
        toast.success(t("accepted_toast"));
        await signIn("email", { email, callbackUrl: "/overview" });
      });
      return;
    }

    // Legacy single-name path for invites without prefill.
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("errors.name_required"));
      return;
    }
    startTransition(async () => {
      const result = await acceptInvitation(token, trimmed);
      if (!result.success) {
        toast.error(result.error || t("errors.accept_failed"));
        return;
      }
      toast.success(t("accepted_toast"));
      await signIn("email", { email, callbackUrl: "/overview" });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">
          {t("email_label")}
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          readOnly
          className="bg-white text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-xs text-white/60">{t("email_hint")}</p>
      </div>

      {hasPrefill ? (
        <>
          <div className="rounded-md border border-white/25 bg-white/10 px-3 py-2 text-xs text-white/80">
            {t("prefill_notice")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-white">
                {t("first_name_label")}
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("first_name_placeholder")}
                disabled={isPending}
                required
                autoFocus
                className="bg-white text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-white">
                {t("last_name_label")}
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("last_name_placeholder")}
                disabled={isPending}
                required
                className="bg-white text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white">{t("phone_label")}</Label>
            <PhoneInput
              international
              defaultCountry="CO"
              value={phone || undefined}
              onChange={(v) => setPhone(v ?? "")}
              className="phone-input"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle" className="text-white">
              {t("job_title_label")}
            </Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t("job_title_placeholder")}
              disabled={isPending}
              className="bg-white text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white">
            {t("name_label")}
          </Label>
          <Input
            id="name"
            type="text"
            placeholder={t("name_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            autoFocus
            required
            className="bg-white text-foreground placeholder:text-muted-foreground"
          />
        </div>
      )}

      <Button
        type="submit"
        // Same white-on-purple CTA pattern as login / signup.
        className="w-full bg-white text-primary shadow-sm hover:bg-white/90"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        {t("submit")}
      </Button>

      <p className="text-center text-xs text-white/60">{t("submit_hint")}</p>
    </form>
  );
}
