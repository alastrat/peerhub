"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { isValidBirthDate, parseGender } from "@/lib/constants/demographics";

interface ParsedRow {
  email?: string;
  name?: string;
  title?: string;
  department?: string;
  managerEmail?: string;
  role?: string;
  [key: string]: string | undefined;
}

interface ValidationResult {
  row: number;
  errors: string[];
  data: ParsedRow;
}

const REQUIRED_COLUMNS = ["email", "name"];
const OPTIONAL_COLUMNS = ["title", "department", "managerEmail", "role", "startDate", "gender", "birthDate"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

type WizardStep = "upload" | "mapping" | "review" | "importing" | "complete";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function CSVImportWizard() {
  const t = useTranslations("people_import");
  const router = useRouter();
  const columnLabel = (col: string) => t(`columns.${col}`);

  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (!csvFile) return;

    setFile(csvFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error(t("errors.file_too_short"));
        return;
      }

      const parsedHeaders = parseCSVLine(lines[0]);
      const parsedRows = lines.slice(1).map(parseCSVLine);

      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      parsedHeaders.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z]/g, "");
        ALL_COLUMNS.forEach((col) => {
          const normalizedCol = col.toLowerCase();
          if (
            normalized === normalizedCol ||
            normalized.includes(normalizedCol) ||
            normalizedCol.includes(normalized)
          ) {
            autoMapping[col] = index.toString();
          }
        });
      });
      setColumnMapping(autoMapping);

      setStep("mapping");
    };
    reader.readAsText(csvFile);
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

  function validateRows(): ValidationResult[] {
    const results: ValidationResult[] = [];

    rows.forEach((row, index) => {
      const errors: string[] = [];
      const data: ParsedRow = {};

      // Extract mapped data
      Object.entries(columnMapping).forEach(([field, colIndex]) => {
        if (colIndex !== "" && colIndex !== undefined) {
          data[field] = row[parseInt(colIndex)]?.trim() || "";
        }
      });

      // Validate required fields
      if (!data.email) {
        errors.push(t("errors.email_required"));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push(t("errors.email_invalid"));
      }

      if (!data.name || data.name.length < 2) {
        errors.push(t("errors.name_too_short"));
      }

      // Validate role if provided
      if (data.role && !["ADMIN", "MANAGER", "MEMBER"].includes(data.role.toUpperCase())) {
        errors.push(t("errors.role_invalid"));
      }

      if (data.gender && !parseGender(data.gender)) {
        errors.push(t("errors.gender_unknown", { value: data.gender }));
      }
      for (const key of ["startDate", "birthDate"] as const) {
        if (data[key] && Number.isNaN(new Date(data[key]!).getTime())) {
          errors.push(t("errors.invalid_date", { column: columnLabel(key), value: data[key]! }));
        }
      }
      // Same limits as /api/people/import, so these rows fail here, not mid-import
      if (data.birthDate && !Number.isNaN(new Date(data.birthDate).getTime()) && !isValidBirthDate(new Date(data.birthDate))) {
        errors.push(t("errors.birth_date_range", { column: columnLabel("birthDate") }));
      }

      results.push({
        row: index + 2, // 1-indexed, accounting for header
        errors,
        data,
      });
    });

    return results;
  }

  function handleMapping() {
    // Check required columns are mapped
    const missingRequired = REQUIRED_COLUMNS.filter(
      (col) => !columnMapping[col] || columnMapping[col] === ""
    );

    if (missingRequired.length > 0) {
      toast.error(t("errors.map_required", { columns: missingRequired.map(columnLabel).join(", ") }));
      return;
    }

    const results = validateRows();
    setValidationResults(results);
    setStep("review");
  }

  async function handleImport() {
    setStep("importing");
    setImportProgress(0);

    const validRows = validationResults.filter((r) => r.errors.length === 0);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

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

    setImportResults({ success, failed, errors });
    setStep("complete");
  }

  function downloadTemplate() {
    const csvContent = [
      ["email", "name", "title", "department", "managerEmail", "role", "startDate", "gender", "birthDate"].join(","),
      ["john@example.com", "John Doe", "Software Engineer", "Engineering", "manager@example.com", "Employee", "2022-03-01", "M", "1990-06-15"].join(","),
      ["jane@example.com", "Jane Smith", "Product Manager", "Product", "", "Manager", "2019-08-12", "F", "1985-01-20"].join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          {t("download_template")}
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
                  onClick={() => {
                    setFile(null);
                    setHeaders([]);
                    setRows([]);
                    setStep("upload");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {ALL_COLUMNS.map((col) => (
                <div key={col} className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    {columnLabel(col)}
                    {REQUIRED_COLUMNS.includes(col) && (
                      <Badge variant="destructive" className="text-xs">
                        {t("mapping.required")}
                      </Badge>
                    )}
                  </label>
                  <Select
                    value={columnMapping[col] || ""}
                    onValueChange={(value) =>
                      setColumnMapping((prev) => ({ ...prev, [col]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("mapping.select_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("mapping.skip")}</SelectItem>
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
                <ScrollArea className="h-48 rounded border">
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
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setHeaders([]);
                  setRows([]);
                  setStep("upload");
                }}
              >
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

            <ScrollArea className="h-96 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("review.table.row")}</TableHead>
                    <TableHead className="w-24">{t("review.table.status")}</TableHead>
                    <TableHead>{t("review.table.email")}</TableHead>
                    <TableHead>{t("review.table.name")}</TableHead>
                    <TableHead>{t("review.table.title")}</TableHead>
                    <TableHead>{t("review.table.department")}</TableHead>
                    <TableHead>{t("review.table.role")}</TableHead>
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
                      <TableCell>{result.data.email || "-"}</TableCell>
                      <TableCell>{result.data.name || "-"}</TableCell>
                      <TableCell>{result.data.title || "-"}</TableCell>
                      <TableCell>{result.data.department || "-"}</TableCell>
                      <TableCell>{result.data.role || t("review.default_role")}</TableCell>
                      <TableCell className="text-destructive text-sm">
                        {result.errors.join(", ")}
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

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => router.push("/people")}>
                {t("complete.view_people")}
              </Button>
              <Button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setHeaders([]);
                  setRows([]);
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
