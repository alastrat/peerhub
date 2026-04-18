"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Mail,
  Building2,
  User,
  Calendar,
  Briefcase,
  Shield,
  MoreHorizontal,
  Users,
  ClipboardList,
  Send,
  UserCheck,
  UserX,
  UserMinus,
  Clock,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/utils/formatting";
import {
  updateMemberRole,
  toggleMemberActive,
  removeMember,
  updateMemberDetails,
} from "@/lib/actions/platform";

const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  MEMBER: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const CYCLE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  NOMINATION: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  CLOSED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

import { getCycleStatusLabel } from "@/lib/constants/cycle-status";

interface MemberData {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  roleConfigName: string | null;
  title: string | null;
  employeeId: string | null;
  departmentId: string | null;
  department: string | null;
  managerId: string | null;
  manager: { id: string; name: string | null } | null;
  directReports: {
    id: string;
    name: string | null;
    image: string | null;
    title: string | null;
    department: string | null;
  }[];
  startDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CycleParticipation {
  cycleId: string;
  cycleName: string;
  cycleStatus: string;
  startDate: string | null;
  endDate: string | null;
}

export function MemberDetail({
  member,
  stats,
  cycleParticipations,
  currentUserId,
  departments,
  otherMembers,
}: {
  member: MemberData;
  stats: {
    reviewsReceived: number;
    reviewsGiven: number;
    nominations: number;
    directReports: number;
  };
  cycleParticipations: CycleParticipation[];
  currentUserId: string;
  departments: { id: string; name: string }[];
  otherMembers: { id: string; name: string | null }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "deactivate" | "activate" | "remove" | null
  >(null);
  const [roleChange, setRoleChange] = useState<
    "ADMIN" | "MANAGER" | "MEMBER" | null
  >(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(member.title || "");
  const locale = useLocale();
  const [editEmployeeId, setEditEmployeeId] = useState(member.employeeId || "");
  const [editDepartmentId, setEditDepartmentId] = useState(member.departmentId || "none");
  const [editManagerId, setEditManagerId] = useState(member.managerId || "none");
  const [editStartDate, setEditStartDate] = useState(
    member.startDate ? new Date(member.startDate).toISOString().split("T")[0] : ""
  );

  const isSelf = member.userId === currentUserId;

  const handleSaveDetails = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberDetails({
        companyUserId: member.id,
        title: editTitle.trim() || null,
        employeeCode: editEmployeeId.trim() || null,
        departmentId: editDepartmentId !== "none" ? editDepartmentId : null,
        managerId: editManagerId !== "none" ? editManagerId : null,
        startDate: editStartDate || null,
      });
      if (result.success) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error || "Failed to save");
      }
    });
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditTitle(member.title || "");
    setEditEmployeeId(member.employeeId || "");
    setEditDepartmentId(member.departmentId || "none");
    setEditManagerId(member.managerId || "none");
    setEditStartDate(member.startDate ? new Date(member.startDate).toISOString().split("T")[0] : "");
    setError(null);
  };

  const handleRoleChange = () => {
    if (!roleChange) return;
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole({
        companyUserId: member.id,
        role: roleChange,
      });
      if (result.success) {
        setRoleChange(null);
        router.refresh();
      } else {
        setError(result.error || "Failed to update role");
        setRoleChange(null);
      }
    });
  };

  const handleToggleActive = () => {
    if (!confirmAction || confirmAction === "remove") return;
    setError(null);
    startTransition(async () => {
      const result = await toggleMemberActive({
        companyUserId: member.id,
        isActive: confirmAction === "activate",
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to update status");
      }
      setConfirmAction(null);
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeMember(member.id);
      if (result.success) {
        router.push("/settings/company/members");
      } else {
        setError(result.error || "Failed to remove member");
        setConfirmAction(null);
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Profile Sidebar */}
      <Card className="md:col-span-1 h-fit">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={member.image || undefined} />
              <AvatarFallback className="text-2xl">
                {member.name ? getInitials(member.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-semibold">
              {member.name || "No name"}
            </h2>
            <p className="text-muted-foreground">
              {member.title || "No title"}
            </p>
            <div className="mt-2 flex gap-2">
              <Badge className={ROLE_BADGE_STYLES[member.role] || "bg-gray-100 text-gray-700"}>
                {member.role}
              </Badge>
              <Badge
                className={
                  member.isActive
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-500"
                }
              >
                {member.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Actions dropdown */}
            {!isSelf && (
              <div className="mt-4 w-full">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <MoreHorizontal className="mr-1.5 h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                    {member.role !== "ADMIN" && (
                      <DropdownMenuItem onClick={() => setRoleChange("ADMIN")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    {member.role !== "MANAGER" && (
                      <DropdownMenuItem onClick={() => setRoleChange("MANAGER")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Make Manager
                      </DropdownMenuItem>
                    )}
                    {member.role !== "MEMBER" && (
                      <DropdownMenuItem onClick={() => setRoleChange("MEMBER")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Make Member
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {member.isActive ? (
                      <DropdownMenuItem onClick={() => setConfirmAction("deactivate")}>
                        <UserX className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setConfirmAction("activate")}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmAction("remove")}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <Separator className="my-6" />

            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{member.department}</span>
                </div>
              )}
              {member.manager && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Reports to {member.manager.name || "—"}</span>
                </div>
              )}
              {member.startDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Started{" "}
                    {new Date(member.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {member.employeeId && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>ID: {member.employeeId}</span>
                </div>
              )}
              {member.roleConfigName && (
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{member.roleConfigName}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  Joined{" "}
                  {new Date(member.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <div className="md:col-span-2">
        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="feedback">360 Feedback</TabsTrigger>
            {(stats.directReports > 0 || member.manager) && (
              <TabsTrigger value="team">Team</TabsTrigger>
            )}
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Users className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{stats.directReports}</p>
                <p className="text-xs text-muted-foreground">Direct Reports</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <ClipboardList className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{stats.reviewsReceived}</p>
                <p className="text-xs text-muted-foreground">Reviews Received</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Send className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{stats.reviewsGiven}</p>
                <p className="text-xs text-muted-foreground">Reviews Given</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <UserCheck className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{stats.nominations}</p>
                <p className="text-xs text-muted-foreground">Nominations</p>
              </div>
            </div>

            {/* Employment Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">Employment Information</CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveDetails} disabled={isPending}>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <Badge className={ROLE_BADGE_STYLES[member.role] || "bg-gray-100 text-gray-700"}>
                        {member.role}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Use the Actions menu to change role</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Department</label>
                      <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Title</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="e.g. Senior Engineer"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Manager</label>
                      <Select value={editManagerId} onValueChange={setEditManagerId}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {otherMembers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name || "Unnamed"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Employee ID</label>
                      <Input
                        value={editEmployeeId}
                        onChange={(e) => setEditEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-001"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <Input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <Badge className={ROLE_BADGE_STYLES[member.role] || "bg-gray-100 text-gray-700"}>
                        {member.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm font-medium">{member.department || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Title</p>
                      <p className="text-sm font-medium">{member.title || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="text-sm font-medium">{member.manager?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employee ID</p>
                      <p className="text-sm font-medium">{member.employeeId || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-medium">
                        {member.startDate
                          ? new Date(member.startDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 360 Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Cycle Participation</CardTitle>
                <CardDescription>
                  Cycles this member has been part of
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cycleParticipations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No review cycle participation yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cycleParticipations.map((cp) => (
                      <div
                        key={cp.cycleId}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{cp.cycleName}</p>
                          <p className="text-xs text-muted-foreground">
                            {cp.startDate &&
                              new Date(cp.startDate).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}
                            {cp.startDate && cp.endDate && " — "}
                            {cp.endDate &&
                              new Date(cp.endDate).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}
                          </p>
                        </div>
                        <Badge
                          className={
                            CYCLE_STATUS_STYLES[cp.cycleStatus] || "bg-gray-100 text-gray-600"
                          }
                        >
                          {getCycleStatusLabel(cp.cycleStatus as import("@prisma/client").CycleStatus, locale)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-8 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Feedback analytics and competency scores will appear here once review data is available.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          {(stats.directReports > 0 || member.manager) && (
            <TabsContent value="team" className="space-y-6 mt-6">
              {member.manager && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Manager</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={`/settings/company/members/${member.manager.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {member.manager.name
                            ? getInitials(member.manager.name)
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.manager.name || "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">Manager</p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {member.directReports.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Direct Reports</CardTitle>
                    <CardDescription>
                      {member.directReports.length} team member
                      {member.directReports.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {member.directReports.map((r) => (
                        <Link
                          key={r.id}
                          href={`/settings/company/members/${r.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={r.image || undefined} />
                            <AvatarFallback>
                              {r.name ? getInitials(r.name) : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{r.name || "—"}</p>
                            <p className="text-sm text-muted-foreground">
                              {r.title || "No title"}
                              {r.department && ` · ${r.department}`}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Admin and feedback events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-8 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Activity timeline will be available in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role change confirm */}
      <AlertDialog
        open={!!roleChange}
        onOpenChange={(open) => !open && setRoleChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change <strong>{member.name || member.email}</strong> from{" "}
              {member.role} to <strong>{roleChange}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={isPending}>
              {isPending ? "Changing..." : "Change Role"}
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
              {confirmAction === "remove"
                ? "Remove member?"
                : confirmAction === "deactivate"
                  ? "Deactivate member?"
                  : "Activate member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "remove" ? (
                <>
                  This will permanently remove{" "}
                  <strong>{member.name || member.email}</strong> from the
                  company. This cannot be undone.
                </>
              ) : confirmAction === "deactivate" ? (
                <>
                  <strong>{member.name || member.email}</strong> will lose
                  access but their data will be preserved.
                </>
              ) : (
                <>
                  Reactivate{" "}
                  <strong>{member.name || member.email}</strong>? They will
                  regain access.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction === "remove" ? handleRemove : handleToggleActive}
              disabled={isPending}
              className={
                confirmAction === "remove"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {isPending
                ? "Processing..."
                : confirmAction === "remove"
                  ? "Remove"
                  : confirmAction === "deactivate"
                    ? "Deactivate"
                    : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
