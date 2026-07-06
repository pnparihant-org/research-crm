"use client";
import { useState, useEffect, useCallback } from "react";

interface Report {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error();
      setReports(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function deleteReport(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (res.ok) setReports((prev) => prev.filter((r) => r._id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // Unique users from reports
  const users = Array.from(
    new Map(reports.map((r) => [r.userId, { id: r.userId, name: r.userName, email: r.userEmail }])).values()
  );

  const filteredReports = reports.filter((r) => {
    if (selectedUser && r.userId !== selectedUser) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.filename.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-700 rounded-2xl px-8 py-6 text-white">
        <p className="text-sm font-medium text-brand-200 uppercase tracking-widest mb-1">Admin View</p>
        <h1 className="text-2xl font-bold">User Reports</h1>
        <p className="text-brand-100 text-sm mt-1">Browse and download PDF reports uploaded by your team</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, email or filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <select
            value={selectedUser ?? ""}
            onChange={(e) => setSelectedUser(e.target.value || null)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          {(search || selectedUser) && (
            <button
              onClick={() => { setSearch(""); setSelectedUser(null); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
          </p>
          <button onClick={fetchReports} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>
        ) : filteredReports.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center">No reports found.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReports.map((r) => (
              <div key={r._id} className="flex items-center justify-between px-6 py-4 gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                        {r.userName}
                      </span>
                      <span className="text-xs text-gray-400">{r.userEmail}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{formatBytes(r.size)}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{formatDate(r.uploadedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/reports/${r._id}`}
                    download={r.filename}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => deleteReport(r._id, r.filename)}
                    disabled={deletingId === r._id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === r._id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
