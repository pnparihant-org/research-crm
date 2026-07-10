import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    dept?: "research" | "institution" | null;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "user" | "admin" | "master_admin";
      dept?: "research" | "institution" | null;
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    dept?: "research" | "institution" | null;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
    lastActiveSync?: number;
  }
}
