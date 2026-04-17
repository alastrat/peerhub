"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { distributeSurvey } from "@/lib/actions/climate-distribution";

type TargetType = "ALL" | "HUB" | "DEPARTMENT" | "TEAM" | "CUSTOM";

interface IdNamePair {
  id: string;
  name: string;
}

interface EmployeeOption extends IdNamePair {
  email: string;
}

interface DistributeDialogProps {
  surveyId: string;
  surveyName: string;
  hubs: IdNamePair[];
  departments: IdNamePair[];
  teams: IdNamePair[];
  employees: EmployeeOption[];
  featureHubs: boolean;
  trigger: React.ReactNode;
}

export function DistributeDialog({
  surveyId,
  surveyName,
  hubs,
  departments,
  teams,
  employees,
  featureHubs,
  trigger,
}: DistributeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [targetType, setTargetType] = useState<TargetType>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [employeeSearch, setEmployeeSearch] = useState("");

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSubmit = () => {
    if (!dueDate) return false;
    if (targetType === "ALL") return true;
    return selectedIds.length > 0;
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await distributeSurvey({
        surveyId,
        targetType,
        targetIds: targetType === "ALL" ? undefined : selectedIds,
        dueDate: new Date(dueDate),
      });
      if (!result.success) {
        toast.error(result.error || "Could not send survey");
        return;
      }
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(`"${surveyName}" has been sent. Email invitations delivered.`);
      }
      setOpen(false);
      router.refresh();
    });
  };

  // Reset selection when target type changes
  const handleTargetTypeChange = (value: string) => {
    setTargetType(value as TargetType);
    setSelectedIds([]);
    setEmployeeSearch("");
  };

  const filteredEmployees = employeeSearch.trim()
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          e.email.toLowerCase().includes(employeeSearch.toLowerCase()),
      )
    : employees;

  const optionsForTarget: IdNamePair[] =
    targetType === "HUB"
      ? hubs
      : targetType === "DEPARTMENT"
        ? departments
        : targetType === "TEAM"
          ? teams
          : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Send survey to members</DialogTitle>
          <DialogDescription>
            Choose who should receive <strong>{surveyName}</strong>. Once sent,
            the survey becomes active and responses start being collected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Send to</Label>
            <Select value={targetType} onValueChange={handleTargetTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All active employees</SelectItem>
                {featureHubs && hubs.length > 0 && (
                  <SelectItem value="HUB">Specific hubs</SelectItem>
                )}
                {departments.length > 0 && (
                  <SelectItem value="DEPARTMENT">Specific departments</SelectItem>
                )}
                {teams.length > 0 && <SelectItem value="TEAM">Specific teams</SelectItem>}
                <SelectItem value="CUSTOM">Specific employees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection list for HUB / DEPARTMENT / TEAM */}
          {(targetType === "HUB" ||
            targetType === "DEPARTMENT" ||
            targetType === "TEAM") && (
            <div className="space-y-2">
              <Label>
                Select {targetType.toLowerCase()}
                {optionsForTarget.length !== 1 ? "s" : ""}
              </Label>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                {optionsForTarget.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No options available.</p>
                ) : (
                  optionsForTarget.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedIds.includes(opt.id)}
                        onCheckedChange={() => toggleId(opt.id)}
                      />
                      <span className="text-sm">{opt.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Custom employee list with search */}
          {targetType === "CUSTOM" && (
            <div className="space-y-2">
              <Label>Select employees</Label>
              <Input
                placeholder="Search by name or email..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredEmployees.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No employees match your search.
                  </p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedIds.includes(emp.id)}
                        onCheckedChange={() => toggleId(emp.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{emp.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {emp.email}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedIds.length} employee{selectedIds.length !== 1 ? "s" : ""}{" "}
                  selected
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send survey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
