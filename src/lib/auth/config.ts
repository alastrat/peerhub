import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
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

        await resend.emails.send({
          from: process.env.EMAIL_FROM || "PeerHub <noreply@peerhub.com>",
          to: identifier,
          subject: "Sign in to PeerHub",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to PeerHub</h2>
              <p>Click the link below to sign in to your PeerHub account:</p>
              <a href="${url}" style="display: inline-block; background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Sign In
              </a>
              <p style="color: #666; font-size: 14px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
          `,
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
      }

      // Handle session updates
      if (trigger === "update" && session?.companyId) {
        token.currentCompanyId = session.companyId;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.globalRole = (token.globalRole as "SUPER_ADMIN" | "USER") || "USER";

        // If user has a current company, fetch company user data
        const currentCompanyId = token.currentCompanyId as string | undefined;

        if (currentCompanyId) {
          const companyUser = await prisma.companyUser.findFirst({
            where: {
              userId: token.id as string,
              companyId: currentCompanyId,
              isActive: true,
            },
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          });

          if (companyUser) {
            session.companyUser = {
              id: companyUser.id,
              companyId: companyUser.companyId,
              companyName: companyUser.company.name,
              companySlug: companyUser.company.slug,
              role: companyUser.role,
              title: companyUser.title,
            };
          }
        } else {
          // Auto-select first company if user only has one
          const companyUsers = await prisma.companyUser.findMany({
            where: {
              userId: token.id as string,
              isActive: true,
            },
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            take: 2,
          });

          if (companyUsers.length === 1) {
            const cu = companyUsers[0];
            session.companyUser = {
              id: cu.id,
              companyId: cu.companyId,
              companyName: cu.company.name,
              companySlug: cu.company.slug,
              role: cu.role,
              title: cu.title,
            };
          }
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
      role: "ADMIN" | "MANAGER" | "EMPLOYEE";
      title: string | null;
    };
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
