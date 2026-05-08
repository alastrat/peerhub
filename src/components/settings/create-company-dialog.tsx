"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  checkUserExistsByEmail,
  createPlatformCompanyWithAdmin,
} from "@/lib/actions/platform";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

const autoSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCompanyDialogProps) {
  const t = useTranslations("dashboard.platform_companies");
  const [isPending, startTransition] = useTransition();

  // Company fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset all fields when the dialog closes so the next open is clean.
  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
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
      setAdvancedOpen(false);
      setError(null);
    }
  }, [open]);

  // Debounced pre-flight check: does this email already have a Kultiva account?
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

  const formValid =
    name.trim().length >= 2 &&
    slug.trim().length >= 2 &&
    /^[a-z0-9-]+$/.test(slug.trim()) &&
    adminFirstName.trim().length > 0 &&
    adminLastName.trim().length > 0 &&
    adminEmail.trim().includes("@");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPlatformCompanyWithAdmin({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
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
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{t("dialog_title")}</DialogTitle>
            <DialogDescription>{t("dialog_description")}</DialogDescription>
          </DialogHeader>

          {/* === SECTION: Empresa === */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("section_company")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="cc-name" className="text-sm font-medium">
                  {t("field_name")}
                </label>
                <Input
                  id="cc-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(autoSlug(e.target.value));
                  }}
                  placeholder={t("field_name_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cc-slug" className="text-sm font-medium">
                  {t("field_slug")}
                </label>
                <Input
                  id="cc-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme-corp"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cc-logo" className="text-sm font-medium">
                {t("field_logo")}
              </label>
              <Input
                id="cc-logo"
                type="url"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cc-domain" className="text-sm font-medium">
                {t("field_domain")}
              </label>
              <Input
                id="cc-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="acme.com"
              />
              <p className="text-xs text-muted-foreground">
                {t("field_domain_hint")}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">{t("section_features")}</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FeatureCheckbox
                  id="feat-workenv"
                  label={t("feature_work_env")}
                  checked={featureWorkEnv}
                  onCheckedChange={setFeatureWorkEnv}
                />
                <FeatureCheckbox
                  id="feat-ats"
                  label={t("feature_ats")}
                  checked={featureAts}
                  onCheckedChange={setFeatureAts}
                />
                <FeatureCheckbox
                  id="feat-onboarding"
                  label={t("feature_onboarding")}
                  checked={featureOnboarding}
                  onCheckedChange={setFeatureOnboarding}
                />
                <FeatureCheckbox
                  id="feat-hubs"
                  label={t("feature_hubs")}
                  checked={featureHubs}
                  onCheckedChange={setFeatureHubs}
                />
              </div>
            </div>
          </section>

          {/* === SECTION: Administrador === */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("section_admin")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="cc-admin-first" className="text-sm font-medium">
                  {t("field_first_name")}
                </label>
                <Input
                  id="cc-admin-first"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Juana"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cc-admin-last" className="text-sm font-medium">
                  {t("field_last_name")}
                </label>
                <Input
                  id="cc-admin-last"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Pérez"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cc-admin-email" className="text-sm font-medium">
                {t("field_email")}
              </label>
              <Input
                id="cc-admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@acme.com"
              />
              {adminExists && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                  {t("admin_already_exists")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t("field_phone")}
                </label>
                <PhoneInput
                  international
                  defaultCountry="CO"
                  value={adminPhone || undefined}
                  onChange={(v) => setAdminPhone(v ?? "")}
                  className="phone-input"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cc-admin-job" className="text-sm font-medium">
                  {t("field_job_title")}
                </label>
                <Input
                  id="cc-admin-job"
                  value={adminJobTitle}
                  onChange={(e) => setAdminJobTitle(e.target.value)}
                  placeholder="People Operations Lead"
                />
              </div>
            </div>
          </section>

          {/* === SECTION: Opciones avanzadas === */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/60"
              >
                <span>{t("section_advanced")}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="cc-locale" className="text-sm font-medium">
                    {t("field_locale")}
                  </label>
                  <select
                    id="cc-locale"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as "es" | "en")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cc-color" className="text-sm font-medium">
                    {t("field_primary_color")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor || "#0066FF"}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
                    />
                    <Input
                      id="cc-color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#0066FF"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !formValid}>
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
