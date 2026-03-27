import type { QuestionType, ReviewerType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeedTemplateQuestion {
  text: string;
  description?: string;
  type: QuestionType;
  isRequired: boolean;
  order: number;
}

export interface SeedTemplateSection {
  title: string;
  description?: string;
  order: number;
  reviewerTypes: ReviewerType[];
  questions: SeedTemplateQuestion[];
}

export interface SeedTemplate360 {
  name: string;
  description: string;
  sections: SeedTemplateSection[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_REVIEWERS: ReviewerType[] = [
  "SELF",
  "MANAGER",
  "PEER",
  "DIRECT_REPORT",
];

const LEADERSHIP_REVIEWERS: ReviewerType[] = [
  "SELF",
  "MANAGER",
  "PEER",
  "DIRECT_REPORT",
];

const MANAGER_EVAL_REVIEWERS: ReviewerType[] = [
  "SELF",
  "PEER",
  "DIRECT_REPORT",
];

const PEER_REVIEWERS: ReviewerType[] = ["SELF", "PEER"];

const SELF_ONLY: ReviewerType[] = ["SELF"];

// ---------------------------------------------------------------------------
// 1. Standard Performance Review
// ---------------------------------------------------------------------------

const standardPerformanceReview: SeedTemplate360 = {
  name: "Standard Performance Review",
  description:
    "Comprehensive 360-degree review covering job performance, communication, collaboration, problem solving, and professional growth. Suitable for all roles and levels across the organization.",
  sections: [
    {
      title: "Core Performance",
      description:
        "Evaluate the individual's ability to deliver results, meet expectations, and maintain quality standards in their role.",
      order: 1,
      reviewerTypes: ALL_REVIEWERS,
      questions: [
        {
          text: "This person consistently meets or exceeds the quality standards expected for their role.",
          description:
            "Consider accuracy, thoroughness, and attention to detail in their work output.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person reliably meets deadlines and manages their workload effectively.",
          description:
            "Think about their ability to prioritize tasks, manage time, and follow through on commitments.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This person takes ownership of their responsibilities and follows through without needing frequent reminders.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "What is one specific example of a project or task where this person delivered excellent results?",
          type: "TEXT",
          isRequired: false,
          order: 4,
        },
      ],
    },
    {
      title: "Communication & Teamwork",
      description:
        "Assess how effectively this person communicates, collaborates with others, and contributes to a positive team environment.",
      order: 2,
      reviewerTypes: ALL_REVIEWERS,
      questions: [
        {
          text: "This person communicates ideas clearly and concisely, both verbally and in writing.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person actively listens to others and considers different viewpoints before responding.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This person collaborates effectively with team members and contributes to a supportive work environment.",
          description:
            "Consider how they share information, assist colleagues, and handle shared responsibilities.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "This person handles disagreements and conflicts constructively and professionally.",
          type: "RATING",
          isRequired: true,
          order: 4,
        },
      ],
    },
    {
      title: "Problem Solving & Innovation",
      description:
        "Evaluate critical thinking, creativity, and the ability to navigate challenges and ambiguity.",
      order: 3,
      reviewerTypes: ALL_REVIEWERS,
      questions: [
        {
          text: "This person approaches problems analytically and identifies practical solutions.",
          description:
            "Consider how they break down complex issues and develop well-reasoned approaches.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person adapts well to changes in priorities, processes, or team dynamics.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This person proactively identifies opportunities to improve processes, tools, or workflows.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
      ],
    },
    {
      title: "Professional Development",
      description:
        "Reflect on growth mindset, learning orientation, and commitment to continuous improvement.",
      order: 4,
      reviewerTypes: ALL_REVIEWERS,
      questions: [
        {
          text: "This person actively seeks feedback and uses it to improve their performance.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person demonstrates a genuine commitment to learning new skills and growing professionally.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "What is the most impactful thing this person could do to grow in their role over the next 6 months?",
          type: "TEXT",
          isRequired: true,
          order: 3,
        },
        {
          text: "Is there anything else you would like to share about this person's performance or potential?",
          type: "TEXT",
          isRequired: false,
          order: 4,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Leadership Assessment
// ---------------------------------------------------------------------------

const leadershipAssessment: SeedTemplate360 = {
  name: "Leadership Assessment",
  description:
    "Evaluates leadership competencies including vision and strategy, decision making, team development, emotional intelligence, and change management. Designed for leaders at all levels.",
  sections: [
    {
      title: "Strategic Thinking",
      description:
        "Assess the leader's ability to set direction, think long-term, and align team efforts with organizational goals.",
      order: 1,
      reviewerTypes: LEADERSHIP_REVIEWERS,
      questions: [
        {
          text: "This leader communicates a clear and compelling vision for the team or organization.",
          description:
            "Consider whether they help people understand the 'why' behind priorities and direction.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This leader makes well-informed decisions, even in situations with incomplete information or ambiguity.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This leader effectively prioritizes initiatives and allocates resources to achieve strategic objectives.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "Provide an example of a strategic decision this leader made that positively impacted the team or business.",
          type: "TEXT",
          isRequired: false,
          order: 4,
        },
      ],
    },
    {
      title: "People Leadership",
      description:
        "Evaluate how effectively the leader develops talent, builds trust, and creates an inclusive environment.",
      order: 2,
      reviewerTypes: LEADERSHIP_REVIEWERS,
      questions: [
        {
          text: "This leader invests time in developing the skills and careers of their team members.",
          description:
            "Consider mentoring, stretch assignments, coaching conversations, and growth opportunities provided.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This leader creates a psychologically safe environment where people feel comfortable speaking up and taking risks.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This leader recognizes and celebrates the contributions and achievements of team members.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "This leader demonstrates empathy and emotional awareness in their interactions with others.",
          description:
            "Consider how they respond to stress, handle sensitive situations, and read the room.",
          type: "RATING",
          isRequired: true,
          order: 4,
        },
      ],
    },
    {
      title: "Execution & Results",
      description:
        "Assess the leader's ability to drive accountability, deliver outcomes, and navigate change.",
      order: 3,
      reviewerTypes: LEADERSHIP_REVIEWERS,
      questions: [
        {
          text: "This leader sets clear expectations and holds the team accountable for delivering results.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This leader effectively manages through change and helps the team adapt to new circumstances.",
          description:
            "Consider how they communicate change, address resistance, and maintain morale during transitions.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This leader removes obstacles and advocates for the resources the team needs to succeed.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
      ],
    },
    {
      title: "Character & Integrity",
      description:
        "Evaluate the leader's ethical standards, consistency, and trustworthiness.",
      order: 4,
      reviewerTypes: LEADERSHIP_REVIEWERS,
      questions: [
        {
          text: "This leader acts with integrity and consistently models the values they expect from others.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This leader is transparent about challenges and shares information openly with the team.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "What is this leader's greatest strength, and how does it benefit the team?",
          type: "TEXT",
          isRequired: true,
          order: 3,
        },
        {
          text: "What is the single most important thing this leader could improve to become more effective?",
          type: "TEXT",
          isRequired: true,
          order: 4,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Manager Effectiveness 360
// ---------------------------------------------------------------------------

const managerEffectiveness: SeedTemplate360 = {
  name: "Manager Effectiveness 360",
  description:
    "Specifically designed for evaluating managers from the perspective of their direct reports and peers. Focuses on coaching, communication, empowerment, and day-to-day management practices.",
  sections: [
    {
      title: "Coaching & Development",
      description:
        "Assess how well this manager supports the growth and development of their team members.",
      order: 1,
      reviewerTypes: MANAGER_EVAL_REVIEWERS,
      questions: [
        {
          text: "My manager takes the time to understand my career goals and actively helps me work toward them.",
          description:
            "Consider career conversations, development plans, and growth opportunities provided.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "My manager provides regular, actionable feedback that helps me improve my performance.",
          description:
            "Think about the frequency, specificity, and usefulness of the feedback you receive.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "My manager helps me identify and develop the skills I need for my current role and future growth.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "Describe a specific instance where this manager's coaching made a meaningful difference in your work or development.",
          type: "TEXT",
          isRequired: false,
          order: 4,
        },
      ],
    },
    {
      title: "Communication & Feedback",
      description:
        "Evaluate the quality, clarity, and timeliness of the manager's communication.",
      order: 2,
      reviewerTypes: MANAGER_EVAL_REVIEWERS,
      questions: [
        {
          text: "My manager keeps the team informed about important decisions, changes, and context that affect our work.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "My manager is approachable and makes time for me when I need to discuss questions or concerns.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "My manager conducts effective and well-organized one-on-one meetings.",
          description:
            "Consider preparation, follow-up on action items, and whether the meetings feel valuable.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
      ],
    },
    {
      title: "Team Empowerment",
      description:
        "Evaluate how effectively this manager empowers their team, delegates, and fosters autonomy.",
      order: 3,
      reviewerTypes: MANAGER_EVAL_REVIEWERS,
      questions: [
        {
          text: "My manager trusts me to do my job and avoids micromanaging.",
          description:
            "Consider the balance between oversight and autonomy in how your work is managed.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "My manager delegates meaningful work and gives me opportunities to stretch beyond my comfort zone.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "My manager fosters a collaborative team culture where everyone's contributions are valued.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
      ],
    },
    {
      title: "Performance Management",
      description:
        "Assess how well the manager sets expectations, addresses performance issues, and supports high performance.",
      order: 4,
      reviewerTypes: MANAGER_EVAL_REVIEWERS,
      questions: [
        {
          text: "My manager sets clear goals and expectations so I understand what success looks like in my role.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "My manager addresses performance issues fairly and promptly rather than avoiding difficult conversations.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "My manager advocates for the team and ensures we have the resources and support needed to do our best work.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "What is the one thing this manager should start, stop, or continue doing to be more effective?",
          type: "TEXT",
          isRequired: true,
          order: 4,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Peer Feedback
// ---------------------------------------------------------------------------

const peerFeedback: SeedTemplate360 = {
  name: "Peer Feedback",
  description:
    "Lightweight template optimized for peer-to-peer feedback. Covers collaboration, technical contribution, and communication in a concise format that respects reviewers' time.",
  sections: [
    {
      title: "Collaboration & Teamwork",
      description:
        "Reflect on how effectively this person works with you and others on shared goals.",
      order: 1,
      reviewerTypes: PEER_REVIEWERS,
      questions: [
        {
          text: "This person is reliable and follows through on commitments they make to the team.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person is willing to help others, even when it falls outside their immediate responsibilities.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "This person contributes positively to team morale and fosters a supportive working relationship.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
      ],
    },
    {
      title: "Technical Contribution",
      description:
        "Evaluate the quality and impact of this person's technical or functional contributions.",
      order: 2,
      reviewerTypes: PEER_REVIEWERS,
      questions: [
        {
          text: "This person produces high-quality work that I can rely on when it intersects with my own responsibilities.",
          description:
            "Consider the accuracy, completeness, and dependability of their deliverables.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person brings valuable expertise or perspective that strengthens the team's output.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
      ],
    },
    {
      title: "Communication",
      description:
        "Assess how well this person communicates in day-to-day interactions and collaborative work.",
      order: 3,
      reviewerTypes: PEER_REVIEWERS,
      questions: [
        {
          text: "This person communicates proactively and keeps relevant stakeholders informed about progress and blockers.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "This person gives and receives feedback respectfully and constructively.",
          type: "RATING",
          isRequired: true,
          order: 2,
        },
        {
          text: "What does this person do well that you would like to see them continue or do more of?",
          type: "TEXT",
          isRequired: true,
          order: 3,
        },
        {
          text: "What is one area where this person could improve that would have the biggest impact on your collaboration?",
          type: "TEXT",
          isRequired: false,
          order: 4,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. Self-Assessment
// ---------------------------------------------------------------------------

const selfAssessment: SeedTemplate360 = {
  name: "Self-Assessment",
  description:
    "Focused on self-reflection and personal development planning. Encourages honest introspection about achievements, challenges, and growth areas to prepare for productive review conversations.",
  sections: [
    {
      title: "Self-Reflection",
      description:
        "Reflect honestly on your overall performance, strengths, and how you have contributed to team and organizational goals.",
      order: 1,
      reviewerTypes: SELF_ONLY,
      questions: [
        {
          text: "I consistently performed at or above the level expected for my role during this review period.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "Describe your most significant accomplishment during this review period. What was the impact and what did you learn?",
          description:
            "Be specific about the situation, your actions, and the measurable outcome.",
          type: "TEXT",
          isRequired: true,
          order: 2,
        },
        {
          text: "What was the biggest challenge you faced, and how did you handle it? What would you do differently in hindsight?",
          type: "TEXT",
          isRequired: true,
          order: 3,
        },
        {
          text: "How effectively did you collaborate with your team and cross-functional partners?",
          description:
            "Consider specific examples of collaboration, conflict resolution, and team contribution.",
          type: "TEXT",
          isRequired: true,
          order: 4,
        },
      ],
    },
    {
      title: "Goal Achievement",
      description:
        "Evaluate your progress toward the goals set at the beginning of the review period.",
      order: 2,
      reviewerTypes: SELF_ONLY,
      questions: [
        {
          text: "I made meaningful progress toward the goals set for this review period.",
          type: "RATING",
          isRequired: true,
          order: 1,
        },
        {
          text: "Summarize your progress on each of your key goals. For any goals not fully achieved, explain what factors contributed and what you plan to do going forward.",
          type: "TEXT",
          isRequired: true,
          order: 2,
        },
        {
          text: "Did any of your goals change during the review period? If so, describe why and how you adapted.",
          type: "TEXT",
          isRequired: false,
          order: 3,
        },
      ],
    },
    {
      title: "Growth Areas",
      description:
        "Identify areas for development and outline how you plan to grow in the next review period.",
      order: 3,
      reviewerTypes: SELF_ONLY,
      questions: [
        {
          text: "What are the top 2-3 skills or competencies you want to develop in the next review period, and why?",
          description:
            "Be specific about both the skill and the reason it matters for your role or career path.",
          type: "TEXT",
          isRequired: true,
          order: 1,
        },
        {
          text: "What specific resources, support, or opportunities would help you achieve your development goals?",
          description:
            "Consider training, mentorship, stretch assignments, tools, or process changes.",
          type: "TEXT",
          isRequired: true,
          order: 2,
        },
        {
          text: "I actively sought and applied feedback to improve my performance during this review period.",
          type: "RATING",
          isRequired: true,
          order: 3,
        },
        {
          text: "Is there any additional context about your performance or development that you would like to share with your manager?",
          type: "TEXT",
          isRequired: false,
          order: 4,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const SYSTEM_360_TEMPLATES: SeedTemplate360[] = [
  standardPerformanceReview,
  leadershipAssessment,
  managerEffectiveness,
  peerFeedback,
  selfAssessment,
];
