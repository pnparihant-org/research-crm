"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

interface LogEntry {
  _id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  details?: string;
  ip: string;
  userAgent?: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN:            { label: "Login",            color: "bg-green-100 text-green-700" },
  FORM_SUBMIT:      { label: "Form Submit",      color: "bg-blue-100 text-blue-700" },
  CHANGE_PASSWORD:  { label: "Change Password",  color: "bg-yellow-100 text-yellow-700" },
  CREATE_USER:      { label: "Create User",      color: "bg-brand-100 text-brand-700" },
  DELETE_USER:      { label: "Delete User",      color: "bg-red-100 text-red-700" },
  ASSIGN_CLIENT:    { label: "Assign Client",    color: "bg-brand-100 text-brand-700" },
  REMOVE_CLIENT:    { label: "Remove Client",    color: "bg-orange-100 text-orange-700" },
  CREATE_ADMIN:     { label: "Create Admin",     color: "bg-brand-100 text-brand-700" },
  PROMOTE_TO_ADMIN:          { label: "Promote to Admin",     color: "bg-brand-100 text-brand-700" },
  DEMOTE_TO_USER:            { label: "Demote to User",       color: "bg-gray-100 text-gray-600" },
  BULK_UPLOAD_DATE_MISMATCH: { label: "Upload Date Mismatch", color: "bg-red-100 text-red-700" },
  BULK_UPLOAD_TAMPERED:      { label: "Upload Tampered",      color: "bg-red-200 text-red-800" },
  EOD_ESCALATION:            { label: "EOD Escalation",       color: "bg-orange-100 text-orange-700" },
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

function getReadableDetails(log: LogEntry): string {
  const name = log.userName ?? log.userEmail ?? "Unknown user";
  const d = log.details ?? "";
  switch (log.action) {
    case "LOGIN":           return `${name} logged in via OTP`;
    case "CHANGE_PASSWORD": return d || `${name} changed their password`;
    case "FORM_SUBMIT":     return d ? `Submitted form — ${d}` : `${name} submitted a form`;
    case "CREATE_USER":     return d ? `New user created — ${d.replace(/^Created user:\s*/i, "")}` : "New user created";
    case "DELETE_USER":     return d ? `User deleted — ${d.replace(/^Deleted user:\s*/i, "")}` : "User deleted";
    case "CREATE_ADMIN":    return d ? `New admin created — ${d.replace(/^Created admin:\s*/i, "")}` : "New admin created";
    case "ASSIGN_CLIENT":   return d || `${name} assigned a client`;
    case "REMOVE_CLIENT":   return d || `${name} removed a client`;
    case "PROMOTE_TO_ADMIN": return d || `${name} promoted a user to Admin`;
    case "DEMOTE_TO_USER":            return d || `${name} demoted an admin to User`;
    case "BULK_UPLOAD_DATE_MISMATCH": return d || `${name} attempted to upload a template with a wrong date`;
    case "BULK_UPLOAD_TAMPERED":      return d || `${name} attempted to upload a tampered or reused sheet`;
    default:                          return d || log.action;
  }
}

export default function ActionLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [clearing, setClearing] = useState(false);
  const limit = 50;

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (search) params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    const res = await fetch(`/api/master-admin/logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setPage(p);
    setLoading(false);
  }, [search, actionFilter]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  async function clearLogs() {
    if (!confirm("Clear ALL action logs permanently? This cannot be undone.")) return;
    setClearing(true);
    const res = await fetch("/api/master-admin/logs", { method: "DELETE" });
    setClearing(false);
    if (!res.ok) { toast("Failed to clear logs", "error"); return; }
    setLogs([]); setTotal(0); setPage(1);
    toast("All logs cleared", "warning");
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Action Logs</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search user, email, IP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-52"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
              ))}
            </select>
            <button
              onClick={() => fetchLogs(1)}
              className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Search
            </button>
            <button
              onClick={clearLogs}
              disabled={clearing}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear All"}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">{total.toLocaleString()} total entries</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Time</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">IP Address</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                        <div>{new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                        <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{log.userName ?? "—"}</div>
                        <div className="text-xs text-gray-400">{log.userEmail ?? ""}</div>
                        {log.userRole && (
                          <div className="text-xs text-gray-400 capitalize">{log.userRole.replace("_", " ")}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-gray-600 text-xs whitespace-nowrap">{log.ip}</td>
                      <td className="px-5 py-3 text-gray-500 max-w-xs" title={log.details ?? ""}>{getReadableDetails(log)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
