import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import ExcelJS from "exceljs";
import { withErrorHandler } from "@/lib/apiHandler";

const REQUIRED_HEADERS = ["Date", "Client Name", "Mode of Communication", "Company", "Buy / Sell / Hold"];

function parseCellDate(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (!s) return "";
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value !== null && "text" in value)
    return String((value as { text: string }).text).trim();
  if (typeof value === "object" && value !== null && "result" in value)
    return String((value as { result: unknown }).result).trim();
  return String(value).trim();
}

const _POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // Extract HMAC signature from the hidden _sig sheet
  const sigSheet = wb.getWorksheet("_sig");
  const fileSignature = sigSheet ? cellStr(sigSheet.getRow(1).getCell(1).value) : "";
  if (!fileSignature) {
    return NextResponse.json(
      { error: "This file is missing a security signature. Please download a fresh template from this portal." },
      { status: 400 }
    );
  }

  // Read the first (Entries) sheet
  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "Invalid Excel file — no worksheets found." }, { status: 400 });

  // Validate header row (ExcelJS row.values is 1-indexed; index 0 is undefined)
  const headerVals = ws.getRow(1).values as unknown[];
  const headers = (Array.isArray(headerVals) ? headerVals.slice(1) : []).map((h) => cellStr(h));
  const missing = REQUIRED_HEADERS.filter(
    (h) => !headers.some((cell) => cell.toLowerCase() === h.toLowerCase())
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Wrong Excel sheet — missing columns: ${missing.join(", ")}. Please use the provided template.` },
      { status: 400 }
    );
  }

  // Build a dynamic column index map from header names (1-indexed, ExcelJS convention).
  // This handles any extra/shifted columns (e.g. export files with a leading "Type" column).
  const colIdx: Record<string, number> = {};
  (ws.getRow(1).values as unknown[]).forEach((h, i) => {
    if (i === 0) return; // ExcelJS row.values[0] is always undefined
    const key = cellStr(h).toLowerCase();
    if (key) colIdx[key] = i;
  });

  const col = (name: string) => colIdx[name.toLowerCase()] ?? -1;

  const rows: Array<{
    date: string;
    clientName: string;
    designation: string;
    modeOfCommunication: string;
    company: string;
    sector: string;
    cmpTarget: string;
    recommendation: string;
    analystName: string;
    buySideAnalystDesignation: string;
    rationale: string;
    feedback: string;
  }> = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (row.hidden) return; // skip rows hidden in the sheet
    const v = row.values as unknown[];
    const get = (i: number) => (i >= 1 ? v[i] ?? "" : "");
    // Skip entirely empty rows. Exclude "designation" — the template pre-fills it for
    // every row so it's never blank on its own, and would otherwise make every unused
    // trailing row look like real data.
    const emptyCheckCols = Object.entries(colIdx)
      .filter(([key]) => key !== "designation")
      .map(([, i]) => i);
    if (emptyCheckCols.every((i) => !cellStr(get(i)))) return;
    rows.push({
      date:                      parseCellDate(get(col("date"))),
      designation:               cellStr(get(col("designation"))),
      clientName:                cellStr(get(col("client name"))),
      analystName:               cellStr(get(col("buy side person"))),
      buySideAnalystDesignation: cellStr(get(col("buy side person designation"))),
      modeOfCommunication:       cellStr(get(col("mode of communication"))),
      company:                   cellStr(get(col("company"))),
      sector:                    cellStr(get(col("sector"))),
      cmpTarget:                 cellStr(get(col("cmp & target"))),
      recommendation:            cellStr(get(col("buy / sell / hold"))),
      rationale:                 cellStr(get(col("rationale"))),
      feedback:                  cellStr(get(col("feedback"))),
    });
  });

  return NextResponse.json({ rows, signature: fileSignature });
};

export const POST = withErrorHandler(_POST);
