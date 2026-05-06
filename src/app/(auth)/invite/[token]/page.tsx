import Link from "next/link";
import { AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getInvitationByToken } from "@/lib/actions/invitations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";
import { InviteSignedInAccept } from "@/components/auth/invite-signed-in-accept";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const [result, session] = await Promise.all([
    getInvitationByToken(token),
    auth(),
  ]);

  // Token not found
  if (!result.success || !result.data) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Invitation not found</CardTitle>
          <CardDescription>
            This invitation link is invalid. It may have been deleted or the URL is
            incorrect.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const invitation = result.data;

  // Already accepted
  if (invitation.acceptedAt) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Already accepted</CardTitle>
          <CardDescription>
            This invitation to join <strong>{invitation.companyName}</strong> has
            already been accepted. Please sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href={`/login?callbackUrl=/overview`}>
            <Button>Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Expired
  if (invitation.isExpired) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Invitation expired</CardTitle>
          <CardDescription>
            Your invitation to join <strong>{invitation.companyName}</strong> has
            expired. Please ask the person who invited you to send a new
            invitation.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Already signed in
  if (session?.user?.email) {
    const sessionEmail = session.user.email.toLowerCase();
    const invitationEmail = invitation.email.toLowerCase();

    if (sessionEmail !== invitationEmail) {
      return (
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Signed in as a different account</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invitation.email}</strong>, but
              you&apos;re currently signed in as <strong>{session.user.email}</strong>.
              Please sign out and try again from the invitation link.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-2">
            <Link href="/api/auth/signout">
              <Button variant="outline">Sign out</Button>
            </Link>
          </CardFooter>
        </Card>
      );
    }

    // Signed in with matching email — one-click accept
    return (
      <InviteSignedInAccept
        token={token}
        companyName={invitation.companyName}
        role={ROLE_LABELS[invitation.role]}
        departmentName={invitation.departmentName}
      />
    );
  }

  // Not signed in — show accept form
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">
          You&apos;re invited to join {invitation.companyName}
        </CardTitle>
        <CardDescription>
          You&apos;ve been invited as{" "}
          <Badge variant="secondary">{ROLE_LABELS[invitation.role]}</Badge>
          {invitation.departmentName && (
            <>
              {" in "}
              <strong>{invitation.departmentName}</strong>
            </>
          )}
          {invitation.hubName && (
            <>
              {" ("}
              <strong>{invitation.hubName}</strong>
              {")"}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InviteAcceptForm
          token={token}
          email={invitation.email}
          prefilled={{
            firstName: invitation.inviteeFirstName,
            lastName: invitation.inviteeLastName,
            phone: invitation.inviteePhone,
            jobTitle: invitation.inviteeJobTitle,
          }}
        />
      </CardContent>
    </Card>
  );
}
