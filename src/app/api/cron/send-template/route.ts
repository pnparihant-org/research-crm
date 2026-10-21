import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { generateTemplateBuffer } from "@/lib/templateGenerator";
import { sendDailyTemplateEmail } from "@/lib/mailer";
import { withErrorHandler } from "@/lib/apiHandler";

// Called by Vercel Cron at 7 AM IST (01:30 UTC) on weekdays.
// Also callable manually: POST /api/cron/send-template with Authorization: Bearer <CRON_SECRET>
const _POST = async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // If ?testEmail=someone@example.com is passed, send only to that one user (for testing)
  const testEmail = new URL(req.url).searchParams.get("testEmail");

  const query = testEmail
    ? { email: testEmail.toLowerCase() }
    : { role: { $in: ["user", "admin"] } };

  const users = await User.collection
    .find(query, { projection: { name: 1, email: 1, assignedClients: 1, role: 1, designation: 1 } })
    .toArray();

  if (users.length === 0) {
    return NextResponse.json({ message: "No users found", sent: 0 });
  }

  // Resolve all client IDs referenced by assignments, plus the full client list —
  // admins and master admins get every client, same as /api/users/my-clients.
  const ClientCol = mongoose.connection.collection("clients");
  const allClientIds = users.flatMap((u) =>
    (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId }) => ac.client).filter(Boolean)
  );
  const uniqueIds = [...new Set(allClientIds.map((id) => id?.toString()))].filter(Boolean);
  const clientDocs = uniqueIds.length
    ? await ClientCol.find(
        { _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { projection: { name: 1 } }
      ).toArray()
    : [];
  const clientMap = Object.fromEntries(clientDocs.map((c) => [c._id.toString(), c.name as string]));

  const needsAllClients = users.some((u) => u.role === "admin" || u.role === "master_admin");
  const allClientNames = needsAllClients
    ? (await ClientCol.find({}, { projection: { name: 1 } }).toArray()).map((c) => c.name as string)
    : [];

  // IST date label for subject/filename
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-"); // "DD-MM-YYYY" — must match the HMAC signing format

  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      const isAdmin = user.role === "admin" || user.role === "master_admin";
      const clientNames: string[] = isAdmin
        ? allClientNames
        : (user.assignedClients ?? [])
            .map((ac: { client: mongoose.Types.ObjectId }) => clientMap[ac.client?.toString()] ?? "")
            .filter(Boolean);

      const designation = (user.designation as string | null) ?? "";
      const buffer = await generateTemplateBuffer(clientNames, user._id.toString(), dateLabel, isAdmin, designation);
      await sendDailyTemplateEmail(user.email, user.name, dateLabel, buffer);
      sent++;
    } catch (err) {
      console.error(`[cron/send-template] Failed for ${user.email}:`, err);
      errors.push(user.email);
    }
  }

  console.log(`[cron/send-template] Done — sent=${sent}, errors=${errors.length}`);
  return NextResponse.json({ sent, errors, total: users.length });
};

// Vercel Cron uses GET by default when no method is specified
const _GET = async (req: NextRequest) => {
  return POST(req);
};

export const POST = withErrorHandler(_POST);
export const GET = withErrorHandler(_GET);
