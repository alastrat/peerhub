"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard.hubs");
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
        toast.success(editingHub ? t("hubUpdated") : t("hubCreated"));
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(hub: Hub) {
    if (!confirm(t("deleteConfirm", { name: hub.name }))) return;
    startTransition(async () => {
      const result = await deleteHub(hub.id);
      if (result.success) {
        toast.success(t("hubDeleted"));
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
          <h3 className="text-lg font-medium">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t("addHub")}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("address")}</TableHead>
              <TableHead>{t("employees")}</TableHead>
              <TableHead>{t("teams")}</TableHead>
              <TableHead className="w-[100px]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t("noHubs")}
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
                          {t("default")}
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
            <DialogTitle>{editingHub ? t("editHub") : t("newHub")}</DialogTitle>
            <DialogDescription>
              {editingHub
                ? t("updateDetails")
                : t("addLocation")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("descriptionOptional")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("addressOptional")}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingHub ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
