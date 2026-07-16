import { compare } from "bcryptjs";
import { eq, and } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/db/client";
import { authIdentities, users } from "@/lib/db/schema";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [CredentialsProvider({
    name: "Email and password",
    credentials: { email: { label: "이메일", type: "email" }, password: { label: "비밀번호", type: "password" } },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const db = getDb();
      const identity = await db.query.authIdentities.findFirst({
        where: and(eq(authIdentities.provider, "password"), eq(authIdentities.providerSubject, credentials.email.toLowerCase())),
      });
      if (!identity?.passwordHash || !(await compare(credentials.password, identity.passwordHash))) return null;
      const user = await db.query.users.findFirst({ where: eq(users.id, identity.userId) });
      return user ? { id: user.id, email: user.email, name: user.displayName } : null;
    },
  })],
  pages: { signIn: "/signin" },
};
