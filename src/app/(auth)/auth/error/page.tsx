"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

// NextAuth's possible `error` query-param values. Kept in sync with the
// `errors.*` keys under auth.error_page in messages/{es,en}.json.
const KNOWN_ERRORS = [
  "Configuration",
  "AccessDenied",
  "Verification",
  "OAuthSignin",
  "OAuthCallback",
  "OAuthCreateAccount",
  "EmailCreateAccount",
  "Callback",
  "OAuthAccountNotLinked",
  "EmailSignin",
  "CredentialsSignin",
  "SessionRequired",
  "Default",
] as const;

type KnownError = (typeof KNOWN_ERRORS)[number];

function isKnownError(value: string): value is KnownError {
  return (KNOWN_ERRORS as readonly string[]).includes(value);
}

function AuthErrorContent() {
  const t = useTranslations("auth.error_page");
  const searchParams = useSearchParams();
  const raw = searchParams.get("error") || "Default";
  const key: KnownError = isKnownError(raw) ? raw : "Default";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t(`errors.${key}`)}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">{t("support_hint")}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button>{t("try_again")}</Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

function AuthErrorFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
