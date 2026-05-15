"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/design-system/logo";

function LoginContent() {
  const t = useTranslations("auth.login");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/overview";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn("email", { email, callbackUrl });
    } catch {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setIsGoogleLoading(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT — branded form panel */}
      <div className="flex flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" aria-label="Kultiva home">
            <Logo />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">
                {t("welcome_title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("welcome_subtitle")}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error === "OAuthAccountNotLinked"
                  ? t("errors.linked")
                  : t("errors.generic")}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email_label")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {t("sign_in_email")}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("or_continue_with")}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {t("sign_in_google")}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("no_account")}{" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                {t("sign_up")}
              </Link>
            </p>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:px-10">
          <span>{t("footer.copyright", { year })}</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground">
              {t("footer.terms")}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-foreground">
              {t("footer.privacy")}
            </Link>
          </div>
        </footer>
      </div>

      {/* RIGHT — purple showcase panel with stacked platform screenshots */}
      <div
        className="relative hidden flex-col overflow-hidden p-12 lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #4c2459 0%, #613171 45%, #7a3e8c 100%)",
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Floating dashboard preview composition */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="relative h-[520px] w-full max-w-xl">
            {/* Back card — full dashboard */}
            <div className="absolute right-0 top-0 w-[420px] -rotate-3 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <Image
                src="/images/platform/platform-dashboard.png"
                alt="Kultiva dashboard"
                width={840}
                height={560}
                className="h-auto w-full"
                priority
              />
            </div>

            {/* Middle card — climate results, offset down-left */}
            <div className="absolute left-0 top-32 w-[380px] rotate-2 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <Image
                src="/images/screenshots/climate-results.png"
                alt="Climate survey results"
                width={760}
                height={520}
                className="h-auto w-full"
              />
            </div>

            {/* Front card — analytics, foreground */}
            <div className="absolute bottom-0 right-10 w-[340px] -rotate-1 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <Image
                src="/images/screenshots/analytics-dashboard.png"
                alt="Analytics dashboard"
                width={680}
                height={460}
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        {/* Bottom tagline + Kultiva mark */}
        <div className="relative z-10 space-y-4 text-white">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <span className="text-xl font-bold">K</span>
          </div>
          <h2 className="text-3xl font-semibold leading-tight">
            {t("showcase.tagline_1")}
            <br />
            {t("showcase.tagline_2")}
          </h2>
          <p className="max-w-md text-sm text-white/80">
            {t("showcase.description")}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
