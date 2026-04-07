import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getAdminUser } from "./db";
import type { UserRole } from "./types";

// Auto-generate a secret for local development if AUTH_SECRET is not set
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "local-dev-secret-allsport-freunde-2026-change-in-production";
}

declare module "next-auth" {
  interface User {
    role?: UserRole;
    dbId?: number;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
      dbId?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    dbId?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        const user = await getAdminUser(username);
        if (!user) return null;
        if (user.status === "INACTIVE") return null;

        const isValid = await compare(password, user.password_hash);
        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.username,
          role: user.role,
          dbId: user.id,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.dbId = user.dbId;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.dbId = token.dbId;
        session.user.id = token.sub ?? String(token.dbId);
      }
      return session;
    },
    authorized({ auth, request }) {
      const isAdmin = request.nextUrl.pathname.startsWith("/admin");
      const isLoginPage = request.nextUrl.pathname === "/admin/login";
      const isAdminApi = request.nextUrl.pathname.startsWith("/api/admin");
      const isLoggedIn = !!auth?.user;

      if (isAdminApi) {
        return isLoggedIn;
      }

      if (isAdmin && !isLoginPage) {
        return isLoggedIn;
      }

      return true;
    },
  },
});

/** Helper: get current user id + role from session in API routes */
export async function getCurrentUser(): Promise<{
  id: number;
  name: string;
  role: UserRole;
} | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.dbId ?? Number(session.user.id),
    name: session.user.name ?? "Unbekannt",
    role: session.user.role ?? "VIEWER",
  };
}
