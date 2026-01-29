import { PrismaClient, QuestionType, ReviewerType, CycleStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean up existing data
  console.log("Cleaning up existing data...");
  await prisma.reviewResponse.deleteMany();
  await prisma.reviewAssignment.deleteMany();
  await prisma.reviewToken.deleteMany();
  await prisma.nomination.deleteMany();
  await prisma.cycleParticipant.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.templateQuestion.deleteMany();
  await prisma.templateSection.deleteMany();
  await prisma.template.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.department.deleteMany();
  await prisma.competency.deleteMany();
  await prisma.company.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create demo company
  console.log("Creating demo company...");
  const company = await prisma.company.create({
    data: {
      name: "Acme Corporation",
      slug: "acme-corp",
    },
  });

  // Create departments
  console.log("Creating departments...");
  const departments = await Promise.all([
    prisma.department.create({
      data: { name: "Engineering", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Product", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Design", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Marketing", companyId: company.id },
    }),
    prisma.department.create({
      data: { name: "Sales", companyId: company.id },
    }),
  ]);

  const [engineering, product, design, marketing, sales] = departments;

  // Create users and company users
  console.log("Creating users...");

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@acme.com",
      name: "Alex Admin",
      emailVerified: new Date(),
    },
  });

  const adminCompanyUser = await prisma.companyUser.create({
    data: {
      userId: adminUser.id,
      companyId: company.id,
      role: "ADMIN",
      title: "HR Director",
      departmentId: engineering.id,
    },
  });

  // Engineering team
  const engManager = await prisma.user.create({
    data: {
      email: "sarah.eng@acme.com",
      name: "Sarah Chen",
      emailVerified: new Date(),
    },
  });

  const engManagerCompany = await prisma.companyUser.create({
    data: {
      userId: engManager.id,
      companyId: company.id,
      role: "MANAGER",
      title: "Engineering Manager",
      departmentId: engineering.id,
    },
  });

  const engineers = await Promise.all([
    {
      email: "james.dev@acme.com",
      name: "James Wilson",
      title: "Senior Software Engineer",
    },
    {
      email: "maria.dev@acme.com",
      name: "Maria Garcia",
      title: "Software Engineer",
    },
    {
      email: "kevin.dev@acme.com",
      name: "Kevin Park",
      title: "Software Engineer",
    },
    {
      email: "emily.dev@acme.com",
      name: "Emily Johnson",
      title: "Junior Software Engineer",
    },
  ].map(async (eng) => {
    const user = await prisma.user.create({
      data: {
        email: eng.email,
        name: eng.name,
        emailVerified: new Date(),
      },
    });
    return prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "EMPLOYEE",
        title: eng.title,
        departmentId: engineering.id,
        managerId: engManagerCompany.id,
      },
    });
  }));

  // Product team
  const productManager = await prisma.user.create({
    data: {
      email: "mike.product@acme.com",
      name: "Mike Thompson",
      emailVerified: new Date(),
    },
  });

  const productManagerCompany = await prisma.companyUser.create({
    data: {
      userId: productManager.id,
      companyId: company.id,
      role: "MANAGER",
      title: "Product Manager",
      departmentId: product.id,
    },
  });

  const productTeam = await Promise.all([
    {
      email: "lisa.pm@acme.com",
      name: "Lisa Brown",
      title: "Associate Product Manager",
    },
    {
      email: "david.pm@acme.com",
      name: "David Lee",
      title: "Product Analyst",
    },
  ].map(async (pm) => {
    const user = await prisma.user.create({
      data: {
        email: pm.email,
        name: pm.name,
        emailVerified: new Date(),
      },
    });
    return prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "EMPLOYEE",
        title: pm.title,
        departmentId: product.id,
        managerId: productManagerCompany.id,
      },
    });
  }));

  // Design team
  const designManager = await prisma.user.create({
    data: {
      email: "anna.design@acme.com",
      name: "Anna Martinez",
      emailVerified: new Date(),
    },
  });

  const designManagerCompany = await prisma.companyUser.create({
    data: {
      userId: designManager.id,
      companyId: company.id,
      role: "MANAGER",
      title: "Design Lead",
      departmentId: design.id,
    },
  });

  const designTeam = await Promise.all([
    {
      email: "tom.design@acme.com",
      name: "Tom Anderson",
      title: "Senior UX Designer",
    },
    {
      email: "rachel.design@acme.com",
      name: "Rachel Kim",
      title: "UI Designer",
    },
  ].map(async (designer) => {
    const user = await prisma.user.create({
      data: {
        email: designer.email,
        name: designer.name,
        emailVerified: new Date(),
      },
    });
    return prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "EMPLOYEE",
        title: designer.title,
        departmentId: design.id,
        managerId: designManagerCompany.id,
      },
    });
  }));

  // Create competencies
  console.log("Creating competencies...");
  const competencies = await Promise.all([
    prisma.competency.create({
      data: {
        name: "Communication",
        description: "Ability to communicate effectively with team members and stakeholders",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Problem Solving",
        description: "Ability to analyze problems and develop effective solutions",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Collaboration",
        description: "Ability to work effectively with others to achieve common goals",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Technical Skills",
        description: "Proficiency in role-specific technical competencies",
        companyId: company.id,
      },
    }),
    prisma.competency.create({
      data: {
        name: "Leadership",
        description: "Ability to guide and inspire others",
        companyId: company.id,
      },
    }),
  ]);

  // Create templates
  console.log("Creating templates...");

  // Standard 360 Review Template
  const standardTemplate = await prisma.template.create({
    data: {
      name: "Standard 360° Review",
      description: "Comprehensive 360-degree feedback template covering key performance areas",
      companyId: company.id,
      isDefault: true,
      sections: {
        create: [
          {
            title: "Job Performance",
            description: "Evaluate overall job performance and work quality",
            order: 0,
            reviewerTypes: ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "How would you rate the quality of their work?",
                  description: "Consider accuracy, thoroughness, and attention to detail",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "How effectively do they meet deadlines and manage their time?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "What are their key strengths in their role?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
                {
                  text: "What areas could they improve in?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 3,
                },
              ],
            },
          },
          {
            title: "Communication & Collaboration",
            description: "Assess communication skills and teamwork",
            order: 1,
            reviewerTypes: ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "How effectively do they communicate with team members?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "How well do they collaborate with others on projects?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "How receptive are they to feedback?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
                {
                  text: "Describe their communication style and its impact on the team",
                  type: "TEXT" as QuestionType,
                  isRequired: false,
                  order: 3,
                },
              ],
            },
          },
          {
            title: "Leadership & Initiative",
            description: "Evaluate leadership qualities and proactive behavior",
            order: 2,
            reviewerTypes: ["MANAGER", "PEER", "DIRECT_REPORT"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "How well do they take initiative on projects?",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "How effectively do they mentor or support others?",
                  type: "RATING" as QuestionType,
                  isRequired: false,
                  order: 1,
                },
                {
                  text: "Describe a time when they demonstrated leadership",
                  type: "TEXT" as QuestionType,
                  isRequired: false,
                  order: 2,
                },
              ],
            },
          },
          {
            title: "Self Reflection",
            description: "Personal reflection on performance and growth",
            order: 3,
            reviewerTypes: ["SELF"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "What accomplishments are you most proud of this period?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "What challenges did you face and how did you address them?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "What are your goals for the next review period?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Quick Check-in Template
  const quickTemplate = await prisma.template.create({
    data: {
      name: "Quick Check-in",
      description: "Short feedback template for regular check-ins",
      companyId: company.id,
      sections: {
        create: [
          {
            title: "Performance Snapshot",
            order: 0,
            reviewerTypes: ["SELF", "MANAGER"] as ReviewerType[],
            questions: {
              create: [
                {
                  text: "Overall performance rating",
                  type: "RATING" as QuestionType,
                  isRequired: true,
                  order: 0,
                },
                {
                  text: "What went well this period?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 1,
                },
                {
                  text: "What could be improved?",
                  type: "TEXT" as QuestionType,
                  isRequired: true,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Create a sample review cycle
  console.log("Creating review cycle...");
  const cycle = await prisma.cycle.create({
    data: {
      name: "Q1 2025 Performance Review",
      description: "First quarter performance review for all team members",
      companyId: company.id,
      templateId: standardTemplate.id,
      status: "IN_PROGRESS" as CycleStatus,
      reviewStartDate: new Date("2025-01-15"),
      reviewEndDate: new Date("2025-02-15"),
      selfReviewEnabled: true,
      managerReviewEnabled: true,
      peerReviewEnabled: true,
      directReportEnabled: true,
      minPeers: 2,
      maxPeers: 5,
      anonymityThreshold: 3,
    },
  });

  // Add participants (all employees)
  const allEmployees = [
    engManagerCompany,
    ...engineers,
    productManagerCompany,
    ...productTeam,
    designManagerCompany,
    ...designTeam,
  ];

  console.log("Adding participants...");
  await prisma.cycleParticipant.createMany({
    data: allEmployees.map((emp) => ({
      cycleId: cycle.id,
      companyUserId: emp.id,
    })),
  });

  // Create some review assignments
  console.log("Creating review assignments...");
  for (const participant of allEmployees.slice(0, 4)) {
    // Self review
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: participant.id,
        revieweeId: participant.id,
        reviewerType: "SELF",
        status: "PENDING",
      },
    });
  }

  // Manager reviews for engineering team
  for (const eng of engineers) {
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: engManagerCompany.id,
        revieweeId: eng.id,
        reviewerType: "MANAGER",
        status: "PENDING",
      },
    });
  }

  // Some peer reviews
  if (engineers.length >= 2) {
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: engineers[0].id,
        revieweeId: engineers[1].id,
        reviewerType: "PEER",
        status: "PENDING",
      },
    });
    await prisma.reviewAssignment.create({
      data: {
        cycleId: cycle.id,
        reviewerId: engineers[1].id,
        revieweeId: engineers[0].id,
        reviewerType: "PEER",
        status: "PENDING",
      },
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("");
  console.log("Demo accounts created:");
  console.log("  Admin: admin@acme.com");
  console.log("  Manager: sarah.eng@acme.com");
  console.log("  Employee: james.dev@acme.com");
  console.log("");
  console.log("Use magic link authentication to log in.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
