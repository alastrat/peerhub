"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createHub, updateHub, deleteHub } from "@/lib/actions/hubs";

interface Hub {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  _count: { employees: number; teams: number };
}

export function HubsManager({ hubs }: { hubs: Hub[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<Hub | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  function openCreate() {
    setEditingHub(null);
    setName("");
    setDescription("");
    setAddress("");
    setDialogOpen(true);
  }

  function openEdit(hub: Hub) {
    setEditingHub(hub);
    setName(hub.name);
    setDescription(hub.description || "");
    setAddress(hub.address || "");
    setDialogOpen(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = editingHub
        ? await updateHub({
            id: editingHub.id,
            name,
            description: description || null,
            address: address || null,
          })
        : await createHub({
            name,
            description: description || undefined,
            address: address || undefined,
          });

      if (result.success) {
        toast.success(editingHub ? "Hub updated" : "Hub created");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(hub: Hub) {
    if (!confirm(`Delete "${hub.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteHub(hub.id);
      if (result.success) {
        toast.success("Hub deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Hubs</h3>
          <p className="text-sm text-muted-foreground">
            Manage your business locations and branches
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Hub
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hubs yet. Create your first hub to get started.
                </TableCell>
              </TableRow>
            ) : (
              hubs.map((hub) => (
                <TableRow key={hub.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{hub.name}</span>
                      {hub.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    {hub.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{hub.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {hub.address || "—"}
                  </TableCell>
                  <TableCell>{hub._count.employees}</TableCell>
                  <TableCell>{hub._count.teams}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(hub)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!hub.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(hub)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHub ? "Edit Hub" : "New Hub"}</DialogTitle>
            <DialogDescription>
              {editingHub
                ? "Update the hub details"
                : "Add a new business location or branch"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bogota Office"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this hub..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Address (optional)</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Calle 100 #19-61, Bogota"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingHub ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
