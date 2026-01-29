"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/lib/utils/formatting";
import { toast } from "sonner";
import { createNominations } from "@/lib/actions/nominations";

interface Colleague {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  title: string | null;
  department: string | null;
}

interface PeerSelectorProps {
  cycleId: string;
  revieweeId: string;
  colleagues: Colleague[];
  existingNomineeIds: string[];
  minPeers: number;
  maxPeers: number;
  currentCount: number;
}

export function PeerSelector({
  cycleId,
  revieweeId,
  colleagues,
  existingNomineeIds,
  minPeers,
  maxPeers,
  currentCount,
}: PeerSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const remainingSlots = maxPeers - currentCount;
  const canSelect = remainingSlots > 0;

  // Filter colleagues based on search
  const filteredColleagues = colleagues.filter((c) => {
    if (existingNomineeIds.includes(c.id)) return false;
    if (c.id === revieweeId) return false;

    const searchLower = search.toLowerCase();
    return (
      (c.name?.toLowerCase().includes(searchLower) ?? false) ||
      c.email.toLowerCase().includes(searchLower) ||
      (c.title?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (selectedIds.size >= remainingSlots) {
        toast.error(`You can only select ${remainingSlots} more peers`);
        return;
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const result = await createNominations(
        cycleId,
        Array.from(selectedIds),
        revieweeId
      );

      if (result.success && result.data) {
        toast.success(`${result.data.created} peer(s) nominated successfully`);
        setSelectedIds(new Set());
      } else {
        toast.error(result.error || "Failed to nominate peers");
      }
    } catch {
      toast.error("Failed to nominate peers");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Peer Reviewers</CardTitle>
        <CardDescription>
          Choose colleagues who can provide valuable feedback.
          Select {minPeers}-{maxPeers} peers. ({currentCount} already nominated)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selected count */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <span className="text-sm">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Nominate Selected
              </Button>
            </div>
          </div>
        )}

        {/* Colleagues list */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredColleagues.map((colleague) => {
              const isSelected = selectedIds.has(colleague.id);

              return (
                <button
                  key={colleague.id}
                  onClick={() => canSelect && toggleSelect(colleague.id)}
                  disabled={!canSelect && !isSelected}
                  className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-colors text-left ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  } ${!canSelect && !isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={colleague.image || undefined} />
                    <AvatarFallback>
                      {getInitials(colleague.name || colleague.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {colleague.name || colleague.email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {colleague.title || colleague.email}
                    </p>
                  </div>

                  {colleague.department && (
                    <Badge variant="secondary" className="shrink-0">
                      {colleague.department}
                    </Badge>
                  )}

                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                </button>
              );
            })}

            {filteredColleagues.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {search
                  ? "No colleagues match your search"
                  : "No available colleagues to nominate"}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
