"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCarousel } from "@/components/auth/auth-carousel";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const tLogin = useTranslations("auth.login");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn("email", { email, callbackUrl: "/onboarding" });
    } catch {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/onboarding" });
    } catch {
      setIsGoogleLoading(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT — purple sign-up form panel (mirrors login) */}
      <div
        className="relative flex flex-col overflow-hidden text-white"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #4c2459 0%, #613171 45%, #7a3e8c 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" aria-label="Kultiva home">
            <Image
              src="/logo-kultiva.png"
              alt="Kultiva"
              width={140}
              height={58}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm space-y-7">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {t("welcome_title")}
              </h1>
              <p className="text-sm text-white/75">{t("welcome_subtitle")}</p>
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  {t("email_label")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="bg-white text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-primary shadow-sm hover:bg-white/90"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {t("sign_up_email")}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-xs uppercase tracking-wider text-white/60">
                  {t("or_continue_with")}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
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
              {t("sign_up_google")}
            </Button>

            <p className="text-center text-xs text-white/65">
              {t.rich("terms_consent", {
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    className="text-white underline underline-offset-4 hover:text-white/90"
                  >
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    className="text-white underline underline-offset-4 hover:text-white/90"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>

            <p className="text-center text-sm text-white/70">
              {t("have_account")}{" "}
              <Link
                href="/login"
                className="font-medium text-white underline-offset-4 hover:underline"
              >
                {t("sign_in")}
              </Link>
            </p>
          </div>
        </main>

        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/60 sm:px-10">
          <span>{tLogin("footer.copyright", { year })}</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white">
              {tLogin("footer.terms")}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-white">
              {tLogin("footer.privacy")}
            </Link>
          </div>
        </footer>
      </div>

      <AuthCarousel />
    </div>
  );
}
