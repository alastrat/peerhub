"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseQuestionsCsv,
  type ParsedQuestionRow,
  type ParseResult,
  type RowError,
} from "@/lib/utils/climate-questions-csv";

interface DimensionOption {
  id: string;
  name: string;
}

interface ImportQuestionsDialogProps {
  dimensions: DimensionOption[];
  onImport: (questions: ParsedQuestionRow[], mode: "replace" | "append") => void;
}

const TEMPLATE_HREF = "/climate-questions-template.csv";

export function ImportQuestionsDialog({
  dimensions,
  onImport,
}: ImportQuestionsDialogProps) {
  const t = useTranslations("dashboard.climate.wizard.import");
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setFileName(null);
    setParseError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseQuestionsCsv(text, dimensions);
      setFileName(file.name);
      setResult(parsed);
      setParseError(null);
    } catch {
      setParseError(t("errors.parse_failed"));
      setResult(null);
    }
  }

  function handleConfirm(mode: "replace" | "append") {
    if (!result || result.valid.length === 0) return;
    onImport(result.valid, mode);
    handleClose(false);
  }

  const total = result?.total ?? 0;
  const validCount = result?.valid.length ?? 0;
  const invalidCount = result?.errors.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("choose_file")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button asChild variant="ghost" size="sm">
              <a href={TEMPLATE_HREF} download>
                <Download className="mr-2 h-4 w-4" />
                {t("download_template")}
              </a>
            </Button>
          </div>

          {!result && !parseError && (
            <p className="text-sm text-muted-foreground">{t("no_file")}</p>
          )}

          {parseError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{parseError}</span>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">{fileName}</span>
                {" — "}
                {t("summary", {
                  total,
                  valid: validCount,
                  invalid: invalidCount,
                })}
              </div>

              <div className="max-h-80 overflow-auto rounded-md border">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{t("table.row")}</TableHead>
                      <TableHead className="w-[40%]">{t("table.text")}</TableHead>
                      <TableHead className="w-24">{t("table.type")}</TableHead>
                      <TableHead className="w-32">{t("table.dimension")}</TableHead>
                      <TableHead className="w-24">{t("table.required")}</TableHead>
                      <TableHead className="w-40">{t("table.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <ValidRows rows={result.valid} dimensions={dimensions} okLabel={t("table.ok")} />
                    <ErrorRows
                      errors={result.errors}
                      tFn={(key) => t(`errors.${key}` as never)}
                    />
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" type="button" onClick={() => handleClose(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={!result || validCount === 0}
            onClick={() => handleConfirm("append")}
          >
            {t("actions.append")}
          </Button>
          <Button
            type="button"
            disabled={!result || validCount === 0}
            onClick={() => handleConfirm("replace")}
          >
            {t("actions.replace")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValidRows({
  rows,
  dimensions,
  okLabel,
}: {
  rows: ParsedQuestionRow[];
  dimensions: DimensionOption[];
  okLabel: string;
}) {
  const dimMap = new Map(dimensions.map((d) => [d.id, d.name]));
  return (
    <>
      {rows.map((r, i) => (
        <TableRow key={`v-${i}`}>
          <TableCell>—</TableCell>
          <TableCell className="truncate" title={r.text}>{r.text}</TableCell>
          <TableCell className="truncate">{r.type}</TableCell>
          <TableCell className="truncate">
            {r.dimensionId ? dimMap.get(r.dimensionId) || "—" : "—"}
          </TableCell>
          <TableCell>{r.isRequired ? "✓" : "—"}</TableCell>
          <TableCell className="truncate">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{okLabel}</span>
            </span>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function ErrorRows({
  errors,
  tFn,
}: {
  errors: RowError[];
  tFn: (key: string) => string;
}) {
  return (
    <>
      {errors.map((e, i) => (
        <TableRow key={`e-${i}`} className="bg-destructive/5">
          <TableCell>{e.row}</TableCell>
          <TableCell className="truncate" title={e.raw?.text}>
            {e.raw?.text ?? "—"}
          </TableCell>
          <TableCell className="truncate">{e.raw?.type ?? "—"}</TableCell>
          <TableCell className="truncate">{e.raw?.dimension ?? "—"}</TableCell>
          <TableCell>{e.raw?.required ?? "—"}</TableCell>
          <TableCell className="truncate">
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">{tFn(e.message)}</span>
            </span>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
