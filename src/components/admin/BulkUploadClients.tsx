"use client";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface ClientDoc { _id: string; name: string; category: string }
interface ParsedRow { category: string; name: string; segment: string }

export default function BulkUploadClients({
  existingClients,
  onClose,
  onDone,
}: {
  existingClients: ClientDoc[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [checkedCats, setCheckedCats] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const existingSigs = useMemo(
    () => new Set(existingClients.map((c) => `${(c.category ?? "").toLowerCase()}|${(c.name ?? "").toLowerCase()}`)),
    [existingClients]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ParsedRow[]>();
    for (const r of rows) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return map;
  }, [rows]);

  const categories = useMemo(() => Array.from(grouped.keys()), [grouped]);

  function countsFor(cat: string) {
    const list = grouped.get(cat) ?? [];
    const dup = list.filter((r) => existingSigs.has(`${cat.toLowerCase()}|${r.name.toLowerCase()}`)).length;
    return { total: list.length, dup, fresh: list.length - dup };
  }

  const totals = categories.reduce(
    (acc, cat) => {
      const { fresh, total } = countsFor(cat);
      if (checkedCats[cat]) {
        acc.selected += fresh;
        acc.selectedTotal += total;
      }
      return acc;
    },
    { selected: 0, selectedTotal: 0 }
  );

  const parseFile = useCallback(async (file: File) => {
    setParseError(null);
    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/master/clients/parse-bulk", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Failed to parse file");
        setRows([]);
        return;
      }
      const parsedRows: ParsedRow[] = data.rows ?? [];
      setRows(parsedRows);
      const cats: string[] = data.categories ?? [];
      const initial: Record<string, boolean> = {};
      cats.forEach((c) => { initial[c] = !/fpi/i.test(c); });
      setCheckedCats(initial);
    } catch {
      setParseError("Failed to parse file. Please try again.");
      setRows([]);
    } finally {
      setParsing(false);
    }
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  }

  async function handleSubmit() {
    const payload = categories
      .filter((cat) => checkedCats[cat])
      .flatMap((cat) => (grouped.get(cat) ?? []).map((r) => ({ name: r.name, category: r.category })));
    if (payload.length === 0) { toast("Nothing selected to upload", "warning"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/master/clients/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Bulk upload failed", "error"); return; }
      const msg = `${data.created} client${data.created === 1 ? "" : "s"} added` +
        (data.skipped > 0 ? `, ${data.skipped} duplicate${data.skipped === 1 ? "" : "s"} skipped` : "") +
        (data.categoriesCreated?.length ? `, ${data.categoriesCreated.length} new categor${data.categoriesCreated.length === 1 ? "y" : "ies"} created` : "");
      toast(msg, "success");
      onDone();
      onClose();
    } catch {
      toast("Bulk upload failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Bulk Upload Clients</h3>
            <p className="text-xs text-gray-500 mt-0.5">Upload an institutional client list (.xlsx) grouped by category</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          {rows.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("bulk-clients-file")?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400 hover:bg-gray-50"}`}
            >
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-700">{parsing ? "Parsing…" : "Click to upload or drag & drop"}</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx or .xls files only</p>
              <input id="bulk-clients-file" type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {rows.length} clients found in {categories.length} categories
                </p>
                <button onClick={() => { setRows([]); setParseError(null); }} className="text-xs text-gray-400 hover:text-red-500">
                  Clear &amp; re-upload
                </button>
              </div>

              <div className="space-y-2">
                {categories.map((cat) => {
                  const { total, dup, fresh } = countsFor(cat);
                  return (
                    <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
                      <label className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 cursor-pointer">
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!checkedCats[cat]}
                            onChange={(e) => setCheckedCats((prev) => ({ ...prev, [cat]: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm font-medium text-gray-800">{cat}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {total} total{dup > 0 ? ` · ${fresh} new · ${dup} already exist` : ""}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{totals.selected}</span> new client{totals.selected === 1 ? "" : "s"} will be added
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || totals.selected === 0}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting ? "Uploading…" : `Upload ${totals.selected} Client${totals.selected === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
