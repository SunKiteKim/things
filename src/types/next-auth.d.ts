import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      portal: string;
    } & DefaultSession["user"];
  }

  interface User {
    passwordVersion?: string;
    role?: string;
    portal?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    passwordVersion?: string;
    id?: string;
    role?: string;
    portal?: string;
  }
}
