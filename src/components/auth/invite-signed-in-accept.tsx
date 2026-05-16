"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const t = useTranslations("auth.invite.signed_in");
  const tForm = useTranslations("auth.invite.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      // Empty name — server action falls back to the email-prefix, but
      // for an already-existing user it leaves the stored name alone.
      const result = await acceptInvitation(token, "");
      if (!result.success) {
        toast.error(result.error || tForm("errors.accept_failed"));
        return;
      }
      toast.success(t("welcome_toast", { company: companyName }));
      router.push("/overview");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {t("title", { company: companyName })}
        </h1>
        <p className="text-sm text-white/75">
          <Badge
            variant="secondary"
            className="bg-white/15 text-white hover:bg-white/15"
          >
            {role}
          </Badge>
          {departmentName && (
            <span>
              {t.rich("subtitle_in_dept", {
                department: departmentName,
                strong: (chunks) => (
                  <strong className="text-white">{chunks}</strong>
                ),
              })}
            </span>
          )}
          {t("subtitle_suffix")}
        </p>
      </div>

      <p className="text-sm text-white/70">{t("hint")}</p>

      <div className="flex justify-center">
        <Button
          onClick={handleAccept}
          disabled={isPending}
          className="bg-white text-primary hover:bg-white/90"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {t("accept_button")}
        </Button>
      </div>
    </div>
  );
}
