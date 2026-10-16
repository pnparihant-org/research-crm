import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { Client, ClientCategory } from "@/models/MasterData";
import { logAction } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];
const MAX_ROWS = 2000;

interface InRow { name: string; category: string }

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const rows: InRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  if (rows.length > MAX_ROWS)
    return NextResponse.json({ error: `Maximum ${MAX_ROWS} rows per upload` }, { status: 400 });

  const clean = rows
    .map((r) => ({ name: (r.name ?? "").trim(), category: (r.category ?? "").trim() }))
    .filter((r) => r.name && r.category);
  if (clean.length === 0) return NextResponse.json({ error: "No valid rows — each row needs a name and category" }, { status: 400 });

  await connectDB();

  // Ensure every requested category exists, re-using existing casing when it matches case-insensitively.
  const existingCats = await ClientCategory.find().lean();
  const catByLower = new Map(existingCats.map((c) => [c.name.toLowerCase(), c.name]));
  const categoriesCreated: string[] = [];
  for (const r of clean) {
    const lower = r.category.toLowerCase();
    const canonical = catByLower.get(lower);
    if (canonical) {
      r.category = canonical;
    } else {
      await ClientCategory.create({ name: r.category });
      catByLower.set(lower, r.category);
      categoriesCreated.push(r.category);
    }
  }

  // Skip rows that already exist (same name + category, case-insensitive).
  const existingClients = await Client.find().lean();
  const existingSigs = new Set(existingClients.map((c) => `${(c.category ?? "").toLowerCase()}|${(c.name ?? "").toLowerCase()}`));

  const toInsert: InRow[] = [];
  const insertSigs = new Set<string>();
  let skipped = 0;
  for (const r of clean) {
    const sig = `${r.category.toLowerCase()}|${r.name.toLowerCase()}`;
    if (existingSigs.has(sig) || insertSigs.has(sig)) { skipped++; continue; }
    insertSigs.add(sig);
    toInsert.push(r);
  }

  let created = 0;
  if (toInsert.length > 0) {
    const inserted = await Client.insertMany(
      toInsert.map((r) => ({ name: r.name, category: r.category })),
      { ordered: false }
    );
    created = inserted.length;
  }

  console.log(`[master/clients/bulk] POST — created=${created} skipped=${skipped} categoriesCreated=${categoriesCreated.length} by ${session.user.email}`);
  await logAction(
    req,
    session,
    "BULK_CLIENT_UPLOAD",
    `Created ${created} client(s), skipped ${skipped} duplicate(s)${categoriesCreated.length ? `, new categories: ${categoriesCreated.join(", ")}` : ""}`
  );

  return NextResponse.json({ created, skipped, categoriesCreated });
};

export const POST = withErrorHandler(_POST);
