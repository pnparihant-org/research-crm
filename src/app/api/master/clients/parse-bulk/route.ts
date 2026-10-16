import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import ExcelJS from "exceljs";
import { withErrorHandler } from "@/lib/apiHandler";

const ADMIN_ROLES = ["admin", "master_admin"];

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "text" in value)
    return String((value as { text: string }).text).trim();
  if (typeof value === "object" && value !== null && "result" in value)
    return String((value as { result: unknown }).result).trim();
  return String(value).trim();
}

function isNumericLike(value: unknown): boolean {
  const s = cellStr(value);
  return s !== "" && !Number.isNaN(Number(s));
}

interface ParsedRow { category: string; name: string; segment: string }

/**
 * Parses the "List of Institutional Clients" layout: the sheet is printed as
 * repeating 3-column blocks (serial-or-category-header, client name, segment)
 * laid out left-to-right, with the list continuing from the bottom of one
 * block into the top of the next. Category header rows have a non-numeric
 * label in the key column and an empty name column.
 */
function parseInstitutionalClientSheet(ws: ExcelJS.Worksheet): ParsedRow[] {
  const maxCol = ws.columnCount;
  const blockCount = Math.max(1, Math.floor(maxCol / 3));

  // The category "carries over" across blocks: when a block runs out of rows
  // mid-category, the next block picks up where it left off, with no new
  // header repeated — so currentCategory is shared across the whole sheet,
  // not reset per block.
  let currentCategory = "";
  const rows: ParsedRow[][] = [];
  for (let b = 0; b < blockCount; b++) {
    const keyCol = b * 3 + 1;
    const nameCol = b * 3 + 2;
    const segCol = b * 3 + 3;
    const blockRows: ParsedRow[] = [];

    ws.eachRow((row) => {
      const keyVal = row.getCell(keyCol).value;
      const nameVal = row.getCell(nameCol).value;
      const segVal = row.getCell(segCol).value;
      const key = cellStr(keyVal);
      const name = cellStr(nameVal);

      if (!key && !name) return; // blank separator row

      if (!isNumericLike(keyVal)) {
        // Category header row (e.g. "Insurance", "FPI") — ignore the sheet title row.
        if (key && !/^list of institutional clients$/i.test(key)) {
          currentCategory = key;
        }
        return;
      }

      if (!name) return;
      blockRows.push({ category: currentCategory || "Uncategorised", name, segment: cellStr(segVal) });
    });

    rows.push(blockRows);
  }

  return rows.flat();
}

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role as string))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request — expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(arrayBuffer);
  } catch {
    return NextResponse.json({ error: "Could not read the file. Please upload a valid .xlsx file." }, { status: 400 });
  }

  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "Invalid Excel file — no worksheets found." }, { status: 400 });

  const parsed = parseInstitutionalClientSheet(ws);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "No client rows found in this sheet." }, { status: 400 });
  }

  // De-duplicate exact (category, name) repeats within the file itself.
  const seen = new Set<string>();
  const rows: ParsedRow[] = [];
  for (const r of parsed) {
    const sig = `${r.category.toLowerCase()}|${r.name.toLowerCase()}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    rows.push(r);
  }

  const categories = Array.from(new Set(rows.map((r) => r.category)));

  return NextResponse.json({ rows, categories });
};

export const POST = withErrorHandler(_POST);
