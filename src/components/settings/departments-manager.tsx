"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers, Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/lib/actions/departments";

interface DepartmentData {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  membersCount: number;
}

export function DepartmentsManager({
  departments: initial,
}: {
  departments: DepartmentData[];
}) {
  const t = useTranslations("dashboard.departments");
  const [departments, setDepartments] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newParent, setNewParent] = useState<string>("none");

  // Edit dialog
  const [editDept, setEditDept] = useState<DepartmentData | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editParent, setEditParent] = useState<string>("none");

  // Delete confirm
  const [deleteDept, setDeleteDept] = useState<DepartmentData | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDepartment({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        parentId: newParent !== "none" ? newParent : undefined,
      });
      if (result.success) {
        setNewName("");
        setNewDesc("");
        setNewParent("none");
        setCreateOpen(false);
        window.location.reload();
      } else {
        setError(result.error || t("failedCreate"));
      }
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;
    setError(null);
    startTransition(async () => {
      const result = await updateDepartment({
        id: editDept.id,
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        parentId: editParent !== "none" ? editParent : null,
      });
      if (result.success) {
        setEditDept(null);
        window.location.reload();
      } else {
        setError(result.error || t("failedUpdate"));
      }
    });
  };

  const handleDelete = () => {
    if (!deleteDept) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDepartment(deleteDept.id);
      if (result.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== deleteDept.id));
        setDeleteDept(null);
      } else {
        setError(result.error || t("failedDelete"));
        setDeleteDept(null);
      }
    });
  };

  const openEdit = (dept: DepartmentData) => {
    setEditDept(dept);
    setEditName(dept.name);
    setEditDesc(dept.description || "");
    setEditParent(dept.parentId || "none");
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setError(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("createDepartment")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("createTitle")}</DialogTitle>
                <DialogDescription>
                  {t("createDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("name")}</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("description")}</label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("parentDepartment")}</label>
                  <Select value={newParent} onValueChange={setNewParent}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noneTopLevel")}</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && createOpen && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending || !newName.trim()}>
                  {isPending ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !createOpen && !editDept && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {departments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("noDepartments")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noDepartmentsHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="font-medium truncate">{d.name}</p>
                    </div>
                    {d.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 ml-6">
                        {d.description}
                      </p>
                    )}
                    {d.parentName && (
                      <p className="mt-1 text-xs text-muted-foreground ml-6">
                        {t("parent")}: {d.parentName}
                      </p>
                    )}
                    <div className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {t("memberCount", { count: d.membersCount, plural: d.membersCount === 1 ? "" : "s" })}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(d)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDept(d)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editDept} onOpenChange={(open) => { if (!open) { setEditDept(null); setError(null); } }}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
              <DialogDescription>
                {t("editDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("name")}</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("description")}</label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("parentDepartment")}</label>
                <Select value={editParent} onValueChange={setEditParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noneTopLevel")}</SelectItem>
                    {departments
                      .filter((d) => d.id !== editDept?.id)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {error && editDept && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !editName.trim()}>
                {isPending ? t("saving") : t("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteDept} onOpenChange={(open) => !open && setDeleteDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")} <strong>{deleteDept?.name}</strong>.
              {deleteDept && deleteDept.membersCount > 0 && (
                <> {t("deleteHasMembers", { count: deleteDept.membersCount, plural: deleteDept.membersCount !== 1 ? "s" : "" })}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
