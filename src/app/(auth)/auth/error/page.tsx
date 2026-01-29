"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign-in link has expired or has already been used.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from the OAuth provider.",
  OAuthCreateAccount: "Could not create OAuth provider user in the database.",
  EmailCreateAccount: "Could not create email provider user in the database.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "This email is already associated with another account.",
  EmailSignin: "Could not send the email verification link.",
  CredentialsSignin: "The credentials you provided are invalid.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An error occurred during authentication.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/login">
          <Button>Try Again</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function AuthErrorFallback() {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
