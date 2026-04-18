"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
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
import { Target, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  createCompetency,
  updateCompetency,
  deleteCompetency,
} from "@/lib/actions/competencies";

const COMPETENCY_CATEGORIES = [
  "organizational",
  "functional",
  "leadership",
] as const;

interface CompetencyData {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  questionsCount: number;
}

export function CompetenciesManager({
  competencies: initial,
}: {
  competencies: CompetencyData[];
}) {
  const t = useTranslations("dashboard.competencies");
  const [competencies, setCompetencies] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<string>("none");

  // Edit dialog
  const [editComp, setEditComp] = useState<CompetencyData | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState<string>("none");

  // Delete confirm
  const [deleteComp, setDeleteComp] = useState<CompetencyData | null>(null);

  const categoryLabels: Record<string, string> = {
    organizational: t("organizational"),
    functional: t("functional"),
    leadership: t("leadership"),
    uncategorized: t("uncategorized"),
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCompetency({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory !== "none" ? newCategory : undefined,
      });
      if (result.success) {
        setNewName("");
        setNewDesc("");
        setNewCategory("none");
        setCreateOpen(false);
        window.location.reload();
      } else {
        setError(result.error || t("failedCreate"));
      }
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editComp) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCompetency({
        id: editComp.id,
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        category: editCategory !== "none" ? editCategory : undefined,
      });
      if (result.success) {
        setEditComp(null);
        window.location.reload();
      } else {
        setError(result.error || t("failedUpdate"));
      }
    });
  };

  const handleDelete = () => {
    if (!deleteComp) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCompetency(deleteComp.id);
      if (result.success) {
        setCompetencies((prev) => prev.filter((c) => c.id !== deleteComp.id));
        setDeleteComp(null);
      } else {
        setError(result.error || t("failedDelete"));
        setDeleteComp(null);
      }
    });
  };

  const openEdit = (comp: CompetencyData) => {
    setEditComp(comp);
    setEditName(comp.name);
    setEditDesc(comp.description || "");
    setEditCategory(comp.category || "none");
    setError(null);
  };

  // Group by category for display
  const grouped = competencies.reduce<Record<string, CompetencyData[]>>(
    (acc, c) => {
      const key = c.category || "uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    },
    {}
  );

  const categoryOrder = ["organizational", "functional", "leadership", "uncategorized"];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setError(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("addCompetency")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("addTitle")}</DialogTitle>
                <DialogDescription>
                  {t("addDescription")}
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
                  <label className="text-sm font-medium">{t("category")}</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noCategory")}</SelectItem>
                      {COMPETENCY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
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

      {error && !createOpen && !editComp && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {competencies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("noCompetencies")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noCompetenciesHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((category) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {categoryLabels[category] || t("uncategorized")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[category].map((c) => (
                  <Card key={c.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <p className="font-medium truncate">{c.name}</p>
                          </div>
                          {c.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 ml-6">
                              {c.description}
                            </p>
                          )}
                          <div className="mt-2 ml-6 flex items-center gap-2">
                            {c.category && (
                              <Badge variant="secondary" className="text-xs">
                                {categoryLabels[c.category] || c.category}
                              </Badge>
                            )}
                            {c.questionsCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {t("questionsCount", { count: c.questionsCount, plural: c.questionsCount !== 1 ? "s" : "" })}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteComp(c)}
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
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editComp} onOpenChange={(open) => { if (!open) { setEditComp(null); setError(null); } }}>
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
                  placeholder={t("briefDescription")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("category")}</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noCategory")}</SelectItem>
                    {COMPETENCY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && editComp && (
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
      <AlertDialog open={!!deleteComp} onOpenChange={(open) => !open && setDeleteComp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")} <strong>{deleteComp?.name}</strong>.
              {deleteComp && deleteComp.questionsCount > 0 && (
                <> {t("deleteInUse", { count: deleteComp.questionsCount, plural: deleteComp.questionsCount !== 1 ? "s" : "" })}</>
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
