"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { createDimension } from "@/lib/actions/climate-dimensions";

export interface DimensionOption {
  id: string;
  name: string;
}

interface Props {
  dimensions: DimensionOption[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (dimension: DimensionOption) => void;
  className?: string;
  disabled?: boolean;
}

export function DimensionCombobox({
  dimensions,
  value,
  onChange,
  onCreated,
  className,
  disabled = false,
}: Props) {
  const t = useTranslations("dashboard.climate.wizard.dimension_combobox");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = dimensions.find((d) => d.id === value);
  const triggerLabel = selected?.name ?? t("none");

  const normalizedSearch = search.trim().toLowerCase();
  const hasExactMatch = dimensions.some(
    (d) => d.name.trim().toLowerCase() === normalizedSearch,
  );
  const canCreate = normalizedSearch.length > 0 && !hasExactMatch;

  const handleSelect = (id: string) => {
    onChange(id === "__none__" ? "" : id);
    setOpen(false);
    setSearch("");
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createDimension({ name });
      if (result.success && result.data) {
        const dim = { id: result.data.id, name: result.data.name };
        onCreated(dim);
        onChange(dim.id);
        setOpen(false);
        setSearch("");
        toast.success(t("created_toast", { name: dim.name }));
      } else {
        toast.error(result.error ?? t("create_failed"));
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isPending || disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
        align="start"
      >
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput
            placeholder={t("search_placeholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!canCreate && <CommandEmpty>{t("empty")}</CommandEmpty>}
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => handleSelect("__none__")}
                className="flex items-center justify-between"
              >
                <span>{t("none")}</span>
                <Check
                  className={cn(
                    "ml-2 h-4 w-4 shrink-0",
                    !value ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
              {dimensions.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.name}
                  onSelect={() => handleSelect(d.id)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{d.name}</span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === d.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`__create__${search}`}
                    onSelect={handleCreate}
                    disabled={isPending}
                    className="gap-2 text-primary"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {isPending
                        ? t("creating")
                        : t("create_item", { name: search.trim() })}
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
