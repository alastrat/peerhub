"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Command as CommandPrimitive } from "cmdk";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Search,
  Target,
  Thermometer,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import {
  normalizeSearchQuery,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_RESULT_TYPES,
  type SearchResponse,
  type SearchResult,
  type SearchResultType,
} from "@/lib/search/types";

const DEBOUNCE_MS = 200;

const RESULT_ICONS: Record<SearchResultType, LucideIcon> = {
  person: User,
  climateSurvey: Thermometer,
  actionPlan: Target,
  climateTemplate: ClipboardList,
  cycle: RefreshCcw,
  department: Building2,
  team: Users,
};

type PageLink = { href: string; labelKey: string };

const PROFILE_PAGE: PageLink = { href: "/settings/profile", labelKey: "profile" };

// Mirrors the sidebar: admins manage the company, everyone else gets their
// own reviews and feedback.
const ADMIN_PAGES: PageLink[] = [
  { href: "/overview", labelKey: "overview" },
  { href: "/people", labelKey: "people" },
  { href: "/surveys/climate", labelKey: "climate_surveys" },
  { href: "/surveys/climate/templates", labelKey: "climate_templates" },
  { href: "/surveys/360", labelKey: "cycles_360" },
  { href: "/surveys/360/templates", labelKey: "templates_360" },
  { href: "/reports", labelKey: "reports" },
  { href: "/settings/company", labelKey: "company_settings" },
  PROFILE_PAGE,
];

const EMPLOYEE_PAGES: PageLink[] = [
  { href: "/overview", labelKey: "overview" },
  { href: "/my-reviews", labelKey: "my_reviews" },
  { href: "/my-feedback", labelKey: "my_feedback" },
  PROFILE_PAGE,
];

const PLATFORM_PAGES: PageLink[] = [
  { href: "/settings/platform/companies", labelKey: "platform_companies" },
  { href: "/settings/platform/users", labelKey: "platform_users" },
];

function pagesFor(role: string | undefined, isSuperAdmin: boolean): PageLink[] {
  const pages = role === "ADMIN" ? ADMIN_PAGES : role ? EMPLOYEE_PAGES : [PROFILE_PAGE];
  return isSuperAdmin ? [...pages, ...PLATFORM_PAGES] : pages;
}

