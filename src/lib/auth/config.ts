import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { buildLoginLinkEmail } from "@/lib/email/auth-emails";
import type { Adapter } from "next-auth/adapters";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding",
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM || "Kultiva <noreply@kultiva.com>",
      sendVerificationRequest: async ({ identifier, url }) => {
        if (process.env.EMAIL_DEV_MODE === "true" || !resend) {
          console.log("\n========================================");
          console.log("MAGIC LINK EMAIL (Dev Mode)");
          console.log("========================================");
          console.log(`To: ${identifier}`);
          console.log(`URL: ${url}`);
          console.log("========================================\n");
          return;
        }

        // Spanish like the sign-in page itself: the company's language isn't known before sign-in
        const { subject, html, text } = buildLoginLinkEmail({ url });
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Kultiva <noreply@kultiva.com>",
          to: identifier,
          subject,
          html,
          text,
        });
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID
      ? [
        GoogleProvider({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;

        // Fetch user with global role
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { globalRole: true },
        });
        token.globalRole = dbUser?.globalRole || "USER";
      } else if (token.id) {
        // Verify user still exists (handles stale JWTs after DB reset)
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        });
        if (!dbUser) {
          // User no longer exists — invalidate token
          return { ...token, id: "", globalRole: "USER" as const };
        }
      }

      // Handle session updates
      if (trigger === "update") {
        if (session?.companyId) {
          token.currentCompanyId = session.companyId;
        }
        // Refresh display fields (name + image) from DB after profile edits.
        // The client opts in by calling update({ refreshProfile: true }).
        if (session?.refreshProfile && token.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, image: true },
          });
          if (dbUser) {
            token.name = dbUser.name ?? null;
            token.picture = dbUser.image ?? null;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.globalRole = (token.globalRole as "SUPER_ADMIN" | "USER") || "USER";

        // Members only see active companies; super admins see every company,
        // to reactivate one
        const userId = token.id as string;
        const activeOnly = token.globalRole === "SUPER_ADMIN" ? {} : { company: { isActive: true } };
        const include = {
          company: { select: { id: true, name: true, slug: true, locale: true, isActive: true } },
        } as const;

        // The company picked in the switcher, else the only one the user has
        const currentCompanyId = token.currentCompanyId as string | undefined;
        let companyUser = currentCompanyId
          ? await prisma.companyUser.findFirst({
              where: { userId, companyId: currentCompanyId, isActive: true, ...activeOnly },
              include,
            })
          : null;
        if (!companyUser) {
          const companyUsers = await prisma.companyUser.findMany({
            where: { userId, isActive: true, ...activeOnly },
            include,
            take: 2,
          });
          if (companyUsers.length === 1) companyUser = companyUsers[0];
        }

        if (companyUser) {
          session.companyUser = {
            id: companyUser.id,
            companyId: companyUser.companyId,
            companyName: companyUser.company.name,
            companySlug: companyUser.company.slug,
            role: companyUser.role,
            employeeId: companyUser.employeeId,
            locale: companyUser.company.locale ?? "es",
            companyActive: companyUser.company.isActive,
          };
        } else if (token.globalRole !== "SUPER_ADMIN") {
          // Tell them their company was deactivated rather than sending them to create one
          session.companyInactive =
            (await prisma.companyUser.count({
              where: { userId, isActive: true, company: { isActive: false } },
            })) > 0;
        }
      }

      return session;
    },
    async signIn({ user, account }) {
      // Allow all OAuth and email sign-ins
      if (account?.provider === "google" || account?.provider === "email") {
        return true;
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);

      // Auto-assign SUPER_ADMIN if user's email domain is in SuperAdminDomain table
      const email = user.email?.toLowerCase() || "";
      const domain = email.split("@")[1];
      if (domain) {
        const match = await prisma.superAdminDomain.findUnique({
          where: { domain },
        });
        if (match) {
          await prisma.user.update({
            where: { id: user.id },
            data: { globalRole: "SUPER_ADMIN" },
          });
          console.log(`Auto-assigned SUPER_ADMIN to ${email} (domain: ${domain})`);
        }
      }
    },
  },
};

// Helper function to get server session
export async function auth() {
  return getServerSession(authOptions);
}

// Type augmentation for next-auth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      globalRole: "SUPER_ADMIN" | "USER";
    };
    companyUser?: {
      id: string;
      companyId: string;
      companyName: string;
      companySlug: string;
      role: "ADMIN" | "MANAGER" | "MEMBER";
      employeeId: string | null;
      locale: string;
      /** False when a super admin is looking at a deactivated company. */
      companyActive: boolean;
    };
    /** The user only belongs to deactivated companies. */
    companyInactive?: boolean;
  }

  interface User {
    globalRole?: "SUPER_ADMIN" | "USER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    globalRole: "SUPER_ADMIN" | "USER";
    currentCompanyId?: string;
  }
}
