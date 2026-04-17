"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation } from "@/lib/actions/invitations";

interface InviteAcceptFormProps {
  token: string;
  email: string;
}

export function InviteAcceptForm({ token, email }: InviteAcceptFormProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

      // Trigger magic link sign-in. NextAuth redirects to /auth/verify-request.
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
