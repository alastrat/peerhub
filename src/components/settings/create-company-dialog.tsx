"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  checkUserExistsByEmail,
  createPlatformCompanyWithAdmin,
  uploadCompanyLogo,
} from "@/lib/actions/platform";

// Client-side constraints — mirrored on the server in uploadCompanyLogo.
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const LOGO_ACCEPT_MIME = "image/png,image/jpeg,image/svg+xml,image/webp";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

const STEP_KEYS = [
  "company",
  "features",
  "admin",
  "review",
] as const;
type StepKey = (typeof STEP_KEYS)[number];

const autoSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

const TAX_ID_RE = /^[A-Za-z0-9.\-/ ]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCompanyDialogProps) {
  const t = useTranslations("dashboard.platform_companies");
  const [isPending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);

  // Company fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [taxId, setTaxId] = useState("");
  const [logo, setLogo] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [locale, setLocale] = useState<"es" | "en">("es");
  const [featureAts, setFeatureAts] = useState(false);
  const [featureOnboarding, setFeatureOnboarding] = useState(false);
  const [featureWorkEnv, setFeatureWorkEnv] = useState(true);
  const [featureHubs, setFeatureHubs] = useState(false);

  // Admin fields
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminJobTitle, setAdminJobTitle] = useState("");

  const [adminExists, setAdminExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file fires onChange again.
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    if (!file) return;

    if (file.size > LOGO_MAX_BYTES) {
      toast.error(t("wizard.logo_too_large"));
      return;
    }
    if (!LOGO_ACCEPT_MIME.split(",").includes(file.type)) {
      toast.error(t("wizard.logo_unsupported_type"));
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadCompanyLogo(formData);
      if (!result.success || !result.data) {
        toast.error(result.error || t("wizard.logo_upload_failed"));
        return;
      }
      setLogo(result.data.url);
      toast.success(t("wizard.logo_uploaded"));
    } catch {
      toast.error(t("wizard.logo_upload_failed"));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setName("");
      setSlug("");
      setTaxId("");
      setLogo("");
      setDomain("");
      setPrimaryColor("");
      setLocale("es");
      setFeatureAts(false);
      setFeatureOnboarding(false);
      setFeatureWorkEnv(true);
      setFeatureHubs(false);
      setAdminFirstName("");
      setAdminLastName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminJobTitle("");
      setAdminExists(false);
      setError(null);
      setIsUploadingLogo(false);
    }
  }, [open]);

  // Debounced pre-flight: is this email already a Kultiva user?
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const cleaned = adminEmail.trim().toLowerCase();
    if (!cleaned.includes("@") || !cleaned.includes(".")) {
      setAdminExists(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await checkUserExistsByEmail(cleaned);
      if (res.success) setAdminExists(res.data?.exists ?? false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [adminEmail]);

  // Per-step validity
  const stepValid: Record<StepKey, boolean> = {
    company:
      name.trim().length >= 2 &&
      slug.trim().length >= 2 &&
      SLUG_RE.test(slug.trim()) &&
      taxId.trim().length >= 5 &&
      TAX_ID_RE.test(taxId.trim()),
    features: true,
    admin:
      adminFirstName.trim().length > 0 &&
      adminLastName.trim().length > 0 &&
      adminEmail.trim().includes("@"),
    review: true,
  };

  const currentStep = STEP_KEYS[stepIndex];
  const isLastStep = stepIndex === STEP_KEYS.length - 1;
  const canAdvance = stepValid[currentStep];
  const canSubmit = STEP_KEYS.every((k) => stepValid[k]);

  const handleNext = () => {
    if (!canAdvance) return;
    setStepIndex((i) => Math.min(i + 1, STEP_KEYS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPlatformCompanyWithAdmin({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        taxId: taxId.trim(),
        logo: logo.trim(),
        domain: domain.trim().toLowerCase(),
        primaryColor: primaryColor.trim(),
        locale,
        featureAts,
        featureOnboarding,
        featureWorkEnv,
        featureHubs,
        admin: {
          firstName: adminFirstName.trim(),
          lastName: adminLastName.trim(),
          email: adminEmail.trim().toLowerCase(),
          phone: adminPhone || "",
          jobTitle: adminJobTitle.trim(),
        },
      });

      if (result.success && result.data) {
        toast.success(t("toast_created", { email: adminEmail.trim() }));
        onCreated?.(result.data.id);
        onOpenChange(false);
      } else {
        setError(result.error || t("toast_error"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-5xl overflow-y-auto p-0">
        <div className="space-y-6 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>{t("dialog_title")}</DialogTitle>
            <DialogDescription>{t("dialog_description")}</DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <Stepper
            current={stepIndex}
            labels={STEP_KEYS.map((k) => t(`wizard.step_${k}`))}
          />

          {/* Two-column body */}
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border bg-card p-5">
              {currentStep === "company" && (
                <CompanySection
                  t={t}
                  name={name}
                  slug={slug}
                  taxId={taxId}
                  domain={domain}
                  onName={(v) => {
                    setName(v);
                    setSlug(autoSlug(v));
                  }}
                  onSlug={setSlug}
                  onTaxId={setTaxId}
                  onDomain={setDomain}
                />
              )}

              {currentStep === "features" && (
                <FeaturesSection
                  t={t}
                  featureAts={featureAts}
                  featureOnboarding={featureOnboarding}
                  featureWorkEnv={featureWorkEnv}
                  featureHubs={featureHubs}
                  logo={logo}
                  primaryColor={primaryColor}
                  locale={locale}
                  isUploadingLogo={isUploadingLogo}
                  logoFileInputRef={logoFileInputRef}
                  onFeatureAts={setFeatureAts}
                  onFeatureOnboarding={setFeatureOnboarding}
                  onFeatureWorkEnv={setFeatureWorkEnv}
                  onFeatureHubs={setFeatureHubs}
                  onLogoFileChange={handleLogoFileChange}
                  onLogoClear={() => setLogo("")}
                  onPrimaryColor={setPrimaryColor}
                  onLocale={setLocale}
                />
              )}

              {currentStep === "admin" && (
                <AdminSection
                  t={t}
                  adminFirstName={adminFirstName}
                  adminLastName={adminLastName}
                  adminEmail={adminEmail}
                  adminPhone={adminPhone}
                  adminJobTitle={adminJobTitle}
                  adminExists={adminExists}
                  onAdminFirstName={setAdminFirstName}
                  onAdminLastName={setAdminLastName}
                  onAdminEmail={setAdminEmail}
                  onAdminPhone={setAdminPhone}
                  onAdminJobTitle={setAdminJobTitle}
                />
              )}

              {currentStep === "review" && (
                <ReviewSection
                  t={t}
                  name={name}
                  slug={slug}
                  taxId={taxId}
                  domain={domain}
                  logo={logo}
                  primaryColor={primaryColor}
                  locale={locale}
                  featureAts={featureAts}
                  featureOnboarding={featureOnboarding}
                  featureWorkEnv={featureWorkEnv}
                  featureHubs={featureHubs}
                  adminFirstName={adminFirstName}
                  adminLastName={adminLastName}
                  adminEmail={adminEmail}
                  adminPhone={adminPhone}
                  adminJobTitle={adminJobTitle}
                />
              )}
            </div>

            {/* Right side: About panel with illustration */}
            <aside className="hidden lg:flex flex-col gap-4 rounded-xl border bg-muted/30 p-5">
              <div>
                <h4 className="text-lg font-semibold">
                  {t(`wizard.about_${currentStep}_title`)}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`wizard.about_${currentStep}_body`)}
                </p>
              </div>
              <div className="mt-auto flex items-end justify-center pt-4">
                <CityIllustration className="h-auto w-full max-w-[260px]" />
              </div>
            </aside>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("wizard.back")}
                </Button>
              )}
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance}
                >
                  {t("wizard.continue")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || !canSubmit}
                >
                  {isPending ? t("submitting") : t("submit")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Stepper

function Stepper({
  current,
  labels,
}: {
  current: number;
  labels: string[];
}) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-sm">
      {labels.map((label, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <li key={label} className="flex items-center">
            <span
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "ml-2 font-medium",
                isActive
                  ? "text-foreground"
                  : isDone
                    ? "text-primary"
                    : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <span
                className={cn(
                  "mx-3 hidden h-px w-8 sm:inline-block",
                  isDone ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Step sections

type TFn = ReturnType<typeof useTranslations>;

function CompanySection({
  t,
  name,
  slug,
  taxId,
  domain,
  onName,
  onSlug,
  onTaxId,
  onDomain,
}: {
  t: TFn;
  name: string;
  slug: string;
  taxId: string;
  domain: string;
  onName: (v: string) => void;
  onSlug: (v: string) => void;
  onTaxId: (v: string) => void;
  onDomain: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {t("section_company")}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="cc-name" label={t("field_name")}>
          <Input
            id="cc-name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={t("field_name_placeholder")}
          />
        </Field>
        <Field id="cc-slug" label={t("field_slug")}>
          <Input
            id="cc-slug"
            value={slug}
            onChange={(e) => onSlug(e.target.value)}
            placeholder="acme-corp"
          />
        </Field>
      </div>
      <Field id="cc-tax-id" label={t("field_tax_id")} hint={t("field_tax_id_hint")}>
        <Input
          id="cc-tax-id"
          value={taxId}
          onChange={(e) => onTaxId(e.target.value)}
          placeholder={t("field_tax_id_placeholder")}
          required
        />
      </Field>
      <Field id="cc-domain" label={t("field_domain")} hint={t("field_domain_hint")}>
        <Input
          id="cc-domain"
          value={domain}
          onChange={(e) => onDomain(e.target.value)}
          placeholder="acme.com"
        />
      </Field>
    </div>
  );
}

function FeaturesSection({
  t,
  featureAts,
  featureOnboarding,
  featureWorkEnv,
  featureHubs,
  logo,
  primaryColor,
  locale,
  isUploadingLogo,
  logoFileInputRef,
  onFeatureAts,
  onFeatureOnboarding,
  onFeatureWorkEnv,
  onFeatureHubs,
  onLogoFileChange,
  onLogoClear,
  onPrimaryColor,
  onLocale,
}: {
  t: TFn;
  featureAts: boolean;
  featureOnboarding: boolean;
  featureWorkEnv: boolean;
  featureHubs: boolean;
  logo: string;
  primaryColor: string;
  locale: "es" | "en";
  isUploadingLogo: boolean;
  logoFileInputRef: React.RefObject<HTMLInputElement | null>;
  onFeatureAts: (v: boolean) => void;
  onFeatureOnboarding: (v: boolean) => void;
  onFeatureWorkEnv: (v: boolean) => void;
  onFeatureHubs: (v: boolean) => void;
  onLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoClear: () => void;
  onPrimaryColor: (v: string) => void;
  onLocale: (v: "es" | "en") => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("section_features")}
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FeatureCheckbox
            id="feat-workenv"
            label={t("feature_work_env")}
            checked={featureWorkEnv}
            onCheckedChange={onFeatureWorkEnv}
          />
          <FeatureCheckbox
            id="feat-ats"
            label={t("feature_ats")}
            checked={featureAts}
            onCheckedChange={onFeatureAts}
          />
          <FeatureCheckbox
            id="feat-onboarding"
            label={t("feature_onboarding")}
            checked={featureOnboarding}
            onCheckedChange={onFeatureOnboarding}
          />
          <FeatureCheckbox
            id="feat-hubs"
            label={t("feature_hubs")}
            checked={featureHubs}
            onCheckedChange={onFeatureHubs}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("section_advanced")}
        </h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("field_logo")}</label>
          <div className="flex items-center gap-3">
            {logo ? (
              <Image
                src={logo}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-lg border object-contain p-1"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept={LOGO_ACCEPT_MIME}
                  onChange={onLogoFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploadingLogo
                    ? t("wizard.logo_uploading")
                    : logo
                      ? t("wizard.logo_replace")
                      : t("wizard.logo_upload")}
                </Button>
                {logo && !isUploadingLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onLogoClear}
                    className="text-muted-foreground"
                  >
                    <X className="mr-1 h-4 w-4" />
                    {t("wizard.logo_remove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("wizard.logo_hint")}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="cc-locale" label={t("field_locale")}>
            <select
              id="cc-locale"
              value={locale}
              onChange={(e) => onLocale(e.target.value as "es" | "en")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field id="cc-color" label={t("field_primary_color")}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor || "#0066FF"}
                onChange={(e) => onPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
              />
              <Input
                id="cc-color"
                value={primaryColor}
                onChange={(e) => onPrimaryColor(e.target.value)}
                placeholder="#0066FF"
                className="font-mono text-xs"
              />
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}

function AdminSection({
  t,
  adminFirstName,
  adminLastName,
  adminEmail,
  adminPhone,
  adminJobTitle,
  adminExists,
  onAdminFirstName,
  onAdminLastName,
  onAdminEmail,
  onAdminPhone,
  onAdminJobTitle,
}: {
  t: TFn;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  adminJobTitle: string;
  adminExists: boolean;
  onAdminFirstName: (v: string) => void;
  onAdminLastName: (v: string) => void;
  onAdminEmail: (v: string) => void;
  onAdminPhone: (v: string) => void;
  onAdminJobTitle: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {t("section_admin")}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="cc-admin-first" label={t("field_first_name")}>
          <Input
            id="cc-admin-first"
            value={adminFirstName}
            onChange={(e) => onAdminFirstName(e.target.value)}
            placeholder="Juana"
          />
        </Field>
        <Field id="cc-admin-last" label={t("field_last_name")}>
          <Input
            id="cc-admin-last"
            value={adminLastName}
            onChange={(e) => onAdminLastName(e.target.value)}
            placeholder="Pérez"
          />
        </Field>
      </div>
      <Field id="cc-admin-email" label={t("field_email")}>
        <Input
          id="cc-admin-email"
          type="email"
          value={adminEmail}
          onChange={(e) => onAdminEmail(e.target.value)}
          placeholder="admin@acme.com"
        />
        {adminExists && (
          <p className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            {t("admin_already_exists")}
          </p>
        )}
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("field_phone")}</label>
          <PhoneInput
            international
            defaultCountry="CO"
            value={adminPhone || undefined}
            onChange={(v) => onAdminPhone(v ?? "")}
            className="phone-input"
          />
        </div>
        <Field id="cc-admin-job" label={t("field_job_title")}>
          <Input
            id="cc-admin-job"
            value={adminJobTitle}
            onChange={(e) => onAdminJobTitle(e.target.value)}
            placeholder="People Operations Lead"
          />
        </Field>
      </div>
    </div>
  );
}

function ReviewSection({
  t,
  name,
  slug,
  taxId,
  domain,
  logo,
  primaryColor,
  locale,
  featureAts,
  featureOnboarding,
  featureWorkEnv,
  featureHubs,
  adminFirstName,
  adminLastName,
  adminEmail,
  adminPhone,
  adminJobTitle,
}: {
  t: TFn;
  name: string;
  slug: string;
  taxId: string;
  domain: string;
  logo: string;
  primaryColor: string;
  locale: "es" | "en";
  featureAts: boolean;
  featureOnboarding: boolean;
  featureWorkEnv: boolean;
  featureHubs: boolean;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  adminJobTitle: string;
}) {
  const enabledFeatures = [
    featureWorkEnv && t("feature_work_env"),
    featureAts && t("feature_ats"),
    featureOnboarding && t("feature_onboarding"),
    featureHubs && t("feature_hubs"),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <ReviewBlock title={t("wizard.review_company")}>
        <ReviewRow label={t("field_name")} value={name} />
        <ReviewRow label={t("field_slug")} value={slug} />
        <ReviewRow label={t("field_tax_id")} value={taxId} />
        {domain && <ReviewRow label={t("field_domain")} value={domain} />}
      </ReviewBlock>

      <ReviewBlock title={t("wizard.review_features")}>
        <p className="text-sm">
          {enabledFeatures.length > 0
            ? enabledFeatures.join(" · ")
            : t("wizard.review_none")}
        </p>
      </ReviewBlock>

      {(logo || primaryColor) && (
        <ReviewBlock title={t("wizard.review_branding")}>
          {logo && (
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t("field_logo")}</span>
              <Image
                src={logo}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 shrink-0 rounded border object-contain p-0.5"
              />
            </div>
          )}
          {primaryColor && (
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t("field_primary_color")}
              </span>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded border"
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="font-mono text-xs font-medium">
                  {primaryColor}
                </span>
              </span>
            </div>
          )}
          <ReviewRow
            label={t("field_locale")}
            value={locale === "es" ? "Español" : "English"}
          />
        </ReviewBlock>
      )}

      <ReviewBlock title={t("wizard.review_admin")}>
        <ReviewRow
          label={t("field_first_name") + " / " + t("field_last_name")}
          value={`${adminFirstName} ${adminLastName}`.trim()}
        />
        <ReviewRow label={t("field_email")} value={adminEmail} />
        {adminPhone && <ReviewRow label={t("field_phone")} value={adminPhone} />}
        {adminJobTitle && (
          <ReviewRow label={t("field_job_title")} value={adminJobTitle} />
        )}
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FeatureCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(!!v)}
      />
      <span>{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Illustration — brand-purple city skyline matching the reference

function CityIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Soft circle backdrop */}
      <circle cx="200" cy="80" r="60" fill="#613171" opacity="0.06" />
      <circle cx="240" cy="60" r="3" fill="#613171" opacity="0.25" />
      <circle cx="80" cy="40" r="2" fill="#613171" opacity="0.2" />
      <circle cx="290" cy="100" r="2" fill="#613171" opacity="0.2" />

      {/* Back row buildings (lighter) */}
      <rect x="40" y="100" width="42" height="100" rx="3" fill="#613171" opacity="0.18" />
      <rect x="240" y="110" width="44" height="90" rx="3" fill="#613171" opacity="0.18" />

      {/* Tall middle building with antenna */}
      <rect x="130" y="60" width="48" height="140" rx="3" fill="#613171" opacity="0.85" />
      <line x1="154" y1="60" x2="154" y2="40" stroke="#613171" strokeWidth="2" opacity="0.6" />
      <circle cx="154" cy="36" r="3" fill="#613171" opacity="0.85" />
      {/* Windows */}
      <g fill="#fff" opacity="0.85">
        <rect x="138" y="74" width="6" height="6" rx="1" />
        <rect x="150" y="74" width="6" height="6" rx="1" />
        <rect x="162" y="74" width="6" height="6" rx="1" />
        <rect x="138" y="90" width="6" height="6" rx="1" />
        <rect x="150" y="90" width="6" height="6" rx="1" />
        <rect x="162" y="90" width="6" height="6" rx="1" />
        <rect x="138" y="106" width="6" height="6" rx="1" />
        <rect x="150" y="106" width="6" height="6" rx="1" />
        <rect x="162" y="106" width="6" height="6" rx="1" />
        <rect x="138" y="122" width="6" height="6" rx="1" />
        <rect x="162" y="122" width="6" height="6" rx="1" />
        <rect x="138" y="138" width="6" height="6" rx="1" />
        <rect x="150" y="138" width="6" height="6" rx="1" />
        <rect x="162" y="138" width="6" height="6" rx="1" />
        <rect x="138" y="154" width="6" height="6" rx="1" />
        <rect x="150" y="154" width="6" height="6" rx="1" />
        <rect x="162" y="154" width="6" height="6" rx="1" />
        <rect x="138" y="170" width="6" height="6" rx="1" />
        <rect x="162" y="170" width="6" height="6" rx="1" />
      </g>

      {/* Left mid building */}
      <rect x="84" y="120" width="40" height="80" rx="3" fill="#613171" opacity="0.55" />
      <g fill="#fff" opacity="0.85">
        <rect x="92" y="130" width="5" height="5" rx="1" />
        <rect x="102" y="130" width="5" height="5" rx="1" />
        <rect x="112" y="130" width="5" height="5" rx="1" />
        <rect x="92" y="144" width="5" height="5" rx="1" />
        <rect x="102" y="144" width="5" height="5" rx="1" />
        <rect x="112" y="144" width="5" height="5" rx="1" />
        <rect x="92" y="158" width="5" height="5" rx="1" />
        <rect x="112" y="158" width="5" height="5" rx="1" />
        <rect x="92" y="172" width="5" height="5" rx="1" />
        <rect x="102" y="172" width="5" height="5" rx="1" />
        <rect x="112" y="172" width="5" height="5" rx="1" />
      </g>

      {/* Right shorter building */}
      <rect x="184" y="130" width="48" height="70" rx="3" fill="#613171" opacity="0.55" />
      <g fill="#fff" opacity="0.85">
        <rect x="192" y="140" width="5" height="5" rx="1" />
        <rect x="202" y="140" width="5" height="5" rx="1" />
        <rect x="212" y="140" width="5" height="5" rx="1" />
        <rect x="222" y="140" width="5" height="5" rx="1" />
        <rect x="192" y="154" width="5" height="5" rx="1" />
        <rect x="212" y="154" width="5" height="5" rx="1" />
        <rect x="222" y="154" width="5" height="5" rx="1" />
        <rect x="192" y="168" width="5" height="5" rx="1" />
        <rect x="202" y="168" width="5" height="5" rx="1" />
        <rect x="222" y="168" width="5" height="5" rx="1" />
        <rect x="192" y="182" width="5" height="5" rx="1" />
        <rect x="212" y="182" width="5" height="5" rx="1" />
      </g>

      {/* Small tree on the right */}
      <circle cx="270" cy="180" r="14" fill="#613171" opacity="0.35" />
      <rect x="267" y="190" width="6" height="14" fill="#613171" opacity="0.7" />

      {/* Ground line */}
      <line x1="20" y1="200" x2="300" y2="200" stroke="#613171" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}
