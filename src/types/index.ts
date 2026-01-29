import type {
  Company,
  User,
  CompanyUser,
  Department,
  Template,
  TemplateSection,
  TemplateQuestion,
  Cycle,
  CycleParticipant,
  Nomination,
  ReviewAssignment,
  ReviewResponse,
  Competency,
  CompanyRole,
  CycleStatus,
  ReviewAssignmentStatus,
  NominationStatus,
  ReviewerType,
  QuestionType,
} from "@prisma/client";

// Re-export Prisma types
export type {
  Company,
  User,
  CompanyUser,
  Department,
  Template,
  TemplateSection,
  TemplateQuestion,
  Cycle,
  CycleParticipant,
  Nomination,
  ReviewAssignment,
  ReviewResponse,
  Competency,
  CompanyRole,
  CycleStatus,
  ReviewAssignmentStatus,
  NominationStatus,
  ReviewerType,
  QuestionType,
};

// Extended types with relations
export type UserWithCompanies = User & {
  companies: (CompanyUser & {
    company: Company;
  })[];
};

export type CompanyUserWithRelations = CompanyUser & {
  user: User;
  company: Company;
  department: Department | null;
  manager: (CompanyUser & { user: User }) | null;
  directReports: (CompanyUser & { user: User })[];
};

export type TemplateWithSections = Template & {
  sections: (TemplateSection & {
    questions: TemplateQuestion[];
  })[];
};

export type CycleWithRelations = Cycle & {
  template: Template;
  participants: (CycleParticipant & {
    companyUser: CompanyUser & { user: User };
  })[];
  _count?: {
    participants: number;
    assignments: number;
  };
};

export type ReviewAssignmentWithRelations = ReviewAssignment & {
  cycle: Cycle;
  reviewer: (CompanyUser & { user: User }) | null;
  reviewee: CompanyUser & { user: User };
  responses: ReviewResponse[];
};

export type NominationWithRelations = Nomination & {
  nominator: CompanyUser & { user: User };
  nominee: CompanyUser & { user: User };
  reviewee: CompanyUser & { user: User };
};

// Session types
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  globalRole: "SUPER_ADMIN" | "USER";
}

export interface SessionCompanyUser {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  role: CompanyRole;
  title: string | null;
}

export interface ExtendedSession {
  user: SessionUser;
  companyUser: SessionCompanyUser | null;
  expires: string;
}

// API Response types
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface QuestionConfig {
  scale?: {
    min: number;
    max: number;
    labels?: Record<number, string>;
  };
  options?: string[];
  maxLength?: number;
  placeholder?: string;
}

// Report types
export interface AggregatedRating {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface QuestionReport {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  byReviewerType: Record<
    ReviewerType,
    {
      isVisible: boolean;
      rating?: AggregatedRating;
      textResponses?: string[];
      message?: string;
    }
  >;
  overall?: AggregatedRating;
}

export interface IndividualReport {
  cycleId: string;
  cycleName: string;
  participantId: string;
  participantName: string;
  overallScore: number | null;
  responseCounts: Record<ReviewerType, number>;
  sections: {
    sectionId: string;
    sectionTitle: string;
    questions: QuestionReport[];
  }[];
  strengths: string[];
  opportunities: string[];
  releasedAt: Date | null;
}

// Dashboard types
export interface CycleStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

export interface ParticipationStats {
  byReviewerType: Record<ReviewerType, CycleStats>;
  overall: CycleStats;
  lateItems: number;
}
