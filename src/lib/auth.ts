import { createHash } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { SITE_HOST } from "@/lib/site";
import { LIMITS } from "@/lib/utils";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "이메일", type: "email" },
      password: { label: "비밀번호", type: "password" },
      portal: { label: "portal", type: "text" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      const portal = credentials?.portal === "admin" ? "admin" : "shop";
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const ok = await compare(password, user.passwordHash);
      if (!ok) return null;
      if (portal === "admin" && user.role !== "ADMIN") return null;
      if (portal === "shop" && user.role === "ADMIN") return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        portal,
        passwordVersion: createHash("sha256").update(user.passwordHash).digest("hex"),
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: process.env.VERCEL_ENV === "production" ? {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        domain: `.${SITE_HOST}`,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  } : undefined,
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return "/signup?error=email";
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { providerId: account.providerAccountId }],
        },
      });
      if (existing?.role === "ADMIN") return "/login?error=admin";
      if (existing) return true;
      const memberCount = await prisma.user.count({ where: { role: "MEMBER" } });
      if (memberCount >= LIMITS.MAX_MEMBERS) return "/signup?error=limit";
      await prisma.user.create({
        data: {
          email,
          name: user.name || "tHings 회원",
          provider: account.provider,
          providerId: account.providerAccountId,
          role: "MEMBER",
        },
      });
      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role ?? "MEMBER";
        token.portal = user.portal ?? "shop";
        token.passwordVersion = user.passwordVersion;
      }
      if (account && account.provider !== "credentials" && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.portal = "shop";
          token.passwordVersion = dbUser.passwordHash ? createHash("sha256").update(dbUser.passwordHash).digest("hex") : "oauth";
        }
      }
      if (token.role === "ADMIN" || token.role === "MEMBER") {
        const current = await prisma.user.findUnique({ where: { id: String(token.id) } });
        const version = current?.passwordHash ? createHash("sha256").update(current.passwordHash).digest("hex") : current?.provider !== "credentials" && current?.role === "MEMBER" ? "oauth" : null;
        if (!current || current.role !== token.role || !version || token.passwordVersion !== version) {
          token.id = ""; token.role = "REVOKED"; token.portal = "";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = String(token.role ?? "MEMBER");
        session.user.portal = String(token.portal ?? "shop");
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.portal === "admin" || session.user.role === "ADMIN") {
    return null;
  }
  return session;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN" || session.user.portal !== "admin") {
    return null;
  }
  return session;
}
