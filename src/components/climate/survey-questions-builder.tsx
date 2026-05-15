"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SURVEY_QUESTION_TYPE_LABELS } from "@/lib/constants/climate-survey";
import { DimensionCombobox, type DimensionOption } from "./dimension-combobox";

export type QuestionType = "LIKERT" | "TEXT" | "NPS" | "RATING";

export interface QuestionRow {
  text: string;
  type: QuestionType;
  dimensionId: string;
  isRequired: boolean;
}

interface SectionState {
  /** Stable client-side id used for React keys and tracking through mutations. */
  uid: string;
  /** Real ClimateDimension id once chosen; empty string while a new section is
   *  waiting for the user to pick or create a dimension. */
  dimensionId: string;
  questions: QuestionRow[];
}

interface Props {
  questions: QuestionRow[];
  dimensions: DimensionOption[];
  onChange: (questions: QuestionRow[]) => void;
  onDimensionCreated: (dim: DimensionOption) => void;
}

const uid = () => Math.random().toString(36).slice(2, 9);

function deriveSections(
  questions: QuestionRow[],
  prevSections?: SectionState[],
): SectionState[] {
  // Group incoming flat questions by dimensionId in first-seen order so the
  // user's existing section ordering is preserved. Questions with no dimension
  // share an "unclassified" bucket (rendered as a section the user must
  // resolve before saving).
  const order: string[] = [];
  const grouped: Record<string, QuestionRow[]> = {};
  for (const q of questions) {
    const key = q.dimensionId || "";
    if (!(key in grouped)) {
      grouped[key] = [];
      order.push(key);
    }
    grouped[key].push(q);
  }

  // Reuse the previous section's uid when its dimensionId still exists so the
  // expanded/collapsed state survives a re-derivation.
  const prevByDim = new Map(prevSections?.map((s) => [s.dimensionId, s]) ?? []);

  return order.map((dimId) => ({
    uid: prevByDim.get(dimId)?.uid ?? uid(),
    dimensionId: dimId,
    questions: grouped[dimId],
  }));
}

function flatten(sections: SectionState[]): QuestionRow[] {
  return sections.flatMap((s) =>
    s.questions.map((q) => ({ ...q, dimensionId: s.dimensionId })),
  );
}

