import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      githubUsername?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
    githubUsername?: string;
    backendToken?: string;
  }
}
