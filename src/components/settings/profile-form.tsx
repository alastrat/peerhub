"use client";

import { useState, useTransition } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/formatting";
import { updatePersonalInfo } from "@/lib/actions/platform";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    jobTitle: string | null;
    email: string;
    image: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const displayName =
    `${firstName} ${lastName}`.trim() || user.name || user.email;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await updatePersonalInfo({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone || "",
        jobTitle: jobTitle.trim() || "",
      });
      if (result.success) {
        setMessage({ type: "success", text: "Profile updated" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to update",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image || undefined} />
          <AvatarFallback className="text-lg">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">First name</label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Last name</label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Phone</label>
        <PhoneInput
          international
          defaultCountry="CO"
          value={phone || undefined}
          onChange={(v) => setPhone(v ?? "")}
          className="phone-input"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Job title</label>
        <Input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="People Operations Lead"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input value={user.email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
