"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Users,
  Plus,
  MoreHorizontal,
  Shield,
  UserMinus,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
  X,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils/formatting";
import {
  inviteMember,
  updateMemberRole,
  toggleMemberActive,
  removeMember,
  cancelInvitation,
  resendInvitation,
} from "@/lib/actions/platform";

const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  MEMBER: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

type Tab = "active" | "inactive" | "invited";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  title: string | null;
  department: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export function MembersTable({
  members: initialMembers,
  invitations: initialInvitations,
  companyId,
  currentUserId,
}: {
  members: Member[];
  invitations: Invitation[];
  companyId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.membersTable");
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "ADMIN" | "MANAGER" | "MEMBER"
  >("MEMBER");
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "activate" | "remove";
    member: Member;
  } | null>(null);

  const [roleChange, setRoleChange] = useState<{
    member: Member;
    newRole: "ADMIN" | "MANAGER" | "MEMBER";
  } | null>(null);

  // Counts
  const activeCount = members.filter((m) => m.isActive).length;
  const inactiveCount = members.filter((m) => !m.isActive).length;
  const invitedCount = invitations.length;

  // Filtered members by tab
  const tabMembers =
    tab === "active"
      ? members.filter((m) => m.isActive)
      : tab === "inactive"
        ? members.filter((m) => !m.isActive)
        : [];

  const filtered = tabMembers.filter((m) => {
    const matchesSearch =
      (m.name && m.name.toLowerCase().includes(search.toLowerCase())) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredInvitations =
    tab === "invited"
      ? invitations.filter(
          (inv) =>
            inv.email.toLowerCase().includes(search.toLowerCase()) &&
            (roleFilter === "all" || inv.role === roleFilter)
        )
      : [];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteSuccess(null);

    startTransition(async () => {
      const result = await inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        companyId,
      });
      if (result.success) {
        setInviteSuccess(t("invitationSentTo", { email: inviteEmail }));
        setInvitations((prev) => [
          {
            id: Date.now().toString(),
            email: inviteEmail.trim().toLowerCase(),
            role: inviteRole,
            expiresAt: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setInviteEmail("");
        setInviteRole("MEMBER");
      } else {
        setError(result.error || t("failedInvitation"));
      }
    });
  };

  const handleRoleChange = () => {
    if (!roleChange) return;
    setError(null);

    startTransition(async () => {
      const result = await updateMemberRole({
        companyUserId: roleChange.member.id,
        role: roleChange.newRole,
      });
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === roleChange.member.id
              ? { ...m, role: roleChange.newRole }
              : m
          )
        );
      } else {
        setError(result.error || t("failedUpdateRole"));
      }
      setRoleChange(null);
    });
  };

  const handleToggleActive = () => {
    if (!confirmAction || confirmAction.type === "remove") return;
    const newActive = confirmAction.type === "activate";
    const memberId = confirmAction.member.id;
    setError(null);

    startTransition(async () => {
      const result = await toggleMemberActive({
        companyUserId: memberId,
        isActive: newActive,
      });
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, isActive: newActive } : m
          )
        );
      } else {
        setError(result.error || t("failedUpdateStatus"));
      }
      setConfirmAction(null);
    });
  };

  const handleRemove = () => {
    if (!confirmAction || confirmAction.type !== "remove") return;
    const memberId = confirmAction.member.id;
    setError(null);

    startTransition(async () => {
      const result = await removeMember(memberId);
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        setError(result.error || t("failedRemove"));
      }
      setConfirmAction(null);
    });
  };

  const handleCancelInvite = (invId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await cancelInvitation(invId);
      if (result.success) {
        setInvitations((prev) => prev.filter((i) => i.id !== invId));
      } else {
        setError(result.error || t("failedCancel"));
      }
    });
  };

  const handleResendInvite = (invId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await resendInvitation(invId);
      if (!result.success) {
        setError(result.error || t("failedResend"));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {(
          [
            { key: "active", label: t("active"), count: activeCount },
            { key: "inactive", label: t("inactive"), count: inactiveCount },
            { key: "invited", label: t("invited"), count: invitedCount },
          ] as const
        ).map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabItem.label}
            {tabItem.count > 0 && (
              <span
                className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                  tab === tabItem.key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tabItem.count}
              </span>
            )}
            {tab === tabItem.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                tab === "invited"
                  ? t("searchByEmail")
                  : t("searchMembers")
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("allRoles")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allRoles")}</SelectItem>
              <SelectItem value="ADMIN">{t("admin")}</SelectItem>
              <SelectItem value="MANAGER">{t("manager")}</SelectItem>
              <SelectItem value="MEMBER">{t("member")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open);
            if (!open) {
              setInviteSuccess(null);
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("inviteMember")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>{t("inviteTitle")}</DialogTitle>
                <DialogDescription>
                  {t("inviteDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("email")}</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t("emailPlaceholder")}
                      className="ps-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("role")}</label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "ADMIN" | "MANAGER" | "MEMBER")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">{t("member")}</SelectItem>
                      <SelectItem value="MANAGER">{t("manager")}</SelectItem>
                      <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteSuccess && (
                  <p className="text-sm text-green-600">{inviteSuccess}</p>
                )}
                {error && inviteOpen && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || !inviteEmail.trim()}
                >
                  {isPending ? t("sending") : t("sendInvitation")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !inviteOpen && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Members table (active/inactive tabs) */}
      {tab !== "invited" && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="!bg-muted/50">
                <TableHead>{t("memberHeader")}</TableHead>
                <TableHead>{t("roleHeader")}</TableHead>
                <TableHead>{t("titleHeader")}</TableHead>
                <TableHead>{t("departmentHeader")}</TableHead>
                <TableHead>{t("statusHeader")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {search || roleFilter !== "all"
                        ? t("noMatchFilters")
                        : tab === "inactive"
                          ? t("noInactiveMembers")
                          : t("noMembersYet")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => {
                  const isSelf = m.userId === currentUserId;
                  return (
                    <TableRow
                      key={m.id}
                      className="!bg-white hover:!bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/settings/company/members/${m.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {m.name ? getInitials(m.name) : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {m.name || t("noName")}
                              {isSelf && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  {t("you")}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            ROLE_BADGE_STYLES[m.role] ||
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.title || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.department || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.isActive ? "default" : "secondary"}
                          className={
                            m.isActive
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-gray-100 text-gray-500"
                          }
                        >
                          {m.isActive ? t("activeStatus") : t("inactiveStatus")}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isPending}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t("actionsLabel")}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {m.role !== "ADMIN" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setRoleChange({
                                      member: m,
                                      newRole: "ADMIN",
                                    })
                                  }
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {t("makeAdmin")}
                                </DropdownMenuItem>
                              )}
                              {m.role !== "MANAGER" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setRoleChange({
                                      member: m,
                                      newRole: "MANAGER",
                                    })
                                  }
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {t("makeManager")}
                                </DropdownMenuItem>
                              )}
                              {m.role !== "MEMBER" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setRoleChange({
                                      member: m,
                                      newRole: "MEMBER",
                                    })
                                  }
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  {t("makeMember")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {m.isActive ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "deactivate",
                                      member: m,
                                    })
                                  }
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  {t("deactivate")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "activate",
                                      member: m,
                                    })
                                  }
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  {t("activate")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setConfirmAction({
                                    type: "remove",
                                    member: m,
                                  })
                                }
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                {t("remove")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invitations table */}
      {tab === "invited" && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="!bg-muted/50">
                <TableHead>{t("emailHeader")}</TableHead>
                <TableHead>{t("roleHeader")}</TableHead>
                <TableHead>{t("sentHeader")}</TableHead>
                <TableHead>{t("expiresHeader")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {search || roleFilter !== "all"
                        ? t("noInvitationsMatch")
                        : t("noPendingInvitations")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvitations.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  return (
                    <TableRow
                      key={inv.id}
                      className="!bg-white hover:!bg-gray-50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm">{inv.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            ROLE_BADGE_STYLES[inv.role] ||
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <Clock className="mr-1 h-3 w-3" />
                            {t("expired")}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleResendInvite(inv.id)}
                            disabled={isPending}
                            title={t("resendInvitation")}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleCancelInvite(inv.id)}
                            disabled={isPending}
                            title={t("cancelInvitation")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {tab === "invited"
          ? t("pendingInvitations", { count: filteredInvitations.length, plural: filteredInvitations.length !== 1 ? "s" : "" })
          : t("memberCount", { count: filtered.length, total: tab === "active" ? activeCount : inactiveCount, tab })}
      </p>

      {/* Role change confirm */}
      <AlertDialog
        open={!!roleChange}
        onOpenChange={(open) => !open && setRoleChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("changeRoleTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("changeRoleDescription", {
                name: roleChange?.member.name || roleChange?.member.email || "",
                currentRole: roleChange?.member.role || "",
                newRole: roleChange?.newRole || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              {t("changeRole")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate/Deactivate/Remove confirm */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "remove"
                ? t("removeMemberTitle")
                : confirmAction?.type === "deactivate"
                  ? t("deactivateMemberTitle")
                  : t("activateMemberTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "remove"
                ? t("removeDescription", { name: confirmAction.member.name || confirmAction.member.email })
                : confirmAction?.type === "deactivate"
                  ? t("deactivateDescription", { name: confirmAction.member.name || confirmAction.member.email })
                  : t("activateDescription", { name: confirmAction?.member.name || confirmAction?.member.email || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                confirmAction?.type === "remove"
                  ? handleRemove
                  : handleToggleActive
              }
              className={
                confirmAction?.type === "remove"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {confirmAction?.type === "remove"
                ? t("remove")
                : confirmAction?.type === "deactivate"
                  ? t("deactivate")
                  : t("activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
