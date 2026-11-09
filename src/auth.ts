import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isLoopbackHost, useRequestHostForAuth } from "@/lib/public-origin";

useRequestHostForAuth();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const password = String(credentials.password ?? "");
        if (!email || !password) return null;
        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      const base = new URL(baseUrl);
      const target = new URL(url, base);
      if (isLoopbackHost(target.hostname) && !isLoopbackHost(base.hostname)) {
        return `${base.origin}${target.pathname}${target.search}`;
      }
      if (target.origin === base.origin) return target.toString();
      if (url.startsWith("/") && !url.startsWith("//")) return `${base.origin}${url}`;
      return base.origin;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
