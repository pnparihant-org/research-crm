import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { FormSubmission } from "@/models/FormSubmission";
import { logAction } from "@/lib/auditLog";
import { verifyTemplateSignature } from "@/lib/templateGenerator";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];

function istDateLabel(date: Date): string {
  return date
    .toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-"); // "DD-MM-YYYY"
}

function todayISTLabel(): string {
  return istDateLabel(new Date());
}

function yesterdayISTLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return istDateLabel(d);
}

/** Returns the most recent working day (Mon–Fri) before today in IST. */
function prevWorkingDayISTLabel(): string {
  const now = new Date();
  // Convert to IST by offsetting
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  // Walk backward until we land on a weekday
  const prev = new Date(istNow);
  prev.setDate(prev.getDate() - 1);
  while (prev.getDay() === 0 || prev.getDay() === 6) {
    prev.setDate(prev.getDate() - 1);
  }
  // Shift back to UTC for istDateLabel
  return istDateLabel(new Date(prev.getTime() - istOffset));
}

const _POST = async (req: NextRequest) => {
  console.log("[forms/bulk] POST — bulk upload");
  const session = await auth();
  if (!session?.user) {
    console.log("[forms/bulk] POST FAIL — unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Support both old format (array) and new format ({ filename, signature, rows })
  const filename: string  = body?.filename  ?? "";
  const signature: string = body?.signature ?? "";
  const rows = Array.isArray(body) ? body : (Array.isArray(body?.rows) ? body.rows : null);

  if (!rows || rows.length === 0) {
    console.log(`[forms/bulk] POST FAIL — invalid body, user=${session.user.email}`);
    return NextResponse.json({ error: "Expected a non-empty array of entries" }, { status: 400 });
  }

  if (rows.length > 500) {
    console.log(`[forms/bulk] POST FAIL — too many entries (${rows.length}), user=${session.user.email}`);
    return NextResponse.json({ error: "Maximum 500 entries per upload" }, { status: 400 });
  }

  const isAdminRole = ADMIN_ROLES.includes(session.user.role as string);

  // Server-side filename/date validation — admins are exempt from the official-template check.
  if (filename && !isAdminRole) {
    const dateMatch = filename.match(/CRM_Sheet_(\d{2}-\d{2}-\d{4})/);
    const today = todayISTLabel();

    if (!dateMatch) {
      const details = `User=${session.user.email} uploaded file="${filename}" — not an official template`;
      console.log(`[forms/bulk] POST FAIL — invalid template filename, user=${session.user.email}`);
      await connectDB();
      await logAction(req, session, "BULK_UPLOAD_DATE_MISMATCH", details);
      return NextResponse.json(
        { error: "Invalid file — please use the official template downloaded from this portal." },
        { status: 400 }
      );
    }

    const fileDate = dateMatch[1];
    // For regular users: accept today or the previous working day (skips weekends —
    // e.g. a Friday sheet can be uploaded on Monday).
    // For admins/master_admins: keep the simpler calendar-day T+1 window.
    const isUserRole = session.user.role === "user";
    const acceptedPrev = isUserRole ? prevWorkingDayISTLabel() : yesterdayISTLabel();
    if (fileDate !== today && fileDate !== acceptedPrev) {
      const details = `User=${session.user.email} uploaded template for ${fileDate} but today is ${today}. File="${filename}"`;
      console.log(`[forms/bulk] POST FAIL — date mismatch, user=${session.user.email}, fileDate=${fileDate}, today=${today}`);
      await connectDB();
      await logAction(req, session, "BULK_UPLOAD_DATE_MISMATCH", details);
      const allowedWindow = isUserRole
        ? `today's (${today}) or the previous working day's (${acceptedPrev}) sheet`
        : `today's (${today}) or yesterday's (${acceptedPrev}) sheet`;
      return NextResponse.json(
        { error: `Date mismatch — this sheet is for ${fileDate}. You can only upload ${allowedWindow}.` },
        { status: 400 }
      );
    }

    // Verify HMAC signature — prevents renamed/tampered files from passing
    if (!signature) {
      const details = `User=${session.user.email} uploaded file without a security signature. File="${filename}"`;
      console.log(`[forms/bulk] POST FAIL — missing signature, user=${session.user.email}`);
      await connectDB();
      await logAction(req, session, "BULK_UPLOAD_TAMPERED", details);
      return NextResponse.json(
        { error: "This file is missing a security signature. Please download a fresh template from this portal." },
        { status: 400 }
      );
    }

    // Verify against the file's own date (signature was generated with that date)
    const isValid = verifyTemplateSignature(session.user.id as string, fileDate, signature);
    if (!isValid) {
      const details = `User=${session.user.email} uploaded a tampered or reused sheet. Signature mismatch. File="${filename}"`;
      console.log(`[forms/bulk] POST FAIL — signature mismatch (tampered file), user=${session.user.email}`);
      await connectDB();
      await logAction(req, session, "BULK_UPLOAD_TAMPERED", details);
      return NextResponse.json(
        { error: "Security check failed — this file appears to have been tampered with or does not belong to your account. Please download a fresh template." },
        { status: 400 }
      );
    }
  }

  console.log(`[forms/bulk] POST — inserting ${rows.length} entries for user=${session.user.email}`);
  await connectDB();

  const docs = rows.map((row: Record<string, string>) => ({
    userId:                   session.user.id,
    date:                     row.date?.trim() || todayISTLabel(),
    salesPerson:              session.user.name ?? "",
    clientName:               row.clientName ?? "",
    designation:              row.designation?.trim() || "-",
    modeOfCommunication:      row.modeOfCommunication ?? "",
    formType:                 row.company?.trim() ? "research" : "institution",
    company:                  row.company ?? "",
    sector:                   row.sector ?? "",
    cmpTarget:                row.cmpTarget ?? "",
    recommendation:           row.recommendation ?? "",
    analystName:              row.analystName?.trim() || "-",
    buySideAnalystDesignation: row.buySideAnalystDesignation ?? "",
    rationale:                row.rationale ?? "",
    feedback:                 row.feedback ?? "",
    submittedAt:              new Date(),
  }));

  let inserted: unknown[] = [];
  try {
    inserted = await FormSubmission.insertMany(docs, { ordered: false });
  } catch (err: unknown) {
    // With ordered:false, Mongoose throws BulkWriteError even on partial success.
    // Successfully inserted docs are on err.insertedDocs.
    const bulkErr = err as { name?: string; insertedDocs?: unknown[]; writeErrors?: { errmsg?: string }[] };
    if (bulkErr.name === "MongoBulkWriteError" || bulkErr.name === "BulkWriteError") {
      inserted = bulkErr.insertedDocs ?? [];
      const failCount = (bulkErr.writeErrors ?? []).length;
      console.warn(`[forms/bulk] POST — partial insert: ${inserted.length}/${docs.length} succeeded, ${failCount} failed. Sample error: ${bulkErr.writeErrors?.[0]?.errmsg}`);
    } else {
      console.error(`[forms/bulk] POST — insertMany failed completely for user=${session.user.email}:`, err);
      return NextResponse.json({ error: "Failed to save records. Please try again." }, { status: 500 });
    }
  }

  if (inserted.length === 0) {
    console.error(`[forms/bulk] POST — 0 records inserted for user=${session.user.email}. All ${docs.length} docs failed validation or write.`);
    return NextResponse.json({ error: "No records were saved — all rows failed validation. Check required fields and try again." }, { status: 500 });
  }

  console.log(`[forms/bulk] POST — inserted ${inserted.length}/${docs.length} entries for user=${session.user.email}`);
  return NextResponse.json({ inserted: inserted.length }, { status: 201 });
};

export const POST = withErrorHandler(_POST);
