import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { logAction } from "@/lib/auditLog";
import { maskEmail, maskPhone } from "@/lib/mask";
import { auth } from "@/auth";
import { withErrorHandler } from "@/lib/apiHandler";

const _GET = async (req: NextRequest) => {
  console.log("[admin/users] GET — fetching all users");
  const session = await auth();
  if (!session?.user) {
    console.log("[admin/users] GET FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[admin/users] GET FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  // Admins and master admins get all clients automatically (see /api/users/my-clients) —
  // only regular users need manual client assignment here.
  const users = await User.collection
    .find(
      { role: "user" },
      { projection: { name: 1, email: 1, phone: 1, role: 1, designation: 1, dept: 1, assignedClients: 1, createdAt: 1, twoFactorEnabled: 1 } }
    )
    .toArray();

  // Populate client names + codes from the clients collection
  const ClientCol = mongoose.connection.collection("clients");
  const allClientIds = users.flatMap((u) =>
    (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId }) => ac.client).filter(Boolean)
  );
  const uniqueIds = [...new Set(allClientIds.map((id) => id?.toString()))].filter(Boolean);
  const clientDocs = uniqueIds.length
    ? await ClientCol.find({ _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) } }, { projection: { name: 1, code: 1 } }).toArray()
    : [];
  const clientMap = Object.fromEntries(clientDocs.map((c) => [c._id.toString(), { name: c.name, code: c.code }]));

  const isMasterAdmin = session.user.role === "master_admin";
  const result = users.map((u) => ({
    ...u,
    email: maskEmail(u.email),
    ...(isMasterAdmin && { _rawEmail: u.email }),
    ...(isMasterAdmin && { _rawPhone: u.phone }),
    phone: maskPhone(u.phone),
    assignedClients: (u.assignedClients ?? []).map((ac: { client: mongoose.Types.ObjectId; assignedByName: string; assignedAt: Date }) => ({
      client: ac.client ? { _id: ac.client.toString(), name: clientMap[ac.client.toString()]?.name ?? "—", code: clientMap[ac.client.toString()]?.code ?? "" } : null,
      assignedByName: ac.assignedByName ?? "",
      assignedAt: ac.assignedAt ?? null,
    })).filter((ac: { client: unknown }) => ac.client),
  }));

  console.log(`[admin/users] GET — returned ${result.length} users to requester=${session.user.email}`);
  return NextResponse.json(result);
};

// PATCH body: { action: "add" | "remove", clientId: string }
const _PATCH = async (req: NextRequest) => {
  const id = new URL(req.url).searchParams.get("id");
  console.log(`[admin/users] PATCH — userId=${id}`);
  const session = await auth();
  if (!session?.user) {
    console.log("[admin/users] PATCH FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "master_admin") {
    console.log(`[admin/users] PATCH FAIL — forbidden, role=${session.user.role}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id) {
    console.log("[admin/users] PATCH FAIL — user ID missing");
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const { action, clientId } = await req.json();
  if (!action || !clientId) {
    console.log(`[admin/users] PATCH FAIL — action or clientId missing, userId=${id}`);
    return NextResponse.json({ error: "action and clientId required" }, { status: 400 });
  }

  await connectDB();

  const col = User.collection;
  const userId = new mongoose.Types.ObjectId(id);
  const cId = new mongoose.Types.ObjectId(clientId);

  const ClientCol = mongoose.connection.collection("clients");
  const [targetUser, clientDoc] = await Promise.all([
    col.findOne({ _id: userId }, { projection: { name: 1, email: 1 } }),
    ClientCol.findOne({ _id: cId }, { projection: { name: 1, code: 1 } }),
  ]);
  const targetLabel = targetUser ? `${targetUser.name} (${targetUser.email})` : id;
  const clientLabel = clientDoc ? `${clientDoc.name}${clientDoc.code ? ` [${clientDoc.code}]` : ""}` : clientId;

  if (action === "add") {
    await col.updateOne(
      { _id: userId },
      {
        $addToSet: {
          assignedClients: {
            client: cId,
            assignedBy: new mongoose.Types.ObjectId(session.user.id as string),
            assignedByName: session.user.name ?? "Admin",
            assignedAt: new Date(),
          },
        },
      }
    );
    console.log(`[admin/users] PATCH — assigned clientId=${clientId} to userId=${id} by admin=${session.user.email}`);
  } else if (action === "remove") {
    await col.updateOne(
      { _id: userId },
      { $pull: { assignedClients: { client: cId } as unknown as never } }
    );
    console.log(`[admin/users] PATCH — removed clientId=${clientId} from userId=${id} by admin=${session.user.email}`);
  } else {
    console.log(`[admin/users] PATCH FAIL — unknown action="${action}"`);
    return NextResponse.json({ error: "action must be add or remove" }, { status: 400 });
  }

  await logAction(req, session, action === "add" ? "ASSIGN_CLIENT" : "REMOVE_CLIENT",
    `${action === "add" ? "Assigned" : "Removed"} client ${clientLabel} ${action === "add" ? "to" : "from"} user ${targetLabel}`);
  return NextResponse.json({ success: true });
};

export const GET = withErrorHandler(_GET);
export const PATCH = withErrorHandler(_PATCH);
