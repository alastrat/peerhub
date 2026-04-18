"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { acceptInvitation } from "@/lib/actions/invitations";

interface InviteSignedInAcceptProps {
  token: string;
  companyName: string;
  role: string;
  departmentName: string | null;
}

export function InviteSignedInAccept({
  token,
  companyName,
  role,
  departmentName,
}: InviteSignedInAcceptProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      // We pass an empty name — the server action uses email-prefix fallback,
      // but since the user already exists we won't overwrite their name.
      const result = await acceptInvitation(token, "");
      if (!result.success) {
        toast.error(result.error || "Could not accept the invitation");
        return;
      }
      toast.success(`Welcome to ${companyName}!`);
      router.push("/overview");
      router.refresh();
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Join {companyName}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as <Badge variant="secondary">{role}</Badge>
          {departmentName && (
            <>
              {" in "}
              <strong>{departmentName}</strong>
            </>
          )}
          . You&apos;re already signed in, so you can accept in one click.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>
          After accepting, you&apos;ll be able to switch to this company from the
          dashboard.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={handleAccept} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Accept invitation
        </Button>
      </CardFooter>
    </Card>
  );
}
