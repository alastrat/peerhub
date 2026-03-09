"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Save, Trash2, Lock } from "lucide-react";
import {
  PERMISSION_GROUPS,
  type PermissionLevel,
} from "@/lib/permissions/constants";
import {
  updateRolePermissions,
  updateRoleDetails,
  deleteRole,
} from "@/lib/actions/roles";

const LEVEL_STYLES: Record<PermissionLevel, { label: string; className: string }> = {
  off: { label: "Off", className: "text-gray-500" },
  read: { label: "Read", className: "text-blue-600" },
  write: { label: "Write", className: "text-emerald-600" },
};

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  baseRole: string | null;
  isSystem: boolean;
  permissions: Record<string, string>;
  membersCount: number;
}

export function RoleEditor({
  role,
  featureFlags,
  otherRoles,
  readOnly = false,
}: {
  role: RoleData;
  featureFlags: Record<string, boolean>;
  otherRoles: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [permissions, setPermissions] = useState<Record<string, string>>(
    role.permissions
  );
  const [reassignTo, setReassignTo] = useState(otherRoles[0]?.id || "");

  const isAdminSystem = role.isSystem && role.baseRole === "ADMIN";

  const handlePermissionChange = (key: string, level: PermissionLevel) => {
    setPermissions((prev) => ({ ...prev, [key]: level }));
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      // Save details if changed
      if (name !== role.name || description !== (role.description || "")) {
        const detailResult = await updateRoleDetails({
          roleId: role.id,
          name,
          description,
        });
        if (!detailResult.success) {
          setError(detailResult.error || "Failed to save");
          return;
        }
      }

      // Save permissions
      const permResult = await updateRolePermissions({
        roleId: role.id,
        permissions,
      });
      if (permResult.success) {
        setSuccess("Changes saved");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(permResult.error || "Failed to save");
      }
    });
  };

  const handleDelete = () => {
    if (!reassignTo) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteRole({
        roleId: role.id,
        reassignToId: reassignTo,
      });
      if (result.success) {
        router.push("/settings/company/roles");
      } else {
        setError(result.error || "Failed to delete role");
      }
    });
  };

  // Filter groups by feature flags
  const visibleGroups = PERMISSION_GROUPS.filter(
    (g) => !g.featureFlag || featureFlags[g.featureFlag]
  );

  return (
    <div className="space-y-6">
      {/* Role details */}
      {!role.isSystem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.permissions.map((perm) => {
                    const currentLevel =
                      (permissions[perm.key] as PermissionLevel) || "off";
                    const isLocked =
                      isAdminSystem && perm.key === "company.roles";

                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {perm.description}
                          </p>
                        </div>
                        <div className="ml-4 w-28 shrink-0">
                          {isLocked || readOnly ? (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              {isLocked && <Lock className="h-3.5 w-3.5" />}
                              <span className={LEVEL_STYLES[currentLevel].className + " font-medium"}>
                                {LEVEL_STYLES[currentLevel].label}
                              </span>
                            </div>
                          ) : (
                            <Select
                              value={currentLevel}
                              onValueChange={(v) =>
                                handlePermissionChange(
                                  perm.key,
                                  v as PermissionLevel
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue>
                                  <span
                                    className={
                                      LEVEL_STYLES[currentLevel].className
                                    }
                                  >
                                    {LEVEL_STYLES[currentLevel].label}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="off">
                                  <span className="text-gray-500">Off</span>
                                </SelectItem>
                                <SelectItem value="read">
                                  <span className="text-blue-600">Read</span>
                                </SelectItem>
                                <SelectItem value="write">
                                  <span className="text-emerald-600">
                                    Write
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions bar */}
      {!readOnly && <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </div>
        <div className="flex items-center gap-3">
          {!role.isSystem && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete Role
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete role?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the <strong>{role.name}</strong>{" "}
                    role.
                    {role.membersCount > 0 && (
                      <>
                        {" "}
                        {role.membersCount}{" "}
                        {role.membersCount === 1 ? "member" : "members"} will be
                        reassigned to:
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {role.membersCount > 0 && (
                  <div className="py-2">
                    <Select value={reassignTo} onValueChange={setReassignTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={role.membersCount > 0 && !reassignTo}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>}
    </div>
  );
}
