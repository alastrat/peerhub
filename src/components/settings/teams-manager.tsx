"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  UserPlus,
  UserMinus,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "@/lib/actions/teams";
import { getInitials } from "@/lib/utils/formatting";

interface Department {
  id: string;
  name: string;
}

interface Hub {
  id: string;
  name: string;
}

interface TeamMemberRow {
  employeeId: string;
  role: "LEAD" | "MEMBER";
  employee: {
    id: string;
    name: string;
    email: string;
    title: string | null;
    department: { name: string } | null;
  };
}

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  department: { id: string; name: string } | null;
  hub: { id: string; name: string } | null;
  _count: { members: number };
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  title: string | null;
  department: { name: string } | null;
}

export function TeamsManager({
  teams,
  departments,
  hubs,
  employees,
  featureHubs,
}: {
  teams: TeamRow[];
  departments: Department[];
  hubs: Hub[];
  employees: EmployeeOption[];
  featureHubs: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create/edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hubId, setHubId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");

  // Members dialog state
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamRow | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [addEmployeeId, setAddEmployeeId] = useState<string>("");
  const [addRole, setAddRole] = useState<"LEAD" | "MEMBER">("MEMBER");
  const [loadingMembers, setLoadingMembers] = useState(false);

  function openCreate() {
    setEditingTeam(null);
    setName("");
    setDescription("");
    setHubId("");
    setDepartmentId("");
    setDialogOpen(true);
  }

  function openEdit(team: TeamRow) {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description || "");
    setHubId(team.hub?.id || "");
    setDepartmentId(team.department?.id || "");
    setDialogOpen(true);
  }

  async function openMembers(team: TeamRow) {
    setSelectedTeam(team);
    setLoadingMembers(true);
    setMembersDialogOpen(true);
    setAddEmployeeId("");
    setAddRole("MEMBER");

    try {
      const res = await fetch(`/api/teams/${team.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoadingMembers(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = editingTeam
        ? await updateTeam({
            id: editingTeam.id,
            name,
            description: description || null,
            hubId: hubId || null,
            departmentId: departmentId || null,
          })
        : await createTeam({
            name,
            description: description || undefined,
            hubId: hubId || undefined,
            departmentId: departmentId || undefined,
          });

      if (result.success) {
        toast.success(editingTeam ? "Team updated" : "Team created");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(team: TeamRow) {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteTeam(team.id);
      if (result.success) {
        toast.success("Team deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAddMember() {
    if (!selectedTeam || !addEmployeeId) return;
    startTransition(async () => {
      const result = await addTeamMember(selectedTeam.id, addEmployeeId, addRole);
      if (result.success) {
        toast.success("Member added");
        setAddEmployeeId("");
        setAddRole("MEMBER");
        // Refresh members
        await openMembers(selectedTeam);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemoveMember(employeeId: string) {
    if (!selectedTeam) return;
    startTransition(async () => {
      const result = await removeTeamMember(selectedTeam.id, employeeId);
      if (result.success) {
        toast.success("Member removed");
        setTeamMembers((prev) => prev.filter((m) => m.employeeId !== employeeId));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRoleChange(employeeId: string, role: "LEAD" | "MEMBER") {
    if (!selectedTeam) return;
    startTransition(async () => {
      const result = await updateTeamMemberRole(selectedTeam.id, employeeId, role);
      if (result.success) {
        setTeamMembers((prev) =>
          prev.map((m) => (m.employeeId === employeeId ? { ...m, role } : m))
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  const memberEmployeeIds = new Set(teamMembers.map((m) => m.employeeId));
  const availableEmployees = employees.filter((e) => !memberEmployeeIds.has(e.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Teams</h3>
          <p className="text-sm text-muted-foreground">
            Manage working groups and team memberships
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Team
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Team</TableHead>
              <TableHead>Department</TableHead>
              {featureHubs && <TableHead>Hub</TableHead>}
              <TableHead>Members</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={featureHubs ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No teams yet. Create your first team to get started.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <span className="font-medium">{team.name}</span>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {team.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {team.department?.name || "—"}
                  </TableCell>
                  {featureHubs && (
                    <TableCell className="text-muted-foreground">
                      {team.hub?.name || "—"}
                    </TableCell>
                  )}
                  <TableCell>{team._count.members}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openMembers(team)}
                        title="Manage members"
                      >
                        <Users className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(team)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(team)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "New Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "Update the team details" : "Create a new working group"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Enterprise Sales"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this team..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Department (optional)</Label>
              <Select value={departmentId || "none"} onValueChange={(v) => setDepartmentId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {featureHubs && (
              <div className="space-y-2">
                <Label>Hub (optional)</Label>
                <Select value={hubId || "none"} onValueChange={(v) => setHubId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No hub</SelectItem>
                    {hubs.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTeam ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTeam?.name} — Members
            </DialogTitle>
            <DialogDescription>
              Add or remove team members. Members can be from any department.
            </DialogDescription>
          </DialogHeader>

          {/* Add member */}
          <div className="flex items-end gap-2 pt-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={addEmployeeId || "none"} onValueChange={(v) => setAddEmployeeId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select an employee</SelectItem>
                  {availableEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}{" "}
                      {e.department && (
                        <span className="text-muted-foreground">
                          ({e.department.name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px] space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as "LEAD" | "MEMBER")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleAddMember}
              disabled={isPending || !addEmployeeId}
            >
              <UserPlus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Members list */}
          <ScrollArea className="max-h-[400px] mt-4">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No members yet
              </p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((m) => (
                  <div
                    key={m.employeeId}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(m.employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{m.employee.name}</p>
                        {m.role === "LEAD" && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.employee.title || m.employee.email}
                        {m.employee.department && (
                          <> — {m.employee.department.name}</>
                        )}
                      </p>
                    </div>
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        handleRoleChange(m.employeeId, v as "LEAD" | "MEMBER")
                      }
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="LEAD">Lead</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => handleRemoveMember(m.employeeId)}
                      disabled={isPending}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