export function SurveyQuestionsBuilder({
  questions,
  dimensions,
  onChange,
  onDimensionCreated,
}: Props) {
  const t = useTranslations("dashboard.climate.wizard.questions_step");

  const [sections, setSections] = useState<SectionState[]>(() =>
    deriveSections(questions),
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.uid)),
  );

  // Track the last flat shape we emitted upward so we can distinguish
  // "external change" (template apply / CSV import / parent reset) from our
  // own emissions. When external state arrives, we re-derive sections.
  const lastEmittedRef = useRef<string>(JSON.stringify(flatten(sections)));

  useEffect(() => {
    const incoming = JSON.stringify(questions);
    if (incoming !== lastEmittedRef.current) {
      setSections((prev) => deriveSections(questions, prev));
      lastEmittedRef.current = incoming;
    }
  }, [questions]);

  const commit = useCallback(
    (next: SectionState[]) => {
      setSections(next);
      const flat = flatten(next);
      lastEmittedRef.current = JSON.stringify(flat);
      onChange(flat);
    },
    [onChange],
  );

  const toggle = (sectionUid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionUid)) next.delete(sectionUid);
      else next.add(sectionUid);
      return next;
    });
  };

  const addSection = () => {
    const id = uid();
    commit([
      ...sections,
      { uid: id, dimensionId: "", questions: [] },
    ]);
    setExpanded((prev) => new Set([...prev, id]));
  };

  const removeSection = (sectionUid: string) => {
    if (
      sections.find((s) => s.uid === sectionUid)?.questions.length &&
      !window.confirm(t("delete_section_confirm"))
    ) {
      return;
    }
    commit(sections.filter((s) => s.uid !== sectionUid));
  };

  const setSectionDimension = (sectionUid: string, dimensionId: string) => {
    // If another section already uses this dimension, merge: move questions
    // into the existing one and drop the duplicate.
    const target = sections.find(
      (s) => s.uid !== sectionUid && s.dimensionId === dimensionId,
    );
    if (target && dimensionId) {
      const moving = sections.find((s) => s.uid === sectionUid);
      if (!moving) return;
      commit(
        sections
          .filter((s) => s.uid !== sectionUid)
          .map((s) =>
            s.uid === target.uid
              ? { ...s, questions: [...s.questions, ...moving.questions] }
              : s,
          ),
      );
      return;
    }
    commit(
      sections.map((s) =>
        s.uid === sectionUid ? { ...s, dimensionId } : s,
      ),
    );
  };

  const addQuestionTo = (sectionUid: string) => {
    commit(
      sections.map((s) =>
        s.uid === sectionUid
          ? {
              ...s,
              questions: [
                ...s.questions,
                { text: "", type: "LIKERT", dimensionId: s.dimensionId, isRequired: true },
              ],
            }
          : s,
      ),
    );
  };

  const updateQuestion = (
    sectionUid: string,
    qIndex: number,
    patch: Partial<QuestionRow>,
  ) => {
    commit(
      sections.map((s) =>
        s.uid === sectionUid
          ? {
              ...s,
              questions: s.questions.map((q, i) =>
                i === qIndex ? { ...q, ...patch } : q,
              ),
            }
          : s,
      ),
    );
  };

  const removeQuestion = (sectionUid: string, qIndex: number) => {
    commit(
      sections.map((s) =>
        s.uid === sectionUid
          ? { ...s, questions: s.questions.filter((_, i) => i !== qIndex) }
          : s,
      ),
    );
  };

  // Per-section: hide dimensions already claimed by OTHER sections so the
  // user can't accidentally split one dimension across two cards.
  const dimensionsExcluding = useMemo(() => {
    const used = new Set(
      sections.map((s) => s.dimensionId).filter((id) => id),
    );
    return (currentSectionDimId: string) =>
      dimensions.filter(
        (d) => d.id === currentSectionDimId || !used.has(d.id),
      );
  }, [dimensions, sections]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("sections_heading")}</h3>
        <Button type="button" variant="outline" onClick={addSection}>
          <Plus className="mr-2 h-4 w-4" />
          {t("add_section")}
        </Button>
      </div>

      {sections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("no_sections_yet")}
            </p>
            <Button type="button" onClick={addSection}>
              <Plus className="mr-2 h-4 w-4" />
              {t("add_section")}
            </Button>
          </CardContent>
        </Card>
      )}

      {sections.map((section) => {
        const dimensionName =
          dimensions.find((d) => d.id === section.dimensionId)?.name;
        const isExpanded = expanded.has(section.uid);
        const isUnresolved = !section.dimensionId;
        return (
          <Card
            key={section.uid}
            className={cn(
              "transition-colors",
              isUnresolved && "border-amber-300/80 bg-amber-50/40",
            )}
          >
            <div className="flex items-start justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => toggle(section.uid)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {dimensionName || t("unresolved_section")}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {t("question_count", { count: section.questions.length })}
                    </Badge>
                    {isUnresolved && (
                      <Badge
                        variant="outline"
                        className="border-amber-400 bg-amber-50 text-xs text-amber-800"
                      >
                        {t("needs_dimension")}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeSection(section.uid)}
                aria-label={t("delete_section_aria")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-4 border-t bg-muted/20 px-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("section_dimension_label")}</Label>
                  <DimensionCombobox
                    dimensions={dimensionsExcluding(section.dimensionId)}
                    value={section.dimensionId}
                    onChange={(id) => setSectionDimension(section.uid, id)}
                    onCreated={(dim) => {
                      onDimensionCreated(dim);
                      setSectionDimension(section.uid, dim.id);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("questions_heading")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addQuestionTo(section.uid)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("add_question")}
                  </Button>
                </div>

                {section.questions.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-background py-6 text-center text-xs text-muted-foreground">
                    {t("no_questions_in_section")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {section.questions.map((q, qi) => (
                      <div
                        key={qi}
                        className="space-y-3 rounded-lg border bg-background p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {qi + 1}
                          </span>
                          <Input
                            value={q.text}
                            onChange={(e) =>
                              updateQuestion(section.uid, qi, {
                                text: e.target.value,
                              })
                            }
                            placeholder={t("text_placeholder")}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeQuestion(section.uid, qi)}
                            aria-label={t("delete_question_aria")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">
                              {t("type_label")}
                            </Label>
                            <Select
                              value={q.type}
                              onValueChange={(v) =>
                                updateQuestion(section.uid, qi, {
                                  type: v as QuestionType,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(SURVEY_QUESTION_TYPE_LABELS).map(
                                  ([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2 pb-1">
                            <Switch
                              checked={q.isRequired}
                              onCheckedChange={(v) =>
                                updateQuestion(section.uid, qi, {
                                  isRequired: v,
                                })
                              }
                            />
                            <Label className="text-xs">
                              {t("required_label")}
                            </Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
