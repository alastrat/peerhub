import Link from "next/link";
import Image from "next/image";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { getInvitationByToken } from "@/lib/actions/invitations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";
import { InviteSignedInAccept } from "@/components/auth/invite-signed-in-accept";
import { AuthCarousel } from "@/components/auth/auth-carousel";
import type { CompanyRole } from "@prisma/client";

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Two-panel shell that matches the login / signup layout: purple form
 * column on the left with the Kultiva logo + footer, white carousel
 * column on the right. The actual invite state (form, error, success)
 * renders inside the left column via `children`.
 */
function InviteShell({
  children,
  termsLabel,
  privacyLabel,
  copyrightLabel,
}: {
  children: React.ReactNode;
  termsLabel: string;
  privacyLabel: string;
  copyrightLabel: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT — purple panel */}
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
              width={280}
              height={115}
              className="h-16 w-auto"
              priority
            />
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/60 sm:px-10">
          <span>{copyrightLabel}</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white">
              {termsLabel}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-white">
              {privacyLabel}
            </Link>
          </div>
        </footer>
      </div>

      {/* RIGHT — white carousel */}
      <AuthCarousel />
    </div>
  );
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const [result, session] = await Promise.all([
    getInvitationByToken(token),
    auth(),
  ]);

  // If we got an invitation we can resolve copy in the company's locale;
  // otherwise fall back to the request locale. next-intl's
  // getTranslations / getMessages typings reject `locale: undefined`, so
  // call the no-arg overloads when we don't have one to pass.
  const locale =
    result.success && result.data ? result.data.companyLocale : undefined;
  const [t, tLogin, messages] = await Promise.all([
    locale
      ? getTranslations({ locale, namespace: "auth.invite" })
      : getTranslations("auth.invite"),
    locale
      ? getTranslations({ locale, namespace: "auth.login" })
      : getTranslations("auth.login"),
    locale ? getMessages({ locale }) : getMessages(),
  ]);
  const year = new Date().getFullYear();

  const shellFooter = {
    termsLabel: tLogin("footer.terms"),
    privacyLabel: tLogin("footer.privacy"),
    copyrightLabel: tLogin("footer.copyright", { year }),
  };

  // ---- Token not found ----------------------------------------------
  if (!result.success || !result.data) {
    return (
      <InviteShell {...shellFooter}>
        <ErrorPanel
          icon={<AlertCircle className="h-8 w-8 text-red-300" />}
          tone="error"
          title={t("not_found_title")}
          description={t("not_found_description")}
          cta={
            <Link href="/login">
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                {t("go_to_login")}
              </Button>
            </Link>
          }
        />
      </InviteShell>
    );
  }

  const invitation = result.data;

  // ---- Already accepted ---------------------------------------------
  if (invitation.acceptedAt) {
    return (
      <InviteShell {...shellFooter}>
        <ErrorPanel
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-300" />}
          tone="success"
          title={t("already_accepted_title")}
          description={t.rich("already_accepted_description", {
            company: invitation.companyName,
            strong: (chunks) => <strong className="text-white">{chunks}</strong>,
          })}
          cta={
            <Link href="/login?callbackUrl=/overview">
              <Button className="bg-white text-primary hover:bg-white/90">
                {t("sign_in")}
              </Button>
            </Link>
          }
        />
      </InviteShell>
    );
  }

  // ---- Expired ------------------------------------------------------
  if (invitation.isExpired) {
    return (
      <InviteShell {...shellFooter}>
        <ErrorPanel
          icon={<AlertCircle className="h-8 w-8 text-red-300" />}
          tone="error"
          title={t("expired_title")}
          description={t.rich("expired_description", {
            company: invitation.companyName,
            strong: (chunks) => <strong className="text-white">{chunks}</strong>,
          })}
          cta={
            <Link href="/login">
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                {t("go_to_login")}
              </Button>
            </Link>
          }
        />
      </InviteShell>
    );
  }

  // ---- Signed in flow -----------------------------------------------
  if (session?.user?.email) {
    const sessionEmail = session.user.email.toLowerCase();
    const invitationEmail = invitation.email.toLowerCase();

    if (sessionEmail !== invitationEmail) {
      return (
        <InviteShell {...shellFooter}>
          <ErrorPanel
            icon={<AlertCircle className="h-8 w-8 text-amber-300" />}
            tone="warning"
            title={t("wrong_account_title")}
            description={t.rich("wrong_account_description", {
              invitedEmail: invitation.email,
              currentEmail: session.user.email,
              strong: (chunks) => <strong className="text-white">{chunks}</strong>,
            })}
            cta={
              <Link href="/api/auth/signout">
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  {t("sign_out")}
                </Button>
              </Link>
            }
          />
        </InviteShell>
      );
    }

    // Matching email — one-click accept (client component lives inside
    // the shell + intl provider so it inherits the company's locale).
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <InviteShell {...shellFooter}>
          <InviteSignedInAccept
            token={token}
            companyName={invitation.companyName}
            role={localizedRoleLabel(invitation.role, locale ?? "es")}
            departmentName={invitation.departmentName}
          />
        </InviteShell>
      </NextIntlClientProvider>
    );
  }

  // ---- Not signed in — accept form ----------------------------------
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <InviteShell {...shellFooter}>
        <div className="space-y-7">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {t("accept_title", { company: invitation.companyName })}
            </h1>
            <p className="text-sm text-white/75">
              {t("accept_subtitle_role")}{" "}
              <Badge
                variant="secondary"
                className="bg-white/15 text-white hover:bg-white/15"
              >
                {localizedRoleLabel(invitation.role, locale ?? "es")}
              </Badge>
              {invitation.departmentName && (
                <>
                  {" "}
                  {t("accept_subtitle_in")}{" "}
                  <strong className="text-white">
                    {invitation.departmentName}
                  </strong>
                </>
              )}
            </p>
          </div>

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
        </div>
      </InviteShell>
    </NextIntlClientProvider>
  );
}

/** Status-style panel used for the error / accepted / expired / wrong-
 *  account states. Lives inside the purple LEFT column, so its colors
 *  flip relative to the original card-on-white version. */
function ErrorPanel({
  icon,
  tone,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  tone: "error" | "success" | "warning";
  title: string;
  description: React.ReactNode;
  cta: React.ReactNode;
}) {
  const haloByTone = {
    error: "bg-red-500/15",
    success: "bg-emerald-500/15",
    warning: "bg-amber-500/15",
  } as const;
  return (
    <div className="space-y-6 text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${haloByTone[tone]}`}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-white/80">{description}</p>
      </div>
      <div className="flex justify-center">{cta}</div>
    </div>
  );
}

/** ROLE_LABELS is hard-coded in English in src/lib/constants/roles.ts.
 *  Provide Spanish equivalents inline here so the invite badge respects
 *  the company's locale rather than the platform-default constant. */
function localizedRoleLabel(role: CompanyRole, locale: string): string {
  if (locale === "es") {
    return (
      { ADMIN: "Administrador", MANAGER: "Gerente", MEMBER: "Miembro" } as const
    )[role];
  }
  return ROLE_LABELS[role];
}
