import { describe, it, expect } from "vitest";
import {
  questionConfigSchema,
  templateQuestionSchema,
  templateSectionSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from "@/lib/validations/template";

const validQuestion = {
  text: "How effective is this person?",
  type: "RATING" as const,
  isRequired: true,
  order: 1,
};

const validSection = {
  title: "Leadership",
  order: 1,
  reviewerTypes: ["SELF", "MANAGER"] as const,
  questions: [validQuestion],
};

describe("questionConfigSchema", () => {
  it("validates an empty object (all fields optional)", () => {
    const result = questionConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates a scale config", () => {
    const result = questionConfigSchema.safeParse({
      scale: { min: 1, max: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("validates a scale with labels", () => {
    const result = questionConfigSchema.safeParse({
      scale: { min: 1, max: 5, labels: { "1": "Poor", "5": "Excellent" } },
    });
    expect(result.success).toBe(true);
  });

  it("rejects scale min below 1", () => {
    const result = questionConfigSchema.safeParse({
      scale: { min: 0, max: 5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects scale max above 10", () => {
    const result = questionConfigSchema.safeParse({
      scale: { min: 1, max: 11 },
    });
    expect(result.success).toBe(false);
  });

  it("validates options array", () => {
    const result = questionConfigSchema.safeParse({
      options: ["Always", "Sometimes", "Never"],
    });
    expect(result.success).toBe(true);
  });

  it("validates maxLength and placeholder", () => {
    const result = questionConfigSchema.safeParse({
      maxLength: 500,
      placeholder: "Enter your feedback...",
    });
    expect(result.success).toBe(true);
  });
});

describe("templateQuestionSchema", () => {
  it("validates a valid question", () => {
    const result = templateQuestionSchema.safeParse(validQuestion);
    expect(result.success).toBe(true);
  });

  it("accepts all valid question types", () => {
    for (const type of ["RATING", "TEXT", "COMPETENCY_RATING", "MULTIPLE_CHOICE"]) {
      const result = templateQuestionSchema.safeParse({
        ...validQuestion,
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid question type", () => {
    const result = templateQuestionSchema.safeParse({
      ...validQuestion,
      type: "CHECKBOX",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty text", () => {
    const result = templateQuestionSchema.safeParse({
      ...validQuestion,
      text: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(
      templateQuestionSchema.safeParse({ text: "Q?", type: "RATING" }).success
    ).toBe(false); // missing order
    expect(
      templateQuestionSchema.safeParse({ text: "Q?", order: 1 }).success
    ).toBe(false); // missing type
  });

  it("defaults isRequired to true", () => {
    const result = templateQuestionSchema.parse({
      text: "Q?",
      type: "RATING",
      order: 1,
    });
    expect(result.isRequired).toBe(true);
  });

  it("accepts optional id, description, config, competencyId", () => {
    const result = templateQuestionSchema.safeParse({
      ...validQuestion,
      id: "q-1",
      description: "Rate on a scale of 1-5",
      config: { scale: { min: 1, max: 5 } },
      competencyId: "comp-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("templateSectionSchema", () => {
  it("validates a valid section", () => {
    const result = templateSectionSchema.safeParse(validSection);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = templateSectionSchema.safeParse({
      ...validSection,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reviewer types", () => {
    const result = templateSectionSchema.safeParse({
      ...validSection,
      reviewerTypes: ["SELF", "INVALID"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid reviewer types", () => {
    const result = templateSectionSchema.safeParse({
      ...validSection,
      reviewerTypes: ["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "EXTERNAL"],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least the questions array (can be empty)", () => {
    const result = templateSectionSchema.safeParse({
      title: "Section",
      order: 1,
      reviewerTypes: ["SELF"],
      questions: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing questions field", () => {
    const result = templateSectionSchema.safeParse({
      title: "Section",
      order: 1,
      reviewerTypes: ["SELF"],
    });
    expect(result.success).toBe(false);
  });
});

describe("createTemplateSchema", () => {
  it("validates a valid template", () => {
    const result = createTemplateSchema.safeParse({
      name: "360 Review Template",
      sections: [validSection],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createTemplateSchema.safeParse({
      name: "",
      sections: [validSection],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty sections array", () => {
    const result = createTemplateSchema.safeParse({
      name: "Template",
      sections: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional description", () => {
    const result = createTemplateSchema.safeParse({
      name: "Template",
      description: "A template for reviews",
      sections: [validSection],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sections", () => {
    const result = createTemplateSchema.safeParse({ name: "Template" });
    expect(result.success).toBe(false);
  });
});

describe("updateTemplateSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = updateTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    expect(updateTemplateSchema.safeParse({ name: "New Name" }).success).toBe(true);
    expect(updateTemplateSchema.safeParse({ description: null }).success).toBe(true);
    expect(updateTemplateSchema.safeParse({ isArchived: true }).success).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = updateTemplateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts sections update", () => {
    const result = updateTemplateSchema.safeParse({
      sections: [validSection],
    });
    expect(result.success).toBe(true);
  });
});
