"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
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

interface Department {
  id: string;
  name: string;
}

interface CSVImportWizardProps {
  departments: Department[];
}

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
const OPTIONAL_COLUMNS = ["title", "department", "managerEmail", "role"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const COLUMN_LABELS: Record<string, string> = {
  email: "Email Address",
  name: "Full Name",
  title: "Job Title",
  department: "Department",
  managerEmail: "Manager Email",
  role: "Role",
};

type WizardStep = "upload" | "mapping" | "review" | "importing" | "complete";

export function CSVImportWizard({ departments }: CSVImportWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
        toast.error("CSV file must have a header row and at least one data row");
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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

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
        errors.push("Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push("Invalid email format");
      }

      if (!data.name || data.name.length < 2) {
        errors.push("Name must be at least 2 characters");
      }

      // Validate role if provided
      if (data.role && !["ADMIN", "MANAGER", "EMPLOYEE"].includes(data.role.toUpperCase())) {
        errors.push("Role must be Admin, Manager, or Employee");
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
      toast.error(`Please map required columns: ${missingRequired.join(", ")}`);
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
          errors.push(`Row ${row.row}: ${error.message || "Failed to import"}`);
        }
      } catch {
        failed++;
        errors.push(`Row ${row.row}: Network error`);
      }

      setImportProgress(((i + 1) / validRows.length) * 100);
    }

    setImportResults({ success, failed, errors });
    setStep("complete");
  }

  function downloadTemplate() {
    const csvContent = [
      ["email", "name", "title", "department", "managerEmail", "role"].join(","),
      ["john@example.com", "John Doe", "Software Engineer", "Engineering", "manager@example.com", "Employee"].join(","),
      ["jane@example.com", "Jane Smith", "Product Manager", "Product", "", "Manager"].join(","),
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
          Download Template
        </Button>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with employee data. Required columns: email, name.
            </CardDescription>
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
                {isDragActive ? "Drop the file here" : "Drag & drop your CSV file here"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                or click to browse files
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to the required fields. Found {rows.length} rows.
            </CardDescription>
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
                    {COLUMN_LABELS[col]}
                    {REQUIRED_COLUMNS.includes(col) && (
                      <Badge variant="destructive" className="text-xs">
                        Required
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
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Skip --</SelectItem>
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
                <h4 className="text-sm font-medium">Preview (first 5 rows)</h4>
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
                Back
              </Button>
              <Button onClick={handleMapping}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review Import</CardTitle>
            <CardDescription>
              Review the data before importing. Fix any errors in your CSV and re-upload if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">{validCount} valid</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium">{invalidCount} with errors</span>
                </div>
              )}
            </div>

            <ScrollArea className="h-96 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Errors</TableHead>
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
                          <Badge className="bg-green-600">Valid</Badge>
                        ) : (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </TableCell>
                      <TableCell>{result.data.email || "-"}</TableCell>
                      <TableCell>{result.data.name || "-"}</TableCell>
                      <TableCell>{result.data.title || "-"}</TableCell>
                      <TableCell>{result.data.department || "-"}</TableCell>
                      <TableCell>{result.data.role || "Employee"}</TableCell>
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
                Back
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Import {validCount} Employees
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <Card>
          <CardHeader>
            <CardTitle>Importing...</CardTitle>
            <CardDescription>
              Please wait while we import your employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(importProgress)}% complete
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
              Import Complete
            </CardTitle>
            <CardDescription>
              Your employee import has finished.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg flex-1">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">{importResults.success} imported</p>
                  <p className="text-sm text-muted-foreground">Successfully added</p>
                </div>
              </div>
              {importResults.failed > 0 && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg flex-1">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-medium">{importResults.failed} failed</p>
                    <p className="text-sm text-muted-foreground">Could not import</p>
                  </div>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Errors:</h4>
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
                View Employees
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
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
