import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.companyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, companyId: session.companyUser.companyId },
    include: {
      members: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              title: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({
    members: team.members.map((m) => ({
      employeeId: m.employeeId,
      role: m.role,
      employee: m.employee,
    })),
  });
}
