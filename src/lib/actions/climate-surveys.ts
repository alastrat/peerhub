"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { Prisma, type ClimateSurvey, type SurveyQuestion, type SurveyQuestionType } from "@prisma/client";
import { applyInstrumentRules, instrumentDimensionCodes } from "@/lib/utils/climate-instrument-guard";
import { isLockedQuestion } from "@/lib/constants/climate-instrument";
import { isClimateBand, type ClimateBand } from "@/lib/utils/climate-scoring";
import { getTranslator } from "@/i18n/translator";
import { actionError, getActionLocale, unexpectedActionError } from "@/lib/auth/action-locale";

/** Canonicalize instrument items and enforce whole-dimension rules. */
async function guardInstrumentQuestions<Q extends SurveyQuestionInput>(questions: Q[]) {
  const codes = instrumentDimensionCodes(questions);
  const dims = codes.length
    ? ((await prisma.climateDimension.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true },
      })) ?? [])
    : [];
  const byCode = new Map(dims.filter((d) => d.code).map((d) => [d.code!, d.id]));
  // Every instrument dimension id, so custom questions can be kept out of them
  if (codes.length) {
    const all = (await prisma.climateDimension.findMany({
      where: { code: { not: null }, companyId: null },
      select: { id: true, code: true },
    })) ?? [];
    for (const d of all) if (d.code && !byCode.has(d.code)) byCode.set(d.code, d.id);
  }
  return applyInstrumentRules(questions, byCode);
}

async function requireCompanyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) throw new Error("Unauthorized");
  const companyId = session.companyUser?.companyId;
  if (!companyId) throw new Error("No active company");
  return { session, companyId };
}

interface SurveyQuestionInput {
  text: string;
  type: SurveyQuestionType;
  dimensionId?: string;
  order: number;
  isRequired: boolean;
  config?: Record<string, unknown>;
}

interface CreateSurveyInput {
  name: string;
  description?: string;
  type: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE";
  frequency?: string;
  isAnonymous?: boolean;
  anonymityThreshold?: number;
  questions: SurveyQuestionInput[];
  templateId?: string;
  welcomeTitle?: string;
  welcomeBody?: string;
  welcomeBannerUrl?: string;
  welcomeCtaText?: string;
  themeColor?: string;
  thankYouTitle?: string;
  thankYouBody?: string;
  thankYouCtaText?: string;
  wallpaperConfig?: Record<string, unknown> | null;
  colorConfig?: Record<string, unknown> | null;
  questionsPerPage?: number | null;
}

type SurveyWithQuestions = ClimateSurvey & {
  questions: SurveyQuestion[];
};

