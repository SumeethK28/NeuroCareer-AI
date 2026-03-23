import { randomUUID } from "crypto";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";
import jwt from "jsonwebtoken";

declare global {
  // eslint-disable-next-line no-var
  var __serverBootNonce: string | undefined;
}

const serverBootNonce = globalThis.__serverBootNonce ?? randomUUID();
globalThis.__serverBootNonce = serverBootNonce;

const audience = process.env.JWT_AUDIENCE ?? "neurocareer-users";
const issuer = process.env.JWT_ISSUER ?? "neurocareer";

type ExtendedToken = JWT & {
  githubId?: string;
  githubUsername?: string;
  backendToken?: string;
  bootNonce?: string;
  forceLogout?: boolean;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  },
  callbacks: {
    async jwt({ token, profile }) {
      const extended = token as ExtendedToken;
      if (extended.bootNonce && extended.bootNonce !== serverBootNonce) {
        extended.forceLogout = true;
      }
      extended.bootNonce = serverBootNonce;

      if (profile) {
        extended.githubId = String(profile.id ?? token.sub ?? "");
        extended.githubUsername =
          (profile.login as string | undefined) ??
          (profile.name as string | undefined) ??
          token.name ??
          undefined;
      }

      const subject = extended.githubId ?? (token.sub as string | undefined);
      if (subject && process.env.NEXTAUTH_SECRET && !extended.forceLogout) {
        extended.backendToken = jwt.sign(
          {
            sub: subject,
            github_username: extended.githubUsername ?? token.name,
            email: token.email,
            aud: audience,
            iss: issuer,
          },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: "1h" }
        );
      }
      return extended;
    },
    async session({ session, token }) {
      const extended = token as ExtendedToken;
      if (extended.forceLogout || extended.bootNonce !== serverBootNonce) {
        return {
          ...session,
          user: undefined,
          backendToken: undefined,
          expires: new Date(0).toISOString(),
        };
      }

      if (session.user) {
        session.user.id = (extended.githubId ?? token.sub ?? "") as string;
        session.user.githubUsername = extended.githubUsername as string | undefined;
      }
      session.backendToken = extended.backendToken as string | undefined;
      return session;
    },
  },
};
