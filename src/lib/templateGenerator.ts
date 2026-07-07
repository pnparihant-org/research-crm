import ExcelJS from "exceljs";
import crypto from "crypto";
import { MODES as BASE_MODES, ADMIN_MODES } from "@/lib/modeOfCommunication";

export function signTemplate(userId: string, dateLabel: string): string {
  const secret = process.env.TEMPLATE_SECRET;
  if (!secret) throw new Error("TEMPLATE_SECRET env variable is not set");
  return crypto.createHmac("sha256", secret).update(`${userId}:${dateLabel}`).digest("hex");
}

export function verifyTemplateSignature(userId: string, dateLabel: string, signature: string): boolean {
  try {
    const expected = signTemplate(userId, dateLabel);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}


const DESIGNATIONS = [
  "Director of Equity Research",
  "Executive Vice President - Institutional Equity Sales",
  "Sr Equity Research Analyst",
  "Equity Research Analyst",
  "Institutional Equity Sales Manager",
  "Equity Research Associate",
  "Sr Manager Sales",
  "Buy Side Person",
  "Intern",
  "Head Institutional Equities",
  "Institutional Sales Trader",
  "Institutional Dealer",
  "Institution Client Relationship",
  "Insti Backoffice Executive",
  "Back Office Operations",
];

const RECS  = ["Buy", "Sell", "Hold"];

const TEMPLATE_HEADERS = [
  "Sr.No",
  "Date",
  "Arihant Representative",
  "Designation",
  "Client Name",
  "Buy Side Person",
  "Buy Side Person Designation",
  "Mode of Communication",
  "Company",
  "Sector",
  "CMP & Target",
  "Buy / Sell / Hold",
  "Rationale",
  "Feedback",
];

export async function generateTemplateBuffer(
  clientNames: string[] = [],
  userId?: string,
  dateLabel?: string,
  isAdmin: boolean = false,
  designation: string = ""
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const MODES = isAdmin ? ADMIN_MODES : BASE_MODES;

  // Entries sheet — headers only
  const wsEntries = wb.addWorksheet("Entries");
  wsEntries.addRow(TEMPLATE_HEADERS);
  TEMPLATE_HEADERS.forEach((h, i) => {
    wsEntries.getColumn(i + 1).width = Math.max(h.length, 22);
  });

  // Pre-fill the "Designation" column with the uploader's own designation so they
  // don't have to look it up in the Reference sheet — admins have no personal
  // designation to draw from, so their sheet is left blank for manual entry per row.
  // Keyed off "Client Name" via formula so unused trailing rows stay visually blank
  // instead of showing a designation with no other data.
  if (designation.trim()) {
    const DESIGNATION_COL = "D";
    const CLIENT_NAME_COL = "E";
    const MAX_ENTRY_ROWS = 501; // header + up to 500 data rows, matching the bulk-upload limit
    const escapedDesignation = designation.replace(/"/g, '""');
    for (let r = 2; r <= MAX_ENTRY_ROWS; r++) {
      wsEntries.getCell(`${DESIGNATION_COL}${r}`).value = {
        formula: `IF($${CLIENT_NAME_COL}${r}<>"","${escapedDesignation}","")`,
      };
    }
  }

  // Reference sheet
  const wsRef = wb.addWorksheet("Reference");
  wsRef.addRow(["Valid Designations", "Valid Modes", "Valid Recommendations"]);
  DESIGNATIONS.forEach((d, i) => wsRef.addRow([d, MODES[i] ?? "", RECS[i] ?? ""]));
  wsRef.getColumn(1).width = 50;
  wsRef.getColumn(2).width = 20;
  wsRef.getColumn(3).width = 25;

  // My Clients sheet
  if (clientNames.length > 0) {
    const wsClients = wb.addWorksheet("My Clients");
    wsClients.addRow(["Your Assigned Clients"]);
    clientNames.forEach((n) => wsClients.addRow([n]));
    wsClients.getColumn(1).width = 40;

    // Excel-native dropdown on the "Client Name" column (5th header), sourced from
    // this sheet — gives a searchable/type-ahead pick list without hard-blocking
    // free text (errorStyle "warning" lets the user still type something else).
    const CLIENT_NAME_COL = "E";
    const MAX_ENTRY_ROWS = 501; // header + up to 500 data rows, matching the bulk-upload limit
    const lastClientRow = clientNames.length + 1; // +1 for the "Your Assigned Clients" header row
    for (let r = 2; r <= MAX_ENTRY_ROWS; r++) {
      wsEntries.getCell(`${CLIENT_NAME_COL}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'My Clients'!$A$2:$A$${lastClientRow}`],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Not in your client list",
        error: "This name isn't in your assigned clients. Choose Continue to keep it, or Cancel to pick from the list.",
      };
    }
  }

  // Hidden signature sheet — HMAC(userId:dateLabel) so the server can verify authenticity
  if (userId && dateLabel) {
    const sig = signTemplate(userId, dateLabel);
    const wsSig = wb.addWorksheet("_sig");
    wsSig.state = "veryHidden";
    wsSig.addRow([sig]);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