export async function createClimateSurvey(
  input: CreateSurveyInput
): Promise<ActionResult<SurveyWithQuestions>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const name = input.name.trim();
    if (!name) return actionError("name_required");

    if (!input.questions || input.questions.length === 0) {
      return actionError("question_required");
    }

    const guarded = await guardInstrumentQuestions(input.questions);
    if (!guarded.ok) return actionError(`instrument.${guarded.code}`, guarded.values);
    const questions = guarded.questions;

    const survey = await prisma.climateSurvey.create({
      data: {
        companyId,
        name,
        instrumentVersion: guarded.instrumentVersion,
        description: input.description?.trim() || null,
        type: input.type,
        frequency: (input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"]) || "ONCE",
        isAnonymous: input.isAnonymous ?? true,
        ...(input.anonymityThreshold !== undefined && {
          anonymityThreshold: Math.max(1, Math.trunc(input.anonymityThreshold)),
        }),
        templateId: input.templateId || null,
        welcomeTitle: input.welcomeTitle?.trim() || null,
        welcomeBody: input.welcomeBody ?? null,
        welcomeBannerUrl: input.welcomeBannerUrl?.trim() || null,
        welcomeCtaText: input.welcomeCtaText?.trim() || null,
        themeColor: input.themeColor?.trim() || null,
        thankYouTitle: input.thankYouTitle?.trim() || null,
        thankYouBody: input.thankYouBody ?? null,
        thankYouCtaText: input.thankYouCtaText?.trim() || null,
        wallpaperConfig: input.wallpaperConfig ? (input.wallpaperConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        colorConfig: input.colorConfig ? (input.colorConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        questionsPerPage: input.questionsPerPage ?? null,
        questions: {
          create: questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId || null,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to create climate survey:", error);
    // Surface the underlying Prisma/DB error so the UI can show what's wrong
    return unexpectedActionError(error, "failed_create_survey", { withDetail: true });
  }
}

export async function updateClimateSurvey(
  surveyId: string,
  input: Partial<CreateSurveyInput>
): Promise<ActionResult<SurveyWithQuestions>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!existing) {
      return actionError("survey_not_found");
    }

    const isDraft = existing.status === "DRAFT";

    // Non-draft surveys: block structural changes (questions, name, type, frequency)
    if (!isDraft) {
      if (input.questions) {
        // The error is surfaced verbatim in the wizard
        const t = getTranslator(await getActionLocale(), "dashboard.climate.edit_page");
        return { success: false, error: t("questions_locked_after_send") };
      }
      // Strip structural fields — only allow presentation updates
      input = {
        welcomeTitle: input.welcomeTitle,
        welcomeBody: input.welcomeBody,
        welcomeBannerUrl: input.welcomeBannerUrl,
        welcomeCtaText: input.welcomeCtaText,
        themeColor: input.themeColor,
        thankYouTitle: input.thankYouTitle,
        thankYouBody: input.thankYouBody,
        thankYouCtaText: input.thankYouCtaText,
        wallpaperConfig: input.wallpaperConfig,
        colorConfig: input.colorConfig,
        questionsPerPage: input.questionsPerPage,
      };
    }

    // Reject empty questions array
    if (input.questions && input.questions.length === 0) {
      return actionError("question_required");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...(input.name && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.type && { type: input.type }),
      ...(input.frequency && { frequency: input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"] }),
      ...(input.isAnonymous !== undefined && { isAnonymous: input.isAnonymous }),
      ...(input.anonymityThreshold !== undefined && {
        anonymityThreshold: Math.max(1, Math.trunc(input.anonymityThreshold)),
      }),
      ...(input.templateId !== undefined && { templateId: input.templateId || null }),
      ...(input.welcomeTitle !== undefined && { welcomeTitle: input.welcomeTitle?.trim() || null }),
      ...(input.welcomeBody !== undefined && { welcomeBody: input.welcomeBody || null }),
      ...(input.welcomeBannerUrl !== undefined && { welcomeBannerUrl: input.welcomeBannerUrl?.trim() || null }),
      ...(input.welcomeCtaText !== undefined && { welcomeCtaText: input.welcomeCtaText?.trim() || null }),
      ...(input.themeColor !== undefined && { themeColor: input.themeColor?.trim() || null }),
      ...(input.thankYouTitle !== undefined && { thankYouTitle: input.thankYouTitle?.trim() || null }),
      ...(input.thankYouBody !== undefined && { thankYouBody: input.thankYouBody || null }),
      ...(input.thankYouCtaText !== undefined && { thankYouCtaText: input.thankYouCtaText?.trim() || null }),
      ...(input.wallpaperConfig !== undefined && {
        wallpaperConfig: input.wallpaperConfig ? (input.wallpaperConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
      }),
      ...(input.colorConfig !== undefined && {
        colorConfig: input.colorConfig ? (input.colorConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
      }),
      ...(input.questionsPerPage !== undefined && {
        questionsPerPage: input.questionsPerPage ?? null,
      }),
    };

    // If questions are provided, delete and recreate atomically in a transaction
    if (input.questions) {
      const guarded = await guardInstrumentQuestions(input.questions);
      if (!guarded.ok) return actionError(`instrument.${guarded.code}`, guarded.values);
      input = { ...input, questions: guarded.questions };
      updateData.instrumentVersion = guarded.instrumentVersion;
      const survey = await prisma.$transaction(async (tx) => {
        await tx.surveyQuestion.deleteMany({ where: { surveyId } });
        return tx.climateSurvey.update({
          where: { id: surveyId },
          data: {
            ...updateData,
            questions: {
              create: input.questions!.map((q) => ({
                text: q.text,
                type: q.type,
                dimensionId: q.dimensionId || null,
                order: q.order,
                isRequired: q.isRequired,
                config: q.config as Prisma.InputJsonValue | undefined,
              })),
            },
          },
          include: { questions: { orderBy: { order: "asc" } } },
        });
      });

      revalidatePath("/surveys/climate");
      return { success: true, data: survey };
    }

    const survey = await prisma.climateSurvey.update({
      where: { id: surveyId },
      data: updateData,
      include: { questions: { orderBy: { order: "asc" } } },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to update climate survey:", error);
    return unexpectedActionError(error, "failed_update_survey", { withDetail: true });
  }
}

export async function deleteClimateSurvey(surveyId: string): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      include: { _count: { select: { distributions: true } } },
    });
    if (!existing) {
      return actionError("survey_not_found");
    }

    if (existing._count.distributions > 0) {
      // Archive instead of delete if it has distributions
      await prisma.climateSurvey.update({
        where: { id: surveyId },
        data: { status: "ARCHIVED" },
      });
    } else {
      await prisma.climateSurvey.delete({ where: { id: surveyId } });
    }

    revalidatePath("/surveys/climate");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete climate survey:", error);
    return unexpectedActionError(error, "failed_delete_survey");
  }
}

export async function duplicateClimateSurvey(
  surveyId: string
): Promise<ActionResult<SurveyWithQuestions>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const original = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });
    if (!original) {
      return actionError("survey_not_found");
    }

    const survey = await prisma.climateSurvey.create({
      data: {
        companyId,
        name: `${original.name} (Copy)`,
        description: original.description,
        type: original.type,
        frequency: original.frequency,
        isAnonymous: original.isAnonymous,
        anonymityThreshold: original.anonymityThreshold,
        // Copy all customization fields
        templateId: original.templateId,
        welcomeTitle: original.welcomeTitle,
        welcomeBody: original.welcomeBody,
        welcomeBannerUrl: original.welcomeBannerUrl,
        welcomeCtaText: original.welcomeCtaText,
        themeColor: original.themeColor,
        wallpaperConfig: original.wallpaperConfig ?? Prisma.JsonNull,
        colorConfig: original.colorConfig ?? Prisma.JsonNull,
        thankYouTitle: original.thankYouTitle,
        thankYouBody: original.thankYouBody,
        thankYouCtaText: original.thankYouCtaText,
        questionsPerPage: original.questionsPerPage,
        instrumentVersion: original.instrumentVersion,
        goalBand: original.goalBand,
        planMinPerLeader: original.planMinPerLeader,
        followUpUserIds: original.followUpUserIds,
        questions: {
          create: original.questions.map((q) => ({
            text: q.text,
            type: q.type,
            dimensionId: q.dimensionId,
            order: q.order,
            isRequired: q.isRequired,
            config: q.config as Prisma.InputJsonValue | undefined,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    revalidatePath("/surveys/climate");
    return { success: true, data: survey };
  } catch (error) {
    console.error("Failed to duplicate climate survey:", error);
    return unexpectedActionError(error, "failed_duplicate_survey");
  }
}

/**
 * Update survey settings. All fields are editable regardless of status.
 */
export interface SurveySettingsInput {
  name?: string;
  description?: string;
  type?: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE";
  frequency?: string;
  isAnonymous?: boolean;
  anonymityThreshold?: number;
  questionsPerPage?: number | null;
  logoUrl?: string | null;
  accessStartDate?: Date | string | null;
  accessEndDate?: Date | string | null;
  goalBand?: ClimateBand;
  planMinPerLeader?: number;
  planDueDate?: Date | string | null;
  followUpUserIds?: string[];
}

export async function updateSurveySettings(
  surveyId: string,
  input: SurveySettingsInput
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const existing = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
    });
    if (!existing) {
      return actionError("survey_not_found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return actionError("name_required");
      data.name = name;
    }
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.type !== undefined) data.type = input.type;
    if (input.frequency !== undefined)
      data.frequency = input.frequency as Prisma.EnumSurveyFrequencyFieldUpdateOperationsInput["set"];
    if (input.isAnonymous !== undefined) data.isAnonymous = input.isAnonymous;
    if (input.anonymityThreshold !== undefined) {
      data.anonymityThreshold = Math.max(1, Math.trunc(input.anonymityThreshold));
    }
    if (input.questionsPerPage !== undefined) data.questionsPerPage = input.questionsPerPage;
    if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl?.trim() || null;
    if (input.accessStartDate !== undefined)
      data.accessStartDate = input.accessStartDate ? new Date(input.accessStartDate) : null;
    if (input.accessEndDate !== undefined)
      data.accessEndDate = input.accessEndDate ? new Date(input.accessEndDate) : null;
    if (input.goalBand !== undefined) {
      if (!isClimateBand(input.goalBand)) return actionError("invalid_goal_band");
      data.goalBand = input.goalBand;
    }
    if (input.planMinPerLeader !== undefined) {
      if (!Number.isFinite(input.planMinPerLeader)) return actionError("invalid_plan_minimum");
      data.planMinPerLeader = Math.min(12, Math.max(0, Math.trunc(input.planMinPerLeader)));
    }
    if (input.planDueDate !== undefined) {
      const due = input.planDueDate ? new Date(input.planDueDate) : null;
      if (due && Number.isNaN(due.getTime())) return actionError("invalid_plan_due_date");
      data.planDueDate = due;
    }
    if (input.followUpUserIds !== undefined) {
      // Only active users of this company can follow up
      const ids = [...new Set(input.followUpUserIds)];
      const valid = ids.length
        ? await prisma.companyUser.findMany({
            where: { companyId, userId: { in: ids }, isActive: true },
            select: { userId: true },
          })
        : [];
      if (valid.length !== ids.length) return actionError("unknown_follow_up_user");
      data.followUpUserIds = ids;
    }

    if (Object.keys(data).length === 0) {
      return { success: true };
    }

    await prisma.climateSurvey.update({
      where: { id: surveyId },
      data,
    });

    revalidatePath("/surveys/climate");
    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update survey settings:", error);
    return unexpectedActionError(error, "failed_update_settings", { withDetail: true });
  }
}

interface UpdateQuestionInput {
  text: string;
  type?: SurveyQuestionType;
  dimensionId?: string | null;
  isRequired?: boolean;
}

/**
 * Update a single question on an existing survey. Used by the inline-edit
 * pencil on the survey detail page so admins can fix typos or refine wording
 * after a survey is already in the wild.
 *
 * Rules:
 * - DRAFT surveys → all fields editable (text, type, dimensionId, isRequired)
 * - ACTIVE / CLOSED → only `text` is editable; structural changes (type,
 *   dimension, required) would invalidate already-collected responses, so we
 *   silently drop them with an error rather than risk corruption.
 * - ARCHIVED → no edits at all.
 */
export async function updateClimateSurveyQuestion(
  surveyId: string,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      select: { id: true, status: true },
    });
    if (!survey) {
      return actionError("survey_not_found");
    }

    if (survey.status === "ARCHIVED") {
      return actionError("archived_not_editable");
    }

    const question = await prisma.surveyQuestion.findFirst({
      where: { id: questionId, surveyId },
      select: { id: true, config: true },
    });
    if (!question) {
      return actionError("question_not_found");
    }
    if (isLockedQuestion(question.config)) {
      return actionError("instrument_item_locked");
    }

    const trimmedText = input.text?.trim();
    if (!trimmedText) {
      return actionError("question_text_required");
    }

    const isDraft = survey.status === "DRAFT";

    // Build the update payload. Non-draft is text-only — the caller's
    // structural fields are intentionally ignored, not rejected, so the UI
    // can disable those inputs without forcing the client to filter the
    // payload before submitting.
    const data: Prisma.SurveyQuestionUpdateInput = {
      text: trimmedText,
    };

    if (isDraft) {
      if (input.type !== undefined) data.type = input.type;
      if (input.isRequired !== undefined) data.isRequired = input.isRequired;
      if (input.dimensionId !== undefined) {
        if (input.dimensionId) {
          // Tenant isolation: only allow dimensions that either belong to the
          // caller's company or are global defaults. Without this check, a
          // malicious admin could connect a question to another tenant's
          // dimension by submitting its id directly.
          const dim = await prisma.climateDimension.findFirst({
            where: {
              id: input.dimensionId,
              OR: [{ companyId }, { companyId: null, isDefault: true }],
            },
            select: { id: true },
          });
          if (!dim) {
            return actionError("dimension_not_found");
          }
          data.dimension = { connect: { id: dim.id } };
        } else {
          data.dimension = { disconnect: true };
        }
      }
    }

    await prisma.surveyQuestion.update({
      where: { id: questionId },
      data,
    });

    revalidatePath(`/surveys/climate/${surveyId}`);
    return { success: true };
  } catch (error) {
    return unexpectedActionError(error, "failed_update_question", { withDetail: true });
  }
}

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Upload a logo for a survey to Supabase Storage. The client passes a File,
 * we validate MIME + size server-side, then return the public URL the
 * settings form can paste into its `logoUrl` field.
 *
 * Storage layout: `survey-assets/surveys/<surveyId>/logo-<timestamp>.<ext>`.
 * The bucket is public so the URL works without auth — that's fine for
 * branding assets, but don't reuse this action for anything sensitive.
 */
export async function uploadSurveyLogo(
  surveyId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const survey = await prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      select: { id: true },
    });
    if (!survey) {
      return actionError("survey_not_found");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return actionError("no_file");
    }

    if (!ALLOWED_LOGO_MIME.has(file.type)) {
      return actionError("image_type");
    }

    if (file.size > MAX_LOGO_BYTES) {
      return actionError("image_too_large");
    }

    const { createSupabaseStorageClient, SURVEY_ASSETS_BUCKET } = await import(
      "@/lib/supabase/server"
    );
    const supabase = createSupabaseStorageClient();

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `surveys/${surveyId}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SURVEY_ASSETS_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return actionError("upload_failed", { reason: uploadError.message });
    }

    const { data: publicUrl } = supabase.storage
      .from(SURVEY_ASSETS_BUCKET)
      .getPublicUrl(path);

    return { success: true, data: { url: publicUrl.publicUrl } };
  } catch (error) {
    return unexpectedActionError(error, "failed_upload_logo", { withDetail: true });
  }
}

/**
 * Upload a wallpaper / background image for a survey welcome screen. Unlike
 * uploadSurveyLogo this is company-scoped (no surveyId), so the wizard can
 * call it before the survey row exists.
 *
 * Storage layout: `survey-assets/companies/<companyId>/wallpapers/<ts>.<ext>`.
 */
export async function uploadSurveyWallpaper(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const { companyId } = await requireCompanyAdmin();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return actionError("no_file");
    }
    if (!ALLOWED_LOGO_MIME.has(file.type)) {
      return actionError("image_type");
    }
    if (file.size > MAX_LOGO_BYTES) {
      return actionError("image_too_large");
    }

    const { createSupabaseStorageClient, SURVEY_ASSETS_BUCKET } = await import(
      "@/lib/supabase/server"
    );
    const supabase = createSupabaseStorageClient();

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `companies/${companyId}/wallpapers/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SURVEY_ASSETS_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return actionError("upload_failed", { reason: uploadError.message });
    }

    const { data: publicUrl } = supabase.storage
      .from(SURVEY_ASSETS_BUCKET)
      .getPublicUrl(path);

    return { success: true, data: { url: publicUrl.publicUrl } };
  } catch (error) {
    return unexpectedActionError(error, "failed_upload_wallpaper", { withDetail: true });
  }
}
