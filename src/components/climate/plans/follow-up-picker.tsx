"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isEmailAddress } from "@/lib/utils/email";

interface FollowUpUser {
  id: string;
  name: string | null;
  email: string;
}

interface FollowUpPickerProps {
  id?: string;
  "aria-describedby"?: string;
  users: FollowUpUser[];
  userIds: string[];
  emails: string[];
  onChange: (next: { userIds: string[]; emails: string[] }) => void;
}

type Option = { kind: "user"; user: FollowUpUser } | { kind: "email"; email: string };

const SEPARATORS = /[\s,;]+/;
// While typing, spaces belong to name searches; only these close an address
const TYPED_SEPARATORS = /[,;]/;
const MAX_SUGGESTIONS = 6;

/**
 * Who follows up on a survey's plans: company users picked from a list, or
 * any address typed in (Enter, comma or paste). A typed address that belongs
 * to a company user picks that user.
 */
export function FollowUpPicker({ id, users, userIds, emails, onChange, ...rest }: FollowUpPickerProps) {
  const t = useTranslations("climate_plans.settings");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedUsers = userIds
    .map((uid) => users.find((u) => u.id === uid))
    .filter((u): u is FollowUpUser => !!u);

  const options = useMemo<Option[]>(() => {
    const q = query.trim().toLowerCase();
    const matches = users
      .filter((u) => !userIds.includes(u.id))
      .filter((u) => !q || u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS)
      .map((user): Option => ({ kind: "user", user }));
    const typed = q && isEmailAddress(q) && !users.some((u) => u.email.toLowerCase() === q) && !emails.includes(q);
    return typed ? [...matches, { kind: "email", email: q }] : matches;
  }, [query, users, userIds, emails]);

  /** Add addresses; returns the ones that weren't valid. */
  function addAddresses(values: string[]): string[] {
    const nextUsers = [...userIds];
    const nextEmails = [...emails];
    const invalid: string[] = [];
    for (const raw of values) {
      const email = raw.trim().toLowerCase();
      if (!email) continue;
      if (!isEmailAddress(email)) {
        invalid.push(raw.trim());
        continue;
      }
      const user = users.find((u) => u.email.toLowerCase() === email);
      if (user) {
        if (!nextUsers.includes(user.id)) nextUsers.push(user.id);
      } else if (!nextEmails.includes(email)) {
        nextEmails.push(email);
      }
    }
    onChange({ userIds: nextUsers, emails: nextEmails });
    return invalid;
  }

  function choose(option: Option) {
    if (option.kind === "user") onChange({ userIds: [...userIds, option.user.id], emails });
    else addAddresses([option.email]);
    setQuery("");
    setError(null);
    setHighlight(0);
    inputRef.current?.focus();
  }

  /** Turn what's typed into chips; anything that isn't an address stays in the box. */
  function commitTyped(text = query): boolean {
    const tokens = text.split(SEPARATORS).filter(Boolean);
    if (tokens.length === 0) return false;
    const invalid = addAddresses(tokens);
    setQuery(invalid.join(" "));
    setError(invalid.length ? t("follow_up_invalid", { email: invalid[0] }) : null);
    // Close the suggestions so the error under the box shows
    if (invalid.length) setOpen(false);
    return true;
  }

  function removeLast() {
    if (emails.length > 0) onChange({ userIds, emails: emails.slice(0, -1) });
    else if (userIds.length > 0) onChange({ userIds: userIds.slice(0, -1), emails });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && options.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && options[highlight]) choose(options[highlight]);
      else commitTyped();
    } else if ((e.key === "," || e.key === ";") && query.trim()) {
      e.preventDefault();
      commitTyped();
    } else if (e.key === "Backspace" && query === "") {
      removeLast();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && (options.length > 0 || query.trim() !== "");
  const activeId = showList && options[highlight] ? `${listId}-${highlight}` : undefined;

  return (
    <div className="relative">
      <div
        className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedUsers.map((u) => (
          <Chip
            key={u.id}
            label={u.name ?? u.email}
            title={u.email}
            removeLabel={t("follow_up_remove", { name: u.name ?? u.email })}
            onRemove={() => onChange({ userIds: userIds.filter((x) => x !== u.id), emails })}
          />
        ))}
        {emails.map((email) => (
          <Chip
            key={email}
            label={email}
            removeLabel={t("follow_up_remove", { name: email })}
            onRemove={() => onChange({ userIds, emails: emails.filter((x) => x !== email) })}
          />
        ))}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-describedby={rest["aria-describedby"]}
          aria-invalid={!!error}
          autoComplete="off"
          className="min-w-[12rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
          placeholder={t("follow_up_placeholder")}
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setOpen(true);
            setHighlight(0);
            setError(null);
            // A comma or semicolon closes the address before it (phone keyboards
            // don't always send key events, so this isn't left to onKeyDown)
            if (TYPED_SEPARATORS.test(value)) {
              const parts = value.split(TYPED_SEPARATORS);
              const typing = parts.pop() ?? "";
              const invalid = addAddresses(parts.filter((p) => p.trim()));
              setQuery([...invalid, typing.trimStart()].filter(Boolean).join(" "));
              if (invalid.length) setError(t("follow_up_invalid", { email: invalid[0] }));
              return;
            }
            setQuery(value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            // Keep a half-typed name search; turn a typed address into a chip
            if (query.includes("@")) commitTyped();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!SEPARATORS.test(text.trim())) return;
            e.preventDefault();
            commitTyped(`${query} ${text}`);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((option, i) => (
            <li
              key={option.kind === "user" ? option.user.id : option.email}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                i === highlight && "bg-accent text-accent-foreground",
              )}
              // Keep focus in the input so the click lands before blur closes the list
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(option)}
            >
              {option.kind === "user" ? (
                <>
                  <span className="font-medium">{option.user.name ?? option.user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{option.user.email}</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {t("follow_up_add_email", { email: option.email })}
                </>
              )}
            </li>
          ))}
          {options.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-muted-foreground">{t("follow_up_no_matches")}</li>
          )}
        </ul>
      )}

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Chip({
  label,
  title,
  removeLabel,
  onRemove,
}: {
  label: string;
  title?: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary py-1 pl-2.5 pr-1 text-xs font-medium text-secondary-foreground"
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-label={removeLabel}
        className="rounded-full p-0.5 hover:bg-background/60"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