/** Lowercase and strip accents so "configuracion" matches "Configuración". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const subscribeToNothing = () => () => {};

function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => /Mac|iPhone|iPad/i.test(navigator.userAgent),
    () => true,
  );
}

type FetchedResults = { key: string; results: SearchResult[]; failed: boolean };

function resultValue(result: SearchResult): string {
  return `${result.type}:${result.id}`;
}

export function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const { data: session } = useSession();
  const isMac = useIsMac();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState<FetchedResults | null>(null);
  const [selection, setSelection] = useState<{ value: string; version: string } | null>(null);

  const role = session?.companyUser?.role;
  const isSuperAdmin = session?.user?.globalRole === "SUPER_ADMIN";
  // The API only returns records to company admins, and only from their own
  // company; other roles just get the page shortcuts, so skip the round trip.
  const canSearchRecords = role === "ADMIN";

  const term = canSearchRecords ? normalizeSearchQuery(query) : null;
  // Keyed by company too, so switching companies never shows the old one's results.
  const requestKey = term ? `${session?.companyUser?.companyId ?? ""}|${term}` : null;

  useEffect(() => {
    if (!term || !requestKey) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Search failed with ${response.status}`);
        const data = (await response.json()) as SearchResponse;
        setFetched({ key: requestKey, results: data.results, failed: false });
      } catch {
        if (!controller.signal.aborted) {
          setFetched({ key: requestKey, results: [], failed: true });
        }
      }
    }, DEBOUNCE_MS);
    // Aborting on every keystroke means a slow response for an older query
    // can never overwrite the results for the current one.
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, requestKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isLoading = requestKey !== null && fetched?.key !== requestKey;
  const failed = requestKey !== null && fetched?.key === requestKey && fetched.failed;
  // While the next query loads, keep the previous results on screen instead
  // of flashing an empty list on every keystroke.
  const results = requestKey ? (fetched?.results ?? []) : [];
  const groups = SEARCH_RESULT_TYPES.map((type) => ({
    type,
    items: results.filter((result) => result.type === type),
  })).filter((group) => group.items.length > 0);

  const trimmed = query.trim();
  const needle = fold(trimmed);
  const pages = pagesFor(role, isSuperAdmin)
    .map((page) => ({ ...page, label: t(`pages.${page.labelKey}`) }))
    .filter((page) => fold(page.label).includes(needle));

  // Highlight the first row whenever the query or the results change, so
  // Enter opens the top result even when it arrives after the page shortcuts.
  const values = [
    ...groups.flatMap((group) => group.items.map(resultValue)),
    ...pages.map((page) => `page:${page.href}`),
  ];
  const version = `${query}|${fetched?.key ?? ""}`;
  const selectedValue =
    selection?.version === version && values.includes(selection.value)
      ? selection.value
      : (values[0] ?? "");

  const tooShort = canSearchRecords && trimmed.length > 0 && !term;
  const nothingFound =
    trimmed.length > 0 && !tooShort && !isLoading && !failed && groups.length === 0 && pages.length === 0;

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

  return (
    <Command
      shouldFilter={false}
      value={selectedValue}
      onValueChange={(value) => setSelection({ value, version })}
      loop
      vimBindings={false}
      label={t("label")}
      className="relative h-auto w-full max-w-md overflow-visible rounded-lg bg-transparent"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              if (open) setOpen(false);
              else inputRef.current?.blur();
            } else if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              setOpen(true);
            }
          }}
          placeholder={t("placeholder")}
          className="flex h-9 w-full rounded-lg border border-transparent bg-background/60 ps-10 pe-14 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-input focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:text-sm"
        />
        <div className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <kbd className="hidden rounded border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground sm:inline-block">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          )}
        </div>
      </div>

      {open && (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
          // Keep focus in the input when clicking results or scrolling the list.
          onMouseDown={(event) => event.preventDefault()}
        >
          <CommandList className="max-h-[min(420px,70vh)]">
            {groups.map((group) => {
              const Icon = RESULT_ICONS[group.type];
              return (
                <CommandGroup key={group.type} heading={t(`groups.${group.type}`)}>
                  {group.items.map((result) => (
                    <CommandItem
                      key={resultValue(result)}
                      value={resultValue(result)}
                      onSelect={() => navigate(result.href)}
                      className="gap-3 py-2"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{result.title}</p>
                        {result.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

            {pages.length > 0 && (
              <CommandGroup heading={t("groups.pages")}>
                {pages.map((page) => (
                  <CommandItem
                    key={page.href}
                    value={`page:${page.href}`}
                    onSelect={() => navigate(page.href)}
                    className="gap-3"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{page.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

          </CommandList>

          <div role="status" aria-live="polite">
            {isLoading && groups.length === 0 && (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("loading")}
              </p>
            )}
            {failed && <p className="px-4 py-6 text-center text-sm text-destructive">{t("error")}</p>}
            {tooShort && (
              <p className="px-4 py-3 text-center text-xs text-muted-foreground">
                {t("min_chars", { count: SEARCH_MIN_QUERY_LENGTH })}
              </p>
            )}
            {nothingFound && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("empty", { query: trimmed })}
              </p>
            )}
            {!trimmed && canSearchRecords && (
              <p className="px-4 py-3 text-center text-xs text-muted-foreground">
                {t("hint")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="font-sans">↑↓</kbd> {t("keys.navigate")}
            </span>
            <span>
              <kbd className="font-sans">↵</kbd> {t("keys.open")}
            </span>
            <span>
              <kbd className="font-sans">Esc</kbd> {t("keys.close")}
            </span>
          </div>
        </div>
      )}
    </Command>
  );
}
