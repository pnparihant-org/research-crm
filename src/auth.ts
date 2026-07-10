import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ActionLog } from "@/models/ActionLog";

const ACTIVITY_SYNC_THROTTLE_MS = 60_000;

function getRequestIp(request?: Request): string {
  if (!request) return "unknown";
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        console.log(`[auth] authorize — email=${credentials?.email}`);
        if (!credentials?.email || !credentials?.password) {
          console.log("[auth] authorize FAIL — missing credentials");
          return null;
        }

        try {
          await connectDB();
          const user = await User.findOne({ email: (credentials.email as string).toLowerCase() });
          if (!user) {
            console.log(`[auth] authorize FAIL — user not found, email=${credentials.email}`);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          if (!isValid) {
            console.log(`[auth] authorize FAIL — wrong password, email=${credentials.email}`);
            return null;
          }

          console.log(`[auth] authorize OK — email=${user.email} role=${user.role} 2fa=${user.twoFactorEnabled}`);

          const now = new Date();
          user.lastActiveAt = now;
          await user.save();
          await ActionLog.create({
            userId: user._id.toString(),
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            action: "LOGIN",
            ip: getRequestIp(request),
            userAgent: request?.headers.get("user-agent") ?? null,
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role ?? "user",
            dept: user.dept ?? null,
            twoFactorEnabled: user.twoFactorEnabled,
            twoFactorVerified: false,
          };
        } catch (err) {
          console.error("[auth] authorize ERROR:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        console.log(`[auth] jwt callback — new session for email=${user.email} role=${(user as { role?: string }).role}`);
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.dept = (user as { dept?: "research" | "institution" | null }).dept ?? null;
        token.twoFactorEnabled = (user as { twoFactorEnabled?: boolean }).twoFactorEnabled ?? false;
        token.twoFactorVerified = false;
        token.lastActiveSync = Date.now();
      } else if (token.id) {
        const lastSync = (token.lastActiveSync as number | undefined) ?? 0;
        const now = Date.now();
        if (now - lastSync > ACTIVITY_SYNC_THROTTLE_MS) {
          token.lastActiveSync = now;
          try {
            await connectDB();
            await User.updateOne({ _id: token.id }, { $set: { lastActiveAt: new Date() } });
          } catch (err) {
            console.error("[auth] jwt callback — failed to update lastActiveAt:", err);
          }
        }
      }
      if (trigger === "update" && session?.twoFactorVerified) {
        console.log(`[auth] jwt callback — 2FA verified update for token id=${token.id}`);
        token.twoFactorVerified = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "user" | "admin" | "master_admin";
        session.user.dept = token.dept as "research" | "institution" | null;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.twoFactorVerified = token.twoFactorVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
