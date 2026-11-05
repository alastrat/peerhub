"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteCompany, setCompanyActive } from "@/lib/actions/platform";
import { getAvailableCompanies, switchCompany } from "@/lib/actions/company";

interface CompanyDangerZoneProps {
  company: { id: string; name: string; isActive: boolean; deactivatedAt: string | null };
}

/** Super admins only: deactivate, reactivate or permanently delete the current company. */
export function CompanyDangerZone({ company }: CompanyDangerZoneProps) {
  const t = useTranslations("dashboard.settings.danger_zone");
  const locale = useLocale();
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [confirmName, setConfirmName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function toggleActive() {
    startTransition(async () => {
      const result = await setCompanyActive(company.id, !company.isActive);
      if (!result.success) {
        toast.error(result.error ?? t("error"));
        return;
      }
      toast.success(company.isActive ? t("deactivated") : t("reactivated"));
      await update({});
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCompany(company.id, confirmName);
      if (!result.success) {
        toast.error(result.error ?? t("error"));
        return;
      }
      toast.success(t("deleted", { company: company.name }));
      setDeleteOpen(false);
      // Move to another company: the session still points at the deleted one
      const next = (await getAvailableCompanies()).find((c) => c.companyId !== company.id && c.isActive);
      if (next && (await switchCompany(next.companyId)).success) {
        await update({ companyId: next.companyId });
        router.push("/overview");
      } else {
        await update({});
        router.push("/settings/platform/companies");
      }
      router.refresh();
    });
  }

  const deactivatedOn = company.deactivatedAt
    ? new Date(company.deactivatedAt).toLocaleDateString(locale === "en" ? "en-US" : "es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card className="border-destructive/40 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {/* Deactivate / reactivate */}
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{company.isActive ? t("deactivate_title") : t("reactivate_title")}</p>
            <p className="text-sm text-muted-foreground">
              {company.isActive
                ? t("deactivate_desc")
                : deactivatedOn
                  ? t("inactive_since", { date: deactivatedOn })
                  : t("reactivate_desc")}
            </p>
          </div>
          {company.isActive ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="shrink-0" disabled={isPending}>
                  <PowerOff className="mr-1.5 h-4 w-4" />
                  {t("deactivate")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deactivate_confirm_title", { company: company.name })}</AlertDialogTitle>
                  <AlertDialogDescription>{t("deactivate_confirm_body")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={toggleActive}>{t("deactivate")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button className="shrink-0" onClick={toggleActive} disabled={isPending}>
              {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Power className="mr-1.5 h-4 w-4" />}
              {t("reactivate")}
            </Button>
          )}
        </div>

        {/* Delete */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("delete_title")}</p>
            <p className="text-sm text-muted-foreground">{t("delete_desc")}</p>
          </div>
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) setConfirmName("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="shrink-0" disabled={isPending}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("delete_confirm_title", { company: company.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t("delete_confirm_body")}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-company-name">{t("type_name", { company: company.name })}</Label>
                <Input
                  id="confirm-company-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  autoComplete="off"
                  disabled={isPending}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={remove}
                  disabled={isPending || confirmName.trim() !== company.name.trim()}
                >
                  {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t("delete_forever")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
