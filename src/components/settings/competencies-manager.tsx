"use client";

import { useState, useTransition } from "react";
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

const CATEGORY_LABELS: Record<string, string> = {
  organizational: "Organizational",
  functional: "Functional",
  leadership: "Leadership",
};

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
        setError(result.error || "Failed to create competency");
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
        setError(result.error || "Failed to update competency");
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
        setError(result.error || "Failed to delete competency");
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
              Add Competency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add Competency</DialogTitle>
                <DialogDescription>
                  Define a new competency for your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Communication"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description of this competency"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {COMPETENCY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
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
                  {isPending ? "Creating..." : "Create"}
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
              No competencies defined yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add competencies to use with competency-rated questions in review templates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((category) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {CATEGORY_LABELS[category] || "Uncategorized"}
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
                                {CATEGORY_LABELS[c.category] || c.category}
                              </Badge>
                            )}
                            {c.questionsCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {c.questionsCount} question{c.questionsCount !== 1 ? "s" : ""}
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
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteComp(c)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
              <DialogTitle>Edit Competency</DialogTitle>
              <DialogDescription>
                Update competency details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {COMPETENCY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
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
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteComp} onOpenChange={(open) => !open && setDeleteComp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete competency?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteComp?.name}</strong>.
              {deleteComp && deleteComp.questionsCount > 0 && (
                <> This competency is used by {deleteComp.questionsCount} template question{deleteComp.questionsCount !== 1 ? "s" : ""} — remove it from those questions first.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
