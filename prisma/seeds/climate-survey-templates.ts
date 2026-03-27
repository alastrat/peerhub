// ---------------------------------------------------------------------------
// Seed data: System-default Climate Survey Templates
// ---------------------------------------------------------------------------
// These templates are based on industry-standard organizational psychology
// research and mirror patterns from Gallup Q12, Great Place to Work,
// Culture Amp, Qualtrics EX, and Lattice engagement frameworks.
// ---------------------------------------------------------------------------

export interface SeedClimateQuestion {
  text: string;
  type: "LIKERT" | "TEXT" | "NPS" | "RATING";
  dimensionName?: string; // references one of the 7 default dimensions
  order: number;
  isRequired: boolean;
  config?: Record<string, unknown>;
}

export interface SeedClimateTemplate {
  name: string;
  description: string;
  type: "CLIMATE" | "PULSE" | "ENPS";
  questions: SeedClimateQuestion[];
}

// ---------------------------------------------------------------------------
// 1. Full Climate Survey (CLIMATE, 28 questions)
// ---------------------------------------------------------------------------
const fullClimateSurvey: SeedClimateTemplate = {
  name: "Full Climate Survey",
  description:
    "Comprehensive organizational climate assessment covering leadership, communication, work-life balance, growth, recognition, culture, and compensation. Ideal for annual or biannual deep-dives.",
  type: "CLIMATE",
  questions: [
    // --- Leadership (4 LIKERT) ---
    {
      text: "My direct manager clearly communicates expectations for my role and priorities.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 1,
      isRequired: true,
    },
    {
      text: "Senior leadership provides a clear vision for the future direction of the organization.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 2,
      isRequired: true,
    },
    {
      text: "My manager genuinely cares about my well-being, not just my output.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 3,
      isRequired: true,
    },
    {
      text: "I trust the decisions made by the leadership team, even when I don't have full context.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 4,
      isRequired: true,
    },

    // --- Communication (4 LIKERT) ---
    {
      text: "I receive timely information about changes that affect my work.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 5,
      isRequired: true,
    },
    {
      text: "There are effective channels for me to share feedback and ideas with leadership.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 6,
      isRequired: true,
    },
    {
      text: "Cross-team communication works well enough for me to do my job effectively.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 7,
      isRequired: true,
    },
    {
      text: "Important decisions are communicated transparently, with context on the reasoning behind them.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 8,
      isRequired: true,
    },

    // --- Work-Life Balance (3 LIKERT) ---
    {
      text: "I am able to maintain a healthy balance between my work responsibilities and personal life.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 9,
      isRequired: true,
    },
    {
      text: "My workload is reasonable and sustainable over time.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 10,
      isRequired: true,
    },
    {
      text: "I feel comfortable disconnecting from work outside of business hours without negative consequences.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 11,
      isRequired: true,
    },

    // --- Growth & Development (4 LIKERT) ---
    {
      text: "I have access to learning and development opportunities that are relevant to my career goals.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 12,
      isRequired: true,
    },
    {
      text: "My manager actively supports my professional growth through regular coaching and feedback.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 13,
      isRequired: true,
    },
    {
      text: "I can see a clear path for career advancement within this organization.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 14,
      isRequired: true,
    },
    {
      text: "In the last six months, someone at work has talked to me about my progress and development.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 15,
      isRequired: true,
    },

    // --- Recognition (3 LIKERT) ---
    {
      text: "I receive meaningful recognition when I do good work.",
      type: "LIKERT",
      dimensionName: "Recognition",
      order: 16,
      isRequired: true,
    },
    {
      text: "Recognition at this organization is given fairly and consistently, not just to a select few.",
      type: "LIKERT",
      dimensionName: "Recognition",
      order: 17,
      isRequired: true,
    },
    {
      text: "My contributions are valued by my team and manager.",
      type: "LIKERT",
      dimensionName: "Recognition",
      order: 18,
      isRequired: true,
    },

    // --- Culture & Values (4 LIKERT) ---
    {
      text: "I feel a strong sense of belonging at this organization.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 19,
      isRequired: true,
    },
    {
      text: "The organization's stated values are consistently reflected in day-to-day decisions and behaviors.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 20,
      isRequired: true,
    },
    {
      text: "I feel psychologically safe to express my opinions and take risks without fear of punishment.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 21,
      isRequired: true,
    },
    {
      text: "I would recommend this organization as a great place to work to a friend or colleague.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 22,
      isRequired: true,
    },

    // --- Compensation & Benefits (3 LIKERT) ---
    {
      text: "I believe my total compensation (salary + benefits) is fair relative to my role and market rates.",
      type: "LIKERT",
      dimensionName: "Compensation & Benefits",
      order: 23,
      isRequired: true,
    },
    {
      text: "The benefits package offered by this organization meets my personal and family needs.",
      type: "LIKERT",
      dimensionName: "Compensation & Benefits",
      order: 24,
      isRequired: true,
    },
    {
      text: "I understand how compensation decisions (raises, bonuses) are made at this organization.",
      type: "LIKERT",
      dimensionName: "Compensation & Benefits",
      order: 25,
      isRequired: true,
    },

    // --- Open-ended TEXT (3) ---
    {
      text: "What is the single most important thing this organization could do to improve your day-to-day work experience?",
      type: "TEXT",
      order: 26,
      isRequired: false,
    },
    {
      text: "What do you value most about working here?",
      type: "TEXT",
      order: 27,
      isRequired: false,
    },
    {
      text: "Is there anything else you would like leadership to know?",
      type: "TEXT",
      order: 28,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. eNPS Quick Pulse (ENPS, 6 questions)
// ---------------------------------------------------------------------------
const enpsPulse: SeedClimateTemplate = {
  name: "eNPS Quick Pulse",
  description:
    "Fast Employee Net Promoter Score measurement with follow-up questions. Takes under 3 minutes to complete. Ideal for monthly or quarterly tracking.",
  type: "ENPS",
  questions: [
    {
      text: "On a scale of 0-10, how likely are you to recommend this company as a place to work to a friend or acquaintance?",
      type: "NPS",
      order: 1,
      isRequired: true,
      config: { min: 0, max: 10 },
    },
    {
      text: "I feel proud to tell others that I work at this organization.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 2,
      isRequired: true,
    },
    {
      text: "I see myself still working here in two years.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 3,
      isRequired: true,
    },
    {
      text: "Overall, I am satisfied with my experience working at this organization.",
      type: "LIKERT",
      order: 4,
      isRequired: true,
    },
    {
      text: "What do you like most about working here?",
      type: "TEXT",
      order: 5,
      isRequired: false,
    },
    {
      text: "If you could change one thing about this organization, what would it be and why?",
      type: "TEXT",
      order: 6,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Employee Engagement Survey (CLIMATE, 20 questions)
// ---------------------------------------------------------------------------
const engagementSurvey: SeedClimateTemplate = {
  name: "Employee Engagement Survey",
  description:
    "Measures key engagement drivers including purpose, autonomy, mastery, belonging, and recognition. Based on self-determination theory and proven engagement frameworks from Culture Amp and Gallup.",
  type: "CLIMATE",
  questions: [
    // Purpose & Meaning
    {
      text: "I understand how my work contributes to the organization's overall goals and mission.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 1,
      isRequired: true,
    },
    {
      text: "The work I do every day is meaningful to me personally.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 2,
      isRequired: true,
    },
    {
      text: "I am motivated to go above and beyond what is expected of me.",
      type: "LIKERT",
      order: 3,
      isRequired: true,
    },

    // Autonomy
    {
      text: "I have the freedom to decide how to best accomplish my work.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 4,
      isRequired: true,
    },
    {
      text: "My manager trusts me to make decisions within my area of responsibility.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 5,
      isRequired: true,
    },

    // Mastery & Growth
    {
      text: "I am given opportunities to learn new skills and grow professionally.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 6,
      isRequired: true,
    },
    {
      text: "My role makes good use of my skills and abilities.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 7,
      isRequired: true,
    },
    {
      text: "I receive constructive feedback that helps me improve my performance.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 8,
      isRequired: true,
    },

    // Belonging & Connection
    {
      text: "I feel like I am part of a team where people genuinely support each other.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 9,
      isRequired: true,
    },
    {
      text: "I have at least one person at work I consider a close, trusted colleague.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 10,
      isRequired: true,
    },
    {
      text: "I can be my authentic self at work without fear of judgment.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 11,
      isRequired: true,
    },

    // Recognition & Appreciation
    {
      text: "In the last seven days, I have received recognition or praise for doing good work.",
      type: "LIKERT",
      dimensionName: "Recognition",
      order: 12,
      isRequired: true,
    },
    {
      text: "The way recognition is given here motivates me to keep performing well.",
      type: "LIKERT",
      dimensionName: "Recognition",
      order: 13,
      isRequired: true,
    },

    // Manager Relationship
    {
      text: "My manager regularly checks in on my progress and removes blockers for me.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 14,
      isRequired: true,
    },
    {
      text: "I feel comfortable bringing problems or concerns to my direct manager.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 15,
      isRequired: true,
    },

    // Communication & Alignment
    {
      text: "I understand the organization's strategic priorities and how they relate to my team's work.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 16,
      isRequired: true,
    },
    {
      text: "I feel well-informed about important changes and decisions that affect me.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 17,
      isRequired: true,
    },

    // Resources & Enablement
    {
      text: "I have the tools, resources, and information I need to do my job well.",
      type: "LIKERT",
      order: 18,
      isRequired: true,
    },

    // Open-ended
    {
      text: "What is the biggest barrier to you doing your best work right now?",
      type: "TEXT",
      order: 19,
      isRequired: false,
    },
    {
      text: "What could your manager or team do differently to help you feel more engaged?",
      type: "TEXT",
      order: 20,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Onboarding Experience (PULSE, 14 questions)
// ---------------------------------------------------------------------------
const onboardingExperience: SeedClimateTemplate = {
  name: "Onboarding Experience",
  description:
    "Evaluates the new employee onboarding experience across welcome & orientation, role clarity, manager support, tools & resources, and team integration. Best administered 30-60 days after start date.",
  type: "PULSE",
  questions: [
    // Welcome & Orientation
    {
      text: "I felt welcomed and expected on my first day at the organization.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 1,
      isRequired: true,
    },
    {
      text: "The onboarding program gave me a clear understanding of the company's mission, values, and culture.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 2,
      isRequired: true,
    },
    {
      text: "The orientation process was well-organized and covered all the information I needed to get started.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 3,
      isRequired: true,
    },

    // Role Clarity
    {
      text: "My role, responsibilities, and performance expectations were clearly explained to me during onboarding.",
      type: "LIKERT",
      order: 4,
      isRequired: true,
    },
    {
      text: "I understood what success looks like in my role within the first 30 days.",
      type: "LIKERT",
      order: 5,
      isRequired: true,
    },

    // Manager Support
    {
      text: "My manager made time to meet with me regularly during my first weeks to answer questions and provide guidance.",
      type: "LIKERT",
      order: 6,
      isRequired: true,
    },
    {
      text: "I was assigned a buddy or mentor who helped me navigate the organization and settle in.",
      type: "LIKERT",
      order: 7,
      isRequired: true,
    },

    // Tools & Resources
    {
      text: "I had access to all the tools, systems, and accounts I needed from day one.",
      type: "LIKERT",
      order: 8,
      isRequired: true,
    },
    {
      text: "Training materials and documentation were easy to find and helpful.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 9,
      isRequired: true,
    },

    // Team Integration
    {
      text: "I felt included in team activities and conversations from early on.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 10,
      isRequired: true,
    },
    {
      text: "I had opportunities to meet colleagues outside my immediate team during onboarding.",
      type: "LIKERT",
      order: 11,
      isRequired: true,
    },

    // Overall & Open-ended
    {
      text: "Overall, my onboarding experience set me up for success in my role.",
      type: "LIKERT",
      order: 12,
      isRequired: true,
    },
    {
      text: "What part of the onboarding process was most valuable to you, and why?",
      type: "TEXT",
      order: 13,
      isRequired: false,
    },
    {
      text: "What was missing from your onboarding experience that would have helped you ramp up faster?",
      type: "TEXT",
      order: 14,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. Exit Interview Survey (CLIMATE, 17 questions)
// ---------------------------------------------------------------------------
const exitInterviewSurvey: SeedClimateTemplate = {
  name: "Exit Interview Survey",
  description:
    "Captures candid feedback from departing employees about their experience, reasons for leaving, and suggestions for improvement. Helps identify retention risks and systemic issues.",
  type: "CLIMATE",
  questions: [
    // Reason for Leaving
    {
      text: "How would you rate your overall experience working at this organization?",
      type: "RATING",
      order: 1,
      isRequired: true,
      config: { min: 1, max: 5, labels: { 1: "Very Poor", 3: "Neutral", 5: "Excellent" } },
    },
    {
      text: "What is the primary reason you decided to leave?",
      type: "TEXT",
      order: 2,
      isRequired: true,
    },

    // Manager Relationship
    {
      text: "My direct manager supported my professional development and career goals.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 3,
      isRequired: true,
    },
    {
      text: "I received regular, constructive feedback from my manager throughout my tenure.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 4,
      isRequired: true,
    },
    {
      text: "How would you rate the quality of your relationship with your direct manager?",
      type: "RATING",
      dimensionName: "Leadership",
      order: 5,
      isRequired: true,
      config: { min: 1, max: 5, labels: { 1: "Very Poor", 3: "Neutral", 5: "Excellent" } },
    },

    // Growth Opportunities
    {
      text: "I had adequate opportunities for career advancement and skill development.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 6,
      isRequired: true,
    },
    {
      text: "The organization invested in my learning and professional growth.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 7,
      isRequired: true,
    },

    // Compensation
    {
      text: "My compensation was competitive relative to similar roles in the market.",
      type: "LIKERT",
      dimensionName: "Compensation & Benefits",
      order: 8,
      isRequired: true,
    },
    {
      text: "How would you rate the overall benefits package?",
      type: "RATING",
      dimensionName: "Compensation & Benefits",
      order: 9,
      isRequired: true,
      config: { min: 1, max: 5, labels: { 1: "Very Poor", 3: "Neutral", 5: "Excellent" } },
    },

    // Culture & Work Environment
    {
      text: "The organization's culture matched what was communicated during the hiring process.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 10,
      isRequired: true,
    },
    {
      text: "I felt respected and valued as a member of the team.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 11,
      isRequired: true,
    },

    // Work-Life Balance
    {
      text: "The organization supported a healthy work-life balance.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 12,
      isRequired: true,
    },

    // Communication
    {
      text: "I felt comfortable raising concerns or providing honest feedback during my time here.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 13,
      isRequired: true,
    },

    // Recognition
    {
      text: "My work and contributions were appropriately recognized during my tenure.",
      type: "LIKERT",
      dimensionName: "Recognition",
      order: 14,
      isRequired: true,
    },

    // Open-ended
    {
      text: "What could the organization have done differently to retain you?",
      type: "TEXT",
      order: 15,
      isRequired: false,
    },
    {
      text: "What advice would you give to the person replacing you in this role?",
      type: "TEXT",
      order: 16,
      isRequired: false,
    },
    {
      text: "Would you consider returning to this organization in the future? Why or why not?",
      type: "TEXT",
      order: 17,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// 6. DEI & Inclusion Survey (CLIMATE, 17 questions)
// ---------------------------------------------------------------------------
const deiSurvey: SeedClimateTemplate = {
  name: "DEI & Inclusion Survey",
  description:
    "Measures employee perceptions of diversity, equity, and inclusion. Covers belonging, fairness in processes, psychological safety, representation, and inclusive leadership practices.",
  type: "CLIMATE",
  questions: [
    // Belonging
    {
      text: "I feel like I belong at this organization regardless of my background or identity.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 1,
      isRequired: true,
    },
    {
      text: "I can be my authentic self at work without feeling like I need to hide parts of my identity.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 2,
      isRequired: true,
    },
    {
      text: "People from all backgrounds and identities are treated with equal respect here.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 3,
      isRequired: true,
    },

    // Fairness in Processes
    {
      text: "Promotions and advancement opportunities are awarded fairly, based on merit and performance.",
      type: "LIKERT",
      dimensionName: "Growth & Development",
      order: 4,
      isRequired: true,
    },
    {
      text: "I believe the hiring process at this organization is fair and free from bias.",
      type: "LIKERT",
      order: 5,
      isRequired: true,
    },
    {
      text: "Performance evaluations are applied consistently and equitably across different teams and groups.",
      type: "LIKERT",
      order: 6,
      isRequired: true,
    },

    // Psychological Safety
    {
      text: "I feel safe to speak up about issues related to diversity, equity, or inclusion without fear of retaliation.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 7,
      isRequired: true,
    },
    {
      text: "When I raise a concern about unfair treatment, I trust that it will be taken seriously and addressed.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 8,
      isRequired: true,
    },
    {
      text: "I have not witnessed or experienced discrimination, harassment, or microaggressions at this organization.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 9,
      isRequired: true,
    },

    // Inclusive Leadership
    {
      text: "My manager actively seeks out and values diverse perspectives when making decisions.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 10,
      isRequired: true,
    },
    {
      text: "Senior leaders visibly champion diversity, equity, and inclusion through their actions, not just words.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 11,
      isRequired: true,
    },
    {
      text: "My manager creates an environment where everyone on the team feels comfortable contributing ideas.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 12,
      isRequired: true,
    },

    // Representation & Resources
    {
      text: "I see people who look like me or share my background in leadership positions at this organization.",
      type: "LIKERT",
      dimensionName: "Culture & Values",
      order: 13,
      isRequired: true,
    },
    {
      text: "The organization provides adequate resources and programs to support DEI (e.g., ERGs, training, community events).",
      type: "LIKERT",
      order: 14,
      isRequired: true,
    },

    // Open-ended
    {
      text: "What is one specific action the organization could take to create a more inclusive workplace?",
      type: "TEXT",
      order: 15,
      isRequired: false,
    },
    {
      text: "Have you experienced or observed any situations where you felt inclusion could have been better? If comfortable, please describe.",
      type: "TEXT",
      order: 16,
      isRequired: false,
    },
    {
      text: "Is there anything else you'd like to share about your experience with diversity, equity, and inclusion here?",
      type: "TEXT",
      order: 17,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// 7. Remote Work & Well-being Pulse (PULSE, 12 questions)
// ---------------------------------------------------------------------------
const remoteWorkPulse: SeedClimateTemplate = {
  name: "Remote Work & Well-being Pulse",
  description:
    "Assesses remote and hybrid work experience, collaboration effectiveness, well-being signals, and manager support for distributed teams. Ideal for monthly check-ins.",
  type: "PULSE",
  questions: [
    // Work Environment & Setup
    {
      text: "I have a comfortable and productive workspace for remote/hybrid work.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 1,
      isRequired: true,
    },
    {
      text: "I have reliable access to the technology and tools I need to work effectively from any location.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 2,
      isRequired: true,
    },

    // Collaboration & Connection
    {
      text: "I feel connected to my team despite working remotely or in a hybrid arrangement.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 3,
      isRequired: true,
    },
    {
      text: "Meetings are run efficiently and I feel my time in virtual meetings is well-spent.",
      type: "LIKERT",
      dimensionName: "Communication",
      order: 4,
      isRequired: true,
    },
    {
      text: "I have enough opportunities for informal, non-work interactions with colleagues.",
      type: "LIKERT",
      order: 5,
      isRequired: true,
    },

    // Well-being & Burnout
    {
      text: "I am able to set clear boundaries between work time and personal time when working remotely.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 6,
      isRequired: true,
    },
    {
      text: "I have not experienced significant feelings of isolation or loneliness related to my work arrangement.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 7,
      isRequired: true,
    },
    {
      text: "My current workload does not put me at risk of burnout.",
      type: "LIKERT",
      dimensionName: "Work-Life Balance",
      order: 8,
      isRequired: true,
    },

    // Manager Support
    {
      text: "My manager effectively supports and communicates with me regardless of where I work.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 9,
      isRequired: true,
    },
    {
      text: "I trust that my contributions are evaluated fairly whether I work on-site or remotely.",
      type: "LIKERT",
      dimensionName: "Leadership",
      order: 10,
      isRequired: true,
    },

    // Open-ended
    {
      text: "What is the biggest challenge you face with your current work arrangement (remote, hybrid, or on-site)?",
      type: "TEXT",
      order: 11,
      isRequired: false,
    },
    {
      text: "What additional support or resources would help you work more effectively and maintain your well-being?",
      type: "TEXT",
      order: 12,
      isRequired: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// Exported array of all system templates
// ---------------------------------------------------------------------------
export const SYSTEM_CLIMATE_TEMPLATES: SeedClimateTemplate[] = [
  fullClimateSurvey,
  enpsPulse,
  engagementSurvey,
  onboardingExperience,
  exitInterviewSurvey,
  deiSurvey,
  remoteWorkPulse,
];
