"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Users, UserCheck, Pencil, Plus } from "lucide-react";
import { createRole } from "@/lib/actions/roles";

const ROLE_ICONS: Record<string, typeof Shield> = {
  ADMIN: Shield,
  MANAGER: Users,
  MEMBER: UserCheck,
};

interface RoleData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  baseRole: string | null;
  isSystem: boolean;
  color: string;
  permissions: Record<string, string>;
  membersCount: number;
}

export function RolesList({ roles: initial, isSuperAdmin }: { roles: RoleData[]; isSuperAdmin: boolean }) {
  const [roles, setRoles] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [cloneFrom, setCloneFrom] = useState<string>("none");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createRole({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        cloneFromId: cloneFrom !== "none" ? cloneFrom : undefined,
      });
      if (result.success) {
        setNewName("");
        setNewDesc("");
        setCloneFrom("none");
        setCreateOpen(false);
        // Reload to get fresh data
        window.location.reload();
      } else {
        setError(result.error || "Failed to create role");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Role</DialogTitle>
                <DialogDescription>
                  Create a new custom role with specific permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. HR Lead"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Clone permissions from
                  </label>
                  <Select value={cloneFrom} onValueChange={setCloneFrom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Start from scratch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Start from scratch (all off)
                      </SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Clone from {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || !newName.trim()}
                >
                  {isPending ? "Creating..." : "Create Role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <style>{`.role-card .edit-btn { opacity: 0; transition: opacity 0.15s; } .role-card:hover .edit-btn { opacity: 1; }`}</style>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          const Icon = ROLE_ICONS[role.baseRole || ""] || Shield;
          const writes = Object.values(role.permissions).filter((v) => v === "write").length;
          const reads = Object.values(role.permissions).filter((v) => v === "read").length;
          return (
            <Card key={role.id} className="role-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Icon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {role.name}
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-500 border-gray-200 font-medium"
                      >
                        {role.baseRole || role.slug.toUpperCase()}
                      </Badge>
                      {role.isSystem && (
                        <span className="text-xs text-gray-400 font-normal">
                          System
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {role.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {role.membersCount}{" "}
                      {role.membersCount === 1 ? "member" : "members"}
                    </span>
                    <span className="text-gray-500">{writes} write</span>
                    <span className="text-gray-500">{reads} read</span>
                  </div>
                  <Link href={`/settings/company/roles/${role.id}`} className="edit-btn">
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {role.isSystem && !isSuperAdmin ? "View Permissions" : "Edit Permissions"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
