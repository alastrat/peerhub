"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  createTemplateSchema,
  type CreateTemplateInput,
} from "@/lib/validations/template";
import { createTemplate, updateTemplate } from "@/lib/actions/templates";
import {
  REVIEWER_TYPE_LABELS,
  REVIEWER_TYPE_DESCRIPTIONS,
} from "@/lib/constants/roles";
import type { ReviewerType, QuestionType } from "@prisma/client";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  RATING: "Rating Scale (1-5)",
  TEXT: "Open Text",
  COMPETENCY_RATING: "Competency Rating",
  MULTIPLE_CHOICE: "Multiple Choice",
};

const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  RATING: "A numeric rating from 1 to 5 stars",
  TEXT: "A free-form text response",
  COMPETENCY_RATING: "Rate against a predefined competency",
  MULTIPLE_CHOICE: "Select from multiple options",
};

const REVIEWER_TYPES: ReviewerType[] = [
  "SELF",
  "MANAGER",
  "PEER",
  "DIRECT_REPORT",
  "EXTERNAL",
];

interface TemplateBuilderProps {
  initialData?: CreateTemplateInput & { id?: string };
  mode?: "create" | "edit";
}

export function TemplateBuilder({
  initialData,
  mode = "create",
}: TemplateBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0])
  );

  const form = useForm<CreateTemplateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createTemplateSchema) as any,
    defaultValues: initialData || {
      name: "",
      description: "",
      sections: [
        {
          title: "Performance",
          description: "",
          order: 0,
          reviewerTypes: ["SELF", "MANAGER", "PEER"],
          questions: [
            {
              text: "",
              description: "",
              type: "RATING" as QuestionType,
              isRequired: true,
              order: 0,
            },
          ],
        },
      ],
    },
  });

  const {
    fields: sections,
    append: appendSection,
    remove: removeSection,
    move: moveSection,
  } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  function toggleSection(index: number) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  }

  function addSection() {
    appendSection({
      title: `Section ${sections.length + 1}`,
      description: "",
      order: sections.length,
      reviewerTypes: ["SELF", "MANAGER", "PEER"],
      questions: [],
    });
    setExpandedSections(new Set([...expandedSections, sections.length]));
  }

  function onSubmit(data: CreateTemplateInput) {
    // Ensure orders are correct
    const normalizedData = {
      ...data,
      sections: data.sections.map((section, sIndex) => ({
        ...section,
        order: sIndex,
        questions: section.questions.map((q, qIndex) => ({
          ...q,
          order: qIndex,
        })),
      })),
    };

    startTransition(async () => {
      const result =
        mode === "edit" && initialData?.id
          ? await updateTemplate(initialData.id, normalizedData)
          : await createTemplate(normalizedData);

      if (result.success) {
        toast.success(
          mode === "edit"
            ? "Template updated successfully"
            : "Template created successfully"
        );
        router.push("/templates");
        router.refresh();
      } else {
        toast.error(result.error || "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Q1 Performance Review" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A comprehensive review template for quarterly performance evaluations..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Sections</h3>
            <Button type="button" variant="outline" onClick={addSection}>
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>

          {sections.map((section, sectionIndex) => (
            <SectionBuilder
              key={section.id}
              form={form}
              sectionIndex={sectionIndex}
              isExpanded={expandedSections.has(sectionIndex)}
              onToggle={() => toggleSection(sectionIndex)}
              onRemove={() => {
                removeSection(sectionIndex);
                const newExpanded = new Set(expandedSections);
                newExpanded.delete(sectionIndex);
                setExpandedSections(newExpanded);
              }}
              onMoveUp={() => {
                if (sectionIndex > 0) {
                  moveSection(sectionIndex, sectionIndex - 1);
                }
              }}
              onMoveDown={() => {
                if (sectionIndex < sections.length - 1) {
                  moveSection(sectionIndex, sectionIndex + 1);
                }
              }}
              canMoveUp={sectionIndex > 0}
              canMoveDown={sectionIndex < sections.length - 1}
              sectionsCount={sections.length}
            />
          ))}

          {sections.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  No sections yet. Add your first section to get started.
                </p>
                <Button type="button" onClick={addSection}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface SectionBuilderProps {
  form: ReturnType<typeof useForm<CreateTemplateInput>>;
  sectionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  sectionsCount: number;
}

function SectionBuilder({
  form,
  sectionIndex,
  isExpanded,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  sectionsCount,
}: SectionBuilderProps) {
  const {
    fields: questions,
    append: appendQuestion,
    remove: removeQuestion,
    move: moveQuestion,
  } = useFieldArray({
    control: form.control,
    name: `sections.${sectionIndex}.questions`,
  });

  const sectionTitle = form.watch(`sections.${sectionIndex}.title`);
  const reviewerTypes = form.watch(`sections.${sectionIndex}.reviewerTypes`);

  function addQuestion() {
    appendQuestion({
      text: "",
      description: "",
      type: "RATING" as QuestionType,
      isRequired: true,
      order: questions.length,
    });
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">
                    {sectionTitle || `Section ${sectionIndex + 1}`}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {questions.length} question{questions.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex gap-1">
                      {reviewerTypes?.slice(0, 3).map((type: ReviewerType) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {REVIEWER_TYPE_LABELS[type]}
                        </Badge>
                      ))}
                      {reviewerTypes?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{reviewerTypes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp();
                  }}
                  disabled={!canMoveUp}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown();
                  }}
                  disabled={!canMoveDown}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  disabled={sectionsCount <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Section Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name={`sections.${sectionIndex}.title`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Performance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`sections.${sectionIndex}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Rate overall job performance..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reviewer Types */}
            <FormField
              control={form.control}
              name={`sections.${sectionIndex}.reviewerTypes`}
              render={() => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Visible to</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Select which reviewer types will see and answer the
                          questions in this section.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {REVIEWER_TYPES.map((type) => (
                      <FormField
                        key={type}
                        control={form.control}
                        name={`sections.${sectionIndex}.reviewerTypes`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, type]);
                                  } else {
                                    field.onChange(
                                      current.filter((t: ReviewerType) => t !== type)
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {REVIEWER_TYPE_LABELS[type]}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Questions</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Question
                </Button>
              </div>

              {questions.map((question, questionIndex) => (
                <QuestionBuilder
                  key={question.id}
                  form={form}
                  sectionIndex={sectionIndex}
                  questionIndex={questionIndex}
                  onRemove={() => removeQuestion(questionIndex)}
                  onMoveUp={() => {
                    if (questionIndex > 0) {
                      moveQuestion(questionIndex, questionIndex - 1);
                    }
                  }}
                  onMoveDown={() => {
                    if (questionIndex < questions.length - 1) {
                      moveQuestion(questionIndex, questionIndex + 1);
                    }
                  }}
                  canMoveUp={questionIndex > 0}
                  canMoveDown={questionIndex < questions.length - 1}
                />
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    No questions in this section yet.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addQuestion}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add Question
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface QuestionBuilderProps {
  form: ReturnType<typeof useForm<CreateTemplateInput>>;
  sectionIndex: number;
  questionIndex: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function QuestionBuilder({
  form,
  sectionIndex,
  questionIndex,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: QuestionBuilderProps) {
  const questionType = form.watch(
    `sections.${sectionIndex}.questions.${questionIndex}.type`
  );

  return (
    <div className="flex gap-3 items-start p-4 border rounded-lg bg-muted/30">
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onMoveUp}
          disabled={!canMoveUp}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onMoveDown}
          disabled={!canMoveDown}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name={`sections.${sectionIndex}.questions.${questionIndex}.text`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="How would you rate this person's communication skills?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name={`sections.${sectionIndex}.questions.${questionIndex}.type`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {QUESTION_TYPE_LABELS[type]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={`sections.${sectionIndex}.questions.${questionIndex}.description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Help Text (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Consider their written and verbal communication..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sections.${sectionIndex}.questions.${questionIndex}.isRequired`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Required</FormLabel>
            </FormItem>
          )}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
