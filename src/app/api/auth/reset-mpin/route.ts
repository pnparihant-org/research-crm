import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";
import { checkRateLimit } from "@/lib/rateLimiter";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`mpin-reset:${session.user.id}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many incorrect attempts. Try again in ${Math.ceil((rl.retryAfterSeconds ?? 0) / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const { otp, mpin } = await req.json();
  if (!otp || !mpin) return NextResponse.json({ error: "OTP and new MPIN required" }, { status: 400 });
  if (!/^\d{6}$/.test(mpin)) return NextResponse.json({ error: "MPIN must be 6 digits" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email }).select("loginOtp loginOtpExpiry");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.loginOtp || !user.loginOtpExpiry) {
    return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
  }
  if (new Date() > user.loginOtpExpiry) {
    await User.updateOne({ _id: user._id }, { $unset: { loginOtp: "", loginOtpExpiry: "" } });
    return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
  }
  if (user.loginOtp !== otp.trim()) {
    return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
  }

  const hash = await bcrypt.hash(mpin, 10);
  await User.updateOne(
    { _id: user._id },
    { $set: { mpin: hash }, $unset: { loginOtp: "", loginOtpExpiry: "" } }
  );

  return NextResponse.json({ success: true });
};

export const POST = withErrorHandler(_POST);
