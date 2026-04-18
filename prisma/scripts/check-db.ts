import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const companies = await prisma.company.count();
  const employees = await prisma.employee.count();
  const departments = await prisma.department.count();

  let hubs = 0, teams = 0;
  try { hubs = await (prisma as any).hub.count(); } catch { hubs = -1; }
  try { teams = await (prisma as any).team.count(); } catch { teams = -1; }

  const cycles = await prisma.cycle.count();
  const participants = await prisma.cycleParticipant.count();
  const nominations = await prisma.nomination.count();
  const assignments = await prisma.reviewAssignment.count();
  const reviewResponses = await prisma.reviewResponse.count();

  let climateSurveys = 0, templates = 0, distributions = 0, surveyResponses = 0, surveyAnswers = 0;
  try { climateSurveys = await prisma.climateSurvey.count(); } catch { climateSurveys = -1; }
  try { templates = await prisma.climateSurveyTemplate.count(); } catch { templates = -1; }
  try { distributions = await prisma.surveyDistribution.count(); } catch { distributions = -1; }
  try { surveyResponses = await prisma.surveyResponse.count(); } catch { surveyResponses = -1; }
  try { surveyAnswers = await prisma.surveyAnswer.count(); } catch { surveyAnswers = -1; }

  console.log("=== DATABASE RECORD COUNTS ===");
  console.log(`Users:              ${users}`);
  console.log(`Companies:          ${companies}`);
  console.log(`Employees:          ${employees}`);
  console.log(`Departments:        ${departments}`);
  console.log(`Hubs:               ${hubs}`);
  console.log(`Teams:              ${teams}`);
  console.log(`--- 360 Reviews ---`);
  console.log(`Cycles:             ${cycles}`);
  console.log(`CycleParticipants:  ${participants}`);
  console.log(`Nominations:        ${nominations}`);
  console.log(`ReviewAssignments:  ${assignments}`);
  console.log(`ReviewResponses:    ${reviewResponses}`);
  console.log(`--- Climate Surveys ---`);
  console.log(`ClimateSurveyTemplates: ${templates}`);
  console.log(`ClimateSurveys:     ${climateSurveys}`);
  console.log(`SurveyDistributions: ${distributions}`);
  console.log(`SurveyResponses:    ${surveyResponses}`);
  console.log(`SurveyAnswers:      ${surveyAnswers}`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
