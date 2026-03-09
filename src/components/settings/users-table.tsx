"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, Shield, Users } from "lucide-react";
import { getInitials } from "@/lib/utils/formatting";
import {
  updateUserGlobalRole,
  deletePlatformUser,
} from "@/lib/actions/platform";

interface PlatformUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  globalRole: string;
  companiesCount: number;
  companies: { name: string; role: string }[];
  createdAt: string;
}

export function UsersTable({
  users: initial,
  currentUserId,
}: {
  users: PlatformUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "all" || u.globalRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (
    userId: string,
    globalRole: "SUPER_ADMIN" | "USER"
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await updateUserGlobalRole({ userId, globalRole });
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, globalRole } : u))
        );
      } else {
        setError(result.error || "Failed to update role");
      }
    });
  };

  const handleDelete = (userId: string) => {
    startTransition(async () => {
      const result = await deletePlatformUser(userId);
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        setError(result.error || "Failed to delete user");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="USER">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="!bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>Global Role</TableHead>
              <TableHead>Companies</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {search || roleFilter !== "all"
                      ? "No users match your filters"
                      : "No users yet"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow
                    key={u.id}
                    className="!bg-white hover:!bg-gray-50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {u.name ? getInitials(u.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {u.name || "No name"}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          <Shield className="mr-1 h-3 w-3" />
                          Super Admin
                        </Badge>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="cursor-pointer"
                              disabled={isPending}
                            >
                              {u.globalRole === "SUPER_ADMIN" ? (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 transition-colors">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Super Admin
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="hover:bg-muted transition-colors"
                                >
                                  User
                                </Badge>
                              )}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Change global role?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.globalRole === "SUPER_ADMIN" ? (
                                  <>
                                    Demote <strong>{u.name || u.email}</strong>{" "}
                                    from Super Admin to regular User? They will
                                    lose platform-level access.
                                  </>
                                ) : (
                                  <>
                                    Promote <strong>{u.name || u.email}</strong>{" "}
                                    to Super Admin? They will gain full
                                    platform-level access.
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRoleChange(
                                    u.id,
                                    u.globalRole === "SUPER_ADMIN"
                                      ? "USER"
                                      : "SUPER_ADMIN"
                                  )
                                }
                              >
                                {u.globalRole === "SUPER_ADMIN"
                                  ? "Demote to User"
                                  : "Promote to Super Admin"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.companies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.companies.slice(0, 3).map((c, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {c.name}
                            </Badge>
                          ))}
                          {u.companies.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{u.companies.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete{" "}
                                <strong>{u.name || u.email}</strong> and all
                                their data. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(u.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {users.length} users
      </p>
    </div>
  );
}
