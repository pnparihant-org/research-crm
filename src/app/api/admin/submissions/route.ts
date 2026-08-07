import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const DEFAULT_LIMIT = 500;

const _GET = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "master_admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId")?.trim() ?? "";
  const all = searchParams.get("all") === "true" || Boolean(userId);
  const limit = all ? 0 : parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const search = searchParams.get("search")?.trim() ?? "";

  const filter: Record<string, unknown> = {};
  if (userId) filter.userId = userId;
  if (search) {
    filter.$or = [
      { clientName:   { $regex: search, $options: "i" } },
      { salesPerson:  { $regex: search, $options: "i" } },
      { company:      { $regex: search, $options: "i" } },
      { analystName:  { $regex: search, $options: "i" } },
      { modeOfCommunication: { $regex: search, $options: "i" } },
      { designation:  { $regex: search, $options: "i" } },
      { formType:     { $regex: search, $options: "i" } },
      { sector:       { $regex: search, $options: "i" } },
      { cmpTarget:    { $regex: search, $options: "i" } },
      { recommendation: { $regex: search, $options: "i" } },
      { buySideAnalystDesignation: { $regex: search, $options: "i" } },
      { rationale:    { $regex: search, $options: "i" } },
      { feedback:     { $regex: search, $options: "i" } },
      { others:       { $regex: search, $options: "i" } },
      { date:         { $regex: search, $options: "i" } },
    ];
  }

  await connectDB();
  const query = FormSubmission.find(filter)
    .populate<{ userId: { name: string; email: string } }>("userId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  if (limit > 0) query.limit(limit);

  const submissions = await query;
  console.log(`[admin/submissions] returned ${submissions.length} (limit=${limit || "all"} search="${search}") to ${session.user.email}`);
  return NextResponse.json(submissions);
};

export const GET = withErrorHandler(_GET);
