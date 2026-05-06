"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
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
        toast.error("Please enter your first and last name");
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
          toast.error(result.error || "Could not accept the invitation");
          return;
        }
        toast.success("Invitation accepted. Sending you a sign-in link...");
        await signIn("email", { email, callbackUrl: "/overview" });
      });
      return;
    }

    // Legacy single-name path for invites without prefill.
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter your name");
      return;
    }
    startTransition(async () => {
      const result = await acceptInvitation(token, trimmed);
      if (!result.success) {
        toast.error(result.error || "Could not accept the invitation");
        return;
      }
      toast.success("Invitation accepted. Sending you a sign-in link...");
      await signIn("email", { email, callbackUrl: "/overview" });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          This is the email that received the invitation.
        </p>
      </div>

      {hasPrefill ? (
        <>
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            We&apos;ve pre-filled some details based on your invitation. Review
            and edit before continuing.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                disabled={isPending}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                disabled={isPending}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
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
            <Label htmlFor="jobTitle">Job title (optional)</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="People Operations Lead"
              disabled={isPending}
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            autoFocus
            required
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Accept and sign in
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        After accepting, we&apos;ll email you a secure sign-in link. No password
        required.
      </p>
    </form>
  );
}
