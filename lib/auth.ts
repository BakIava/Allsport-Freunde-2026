import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getAdminUser } from "./db";

// Auto-generate a secret for local development if AUTH_SECRET is not set
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "local-dev-secret-allsport-freunde-2026-change-in-production";
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

        const isValid = await compare(password, user.password_hash);
        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.username,
        };
      },
    }),
  ],
  callbacks: {
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
