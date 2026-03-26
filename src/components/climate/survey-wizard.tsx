"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createClimateSurvey } from "@/lib/actions/climate-surveys";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_FREQUENCY_LABELS,
} from "@/lib/constants/climate-survey";

interface DimensionOption {
  id: string;
  name: string;
}

interface QuestionRow {
  text: string;
  type: "LIKERT" | "TEXT" | "NPS" | "RATING";
  dimensionId: string;
  isRequired: boolean;
}

const STEPS = ["Basics", "Questions", "Review"];

const DEFAULT_ENPS_QUESTIONS: QuestionRow[] = [
  {
    text: "How likely are you to recommend this company as a place to work to a friend or colleague?",
    type: "NPS",
    dimensionId: "",
    isRequired: true,
  },
  {
    text: "What is the primary reason for your score?",
    type: "TEXT",
    dimensionId: "",
    isRequired: false,
  },
];

export function SurveyWizard({ dimensions }: { dimensions: DimensionOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  // Step 1: Basics
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [surveyType, setSurveyType] = useState<"CLIMATE" | "PULSE" | "ENPS">("CLIMATE");
  const [frequency, setFrequency] = useState("ONCE");
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Step 2: Questions
  const [questions, setQuestions] = useState<QuestionRow[]>([
    { text: "", type: "LIKERT", dimensionId: "", isRequired: true },
  ]);

  const handleTypeChange = (type: "CLIMATE" | "PULSE" | "ENPS") => {
    setSurveyType(type);
    if (type === "ENPS") {
      setQuestions(DEFAULT_ENPS_QUESTIONS);
      setFrequency("QUARTERLY");
    } else if (type === "PULSE") {
      setFrequency("MONTHLY");
      setQuestions([{ text: "", type: "LIKERT", dimensionId: "", isRequired: true }]);
    } else {
      setFrequency("ONCE");
      setQuestions([{ text: "", type: "LIKERT", dimensionId: "", isRequired: true }]);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: "", type: "LIKERT", dimensionId: "", isRequired: true },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionRow, value: string | boolean) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return questions.length > 0 && questions.every((q) => q.text.trim().length > 0);
    return true;
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createClimateSurvey({
        name: name.trim(),
        description: description.trim() || undefined,
        type: surveyType,
        frequency,
        isAnonymous,
        questions: questions.map((q, i) => ({
          text: q.text.trim(),
          type: q.type,
          dimensionId: q.dimensionId || undefined,
          order: i,
          isRequired: q.isRequired,
        })),
      });
      if (result.success) {
        router.push(`/surveys/climate/${result.data?.id}`);
      } else {
        setError(result.error || "Failed to create survey");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? "bg-[#613171] text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i <= step ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Step 1: Basics */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Survey Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q1 2026 Climate Survey"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this survey..."
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Survey Type</Label>
                <Select value={surveyType} onValueChange={(v) => handleTypeChange(v as "CLIMATE" | "PULSE" | "ENPS")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLIMATE_SURVEY_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SURVEY_FREQUENCY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end space-x-2 pb-1">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous">Anonymous</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Questions */}
      {step === 1 && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 text-sm font-medium text-muted-foreground w-6">
                      {i + 1}.
                    </span>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(i, "text", e.target.value)}
                        placeholder="Enter question text..."
                      />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={q.type}
                            onValueChange={(v) => updateQuestion(i, "type", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SURVEY_QUESTION_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dimension</Label>
                          <Select
                            value={q.dimensionId || "none"}
                            onValueChange={(v) => updateQuestion(i, "dimensionId", v === "none" ? "" : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No dimension" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No dimension</SelectItem>
                              {dimensions.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={q.isRequired}
                              onCheckedChange={(v) => updateQuestion(i, "isRequired", v)}
                            />
                            <Label className="text-xs">Required</Label>
                          </div>
                          {questions.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeQuestion(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Survey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="secondary">{CLIMATE_SURVEY_TYPE_LABELS[surveyType]}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="font-medium">{SURVEY_FREQUENCY_LABELS[frequency]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Anonymous</p>
                <p className="font-medium">{isAnonymous ? "Yes" : "No"}</p>
              </div>
            </div>
            {description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Questions ({questions.length})
              </p>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {SURVEY_QUESTION_TYPE_LABELS[q.type]}
                        </Badge>
                        {q.isRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push("/surveys/climate") : setStep(step - 1))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !canProceed()}>
            {isPending ? "Creating..." : "Create Survey"}
          </Button>
        )}
      </div>
    </div>
  );
}
