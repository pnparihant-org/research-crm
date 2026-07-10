import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _GET = async (req: NextRequest) => {
  console.log("[master-admin/active-users] GET");
  const session = await auth();
  if (!session?.user) {
    console.log("[master-admin/active-users] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "master_admin") {
    console.log(`[master-admin/active-users] GET FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, everLoggedIn, onlineNow, activeToday, activeThisWeek, users] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ lastActiveAt: { $ne: null } }),
    User.countDocuments({ lastActiveAt: { $gte: fiveMinAgo } }),
    User.countDocuments({ lastActiveAt: { $gte: dayAgo } }),
    User.countDocuments({ lastActiveAt: { $gte: weekAgo } }),
    User.find({})
      .select("name email role dept lastActiveAt createdAt")
      .sort({ lastActiveAt: -1 })
      .lean(),
  ]);

  console.log(`[master-admin/active-users] GET — everLoggedIn=${everLoggedIn} onlineNow=${onlineNow} activeToday=${activeToday} activeThisWeek=${activeThisWeek} total=${totalUsers}`);
  return NextResponse.json({ totalUsers, everLoggedIn, onlineNow, activeToday, activeThisWeek, users });
};

export const GET = withErrorHandler(_GET);
