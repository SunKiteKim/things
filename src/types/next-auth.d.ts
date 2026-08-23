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
    role?: string;
    portal?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    portal?: string;
  }
}
