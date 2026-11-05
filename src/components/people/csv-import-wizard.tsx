"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/constants/roles";
import {
  IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
  TEMPLATE_FILENAME,
  TEMPLATE_HREF,
  autoMapColumns,
  orderForImport,
  validateEmployeeRows,
  type ColumnMapping,
  type ImportField,
  type ImportIssue,
  type ImportRowResult,
  type ImportTable,
} from "@/lib/utils/employee-import";
import { parseEmployeeFile } from "@/lib/utils/employee-import-file";
import type { CompanyRole } from "@prisma/client";

// Radix Select can't have an empty-string item value
const SKIP_COLUMN = "__skip";

type WizardStep = "upload" | "mapping" | "review" | "importing" | "complete";

export function CSVImportWizard() {
  const t = useTranslations("people_import");
  const locale = useLocale();
  const router = useRouter();
  const columnLabel = (col: ImportField) => t(`columns.${col}`);

  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<ImportTable>({ headers: [], rows: [], rowNumbers: [] });
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<ImportRowResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const { headers, rows } = table;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0];
    if (!droppedFile) return;

    let parsed: ImportTable;
    try {
      parsed = await parseEmployeeFile(droppedFile);
    } catch {
      toast.error(t("errors.file_unreadable"));
      return;
    }
    if (parsed.rows.length === 0) {
      toast.error(t("errors.file_too_short"));
      return;
    }

    setFile(droppedFile);
    setTable(parsed);
    setColumnMapping(autoMapColumns(parsed.headers));
    setStep("mapping");
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
  });

  function issueText(issue: ImportIssue): string {
    const value = issue.value ?? "";
    switch (issue.code) {
      case "invalid_date":
        return t("errors.invalid_date", { column: columnLabel(issue.field!), value });
      case "birth_date_range":
        return t("errors.birth_date_range", { column: columnLabel("birthDate") });
      case "manager_not_in_file":
        return t("warnings.manager_not_in_file", { value });
      case "gender_unknown":
      case "job_level_unknown":
      case "duplicate_national_id":
      case "duplicate_email":
        return t(`errors.${issue.code}`, { value });
      default:
        return t(`errors.${issue.code}`);
    }
  }

  function resetFile() {
    setFile(null);
    setTable({ headers: [], rows: [], rowNumbers: [] });
    setStep("upload");
  }

  function handleMapping() {
    // Check required columns are mapped
    const missingRequired = REQUIRED_IMPORT_FIELDS.filter((col) => columnMapping[col] === undefined);

    if (missingRequired.length > 0) {
      toast.error(t("errors.map_required", { columns: missingRequired.map(columnLabel).join(", ") }));
      return;
    }

    setValidationResults(validateEmployeeRows(table, columnMapping));
    setStep("review");
  }

  async function handleImport() {
    setStep("importing");
    setImportProgress(0);

    // Leaders first, so each person's leader already exists when they're imported
    const validRows = orderForImport(validationResults.filter((r) => r.errors.length === 0));
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        const response = await fetch("/api/people/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.data),
        });

        if (response.ok) {
          success++;
          const result = await response.json();
          if (result.warning) warnings.push(t("errors.row", { row: row.row, message: result.warning }));
        } else {
          const error = await response.json();
          failed++;
          errors.push(t("errors.row", { row: row.row, message: error.message || t("errors.import_failed") }));
        }
      } catch {
        failed++;
        errors.push(t("errors.row", { row: row.row, message: t("errors.network") }));
      }

      setImportProgress(((i + 1) / validRows.length) * 100);
    }

    setImportResults({ success, failed, errors, warnings });
    setStep("complete");
  }

  const showRole = columnMapping.role !== undefined;
  const validCount = validationResults.filter((r) => r.errors.length === 0).length;
  const invalidCount = validationResults.filter((r) => r.errors.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["upload", "mapping", "review", "importing", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["complete", "importing"].includes(step) && i < 4
                    ? "bg-primary text-primary-foreground"
                    : step === "review" && i < 3
                    ? "bg-primary text-primary-foreground"
                    : step === "mapping" && i < 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < 4 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mx-2",
                    step === "complete"
                      ? "bg-primary"
                      : step === "importing" && i < 3
                      ? "bg-primary"
                      : step === "review" && i < 2
                      ? "bg-primary"
                      : step === "mapping" && i < 1
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        {/* Kultiva's employee format, served as-is from /public */}
        <Button variant="outline" size="sm" asChild>
          <a href={TEMPLATE_HREF} download={TEMPLATE_FILENAME}>
            <Download className="mr-2 h-4 w-4" />
            {t("download_template")}
          </a>
        </Button>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("upload.title")}</CardTitle>
            <CardDescription>{t("upload.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">
                {isDragActive ? t("upload.drop_active") : t("upload.drop_idle")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("upload.browse")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("mapping.title")}</CardTitle>
            <CardDescription>{t("mapping.description", { count: rows.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8"
                  onClick={resetFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {IMPORT_FIELDS.map((col) => (
                <div key={col} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {columnLabel(col)}
                    {REQUIRED_IMPORT_FIELDS.includes(col) && (
                      <Badge variant="destructive" className="text-xs">
                        {t("mapping.required")}
                      </Badge>
                    )}
                  </label>
                  <Select
                    value={columnMapping[col]?.toString() ?? SKIP_COLUMN}
                    onValueChange={(value) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [col]: value === SKIP_COLUMN ? undefined : Number(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("mapping.select_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP_COLUMN}>{t("mapping.skip")}</SelectItem>
                      {headers.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("mapping.preview")}</h4>
                <ScrollArea horizontal className="h-48 rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h, i) => (
                          <TableHead key={i} className="whitespace-nowrap">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="whitespace-nowrap">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={resetFile}>
                {t("back")}
              </Button>
              <Button onClick={handleMapping}>{t("continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("review.title")}</CardTitle>
            <CardDescription>{t("review.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">{t("review.valid_count", { count: validCount })}</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">{t("review.invalid_count", { count: invalidCount })}</span>
                </div>
              )}
            </div>

            <ScrollArea horizontal className="h-96 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("review.table.row")}</TableHead>
                    <TableHead className="w-24">{t("review.table.status")}</TableHead>
                    <TableHead>{t("review.table.national_id")}</TableHead>
                    <TableHead>{t("review.table.name")}</TableHead>
                    <TableHead>{t("review.table.email")}</TableHead>
                    <TableHead>{t("review.table.title")}</TableHead>
                    <TableHead>{t("review.table.department")}</TableHead>
                    <TableHead>{t("review.table.manager")}</TableHead>
                    {showRole && <TableHead>{t("review.table.role")}</TableHead>}
                    <TableHead>{t("review.table.errors")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow
                      key={result.row}
                      className={result.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.errors.length === 0 ? (
                          <Badge className="bg-green-600">{t("review.valid")}</Badge>
                        ) : (
                          <Badge variant="destructive">{t("review.error")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{result.data.nationalId || "-"}</TableCell>
                      <TableCell>{result.data.name || "-"}</TableCell>
                      <TableCell>{result.data.email || "-"}</TableCell>
                      <TableCell>{result.data.title || "-"}</TableCell>
                      <TableCell>{result.data.department || "-"}</TableCell>
                      <TableCell>
                        {result.data.managerName || result.data.managerNationalId || result.data.managerEmail || "-"}
                      </TableCell>
                      {showRole && (
                        <TableCell>
                          {result.data.role
                            ? getRoleLabel(result.data.role as CompanyRole, locale)
                            : t("review.default_role")}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        <span className="text-destructive">{result.errors.map(issueText).join(", ")}</span>
                        {result.warnings.length > 0 && (
                          <span className="block text-amber-700 dark:text-amber-400">
                            {result.warnings.map(issueText).join(", ")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                {t("back")}
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                {t("review.import", { count: validCount })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("importing.title")}</CardTitle>
            <CardDescription>{t("importing.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {t("importing.progress", { percent: Math.round(importProgress) })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === "complete" && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              {t("complete.title")}
            </CardTitle>
            <CardDescription>{t("complete.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg flex-1">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">{t("complete.imported", { count: importResults.success })}</p>
                  <p className="text-sm text-muted-foreground">{t("complete.imported_hint")}</p>
                </div>
              </div>
              {importResults.failed > 0 && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg flex-1">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-medium">{t("complete.failed", { count: importResults.failed })}</p>
                    <p className="text-sm text-muted-foreground">{t("complete.failed_hint")}</p>
                  </div>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("complete.errors")}</h4>
                <ScrollArea className="h-32 rounded border p-4">
                  <ul className="space-y-1 text-sm text-destructive">
                    {importResults.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {importResults.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("complete.warnings")}</h4>
                <ScrollArea className="h-32 rounded border p-4">
                  <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                    {importResults.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.push("/people")}>
                {t("complete.view_people")}
              </Button>
              <Button
                onClick={() => {
                  resetFile();
                  setColumnMapping({});
                  setValidationResults([]);
                  setImportResults(null);
                }}
              >
                {t("complete.import_more")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
