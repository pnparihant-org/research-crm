import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { logAction } from "@/lib/auditLog";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";
import { checkRateLimit } from "@/lib/rateLimiter";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`mpin-verify:${session.user.id}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many incorrect attempts. Try again in ${Math.ceil((rl.retryAfterSeconds ?? 0) / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const { mpin } = await req.json();
  if (!mpin || typeof mpin !== "string" || !/^\d{6}$/.test(mpin)) {
    return NextResponse.json({ error: "MPIN must be 6 digits" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email }).select("mpin name role");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.mpin) {
    return NextResponse.json({ error: "MPIN not set. Please set your MPIN first." }, { status: 400 });
  }

  const match = await bcrypt.compare(mpin, user.mpin);
  if (!match) {
    return NextResponse.json({ error: "Incorrect MPIN" }, { status: 400 });
  }

  await logAction(req, session as never, "LOGIN", "Logged in via MPIN");
  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
