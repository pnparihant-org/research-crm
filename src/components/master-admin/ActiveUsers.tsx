"use client";
import { useEffect, useState, useCallback } from "react";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "master_admin";
  dept?: "research" | "institution" | null;
  lastActiveAt?: string | null;
  createdAt: string;
}

interface ActiveUsersData {
  totalUsers: number;
  everLoggedIn: number;
  onlineNow: number;
  activeToday: number;
  activeThisWeek: number;
  users: UserRow[];
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const REFRESH_INTERVAL_MS = 30 * 1000;

function formatLastActive(iso?: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60 * 1000) return "Just now";
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))}m ago`;
  if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isOnline(iso?: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < ONLINE_THRESHOLD_MS;
}

export default function ActiveUsers() {
  const [data, setData] = useState<ActiveUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/master-admin/active-users");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const users = data?.users ?? [];
  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">Active Users</h2>
        <p className="text-sm text-gray-500 mb-4">Live snapshot of user activity across the system</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{data?.totalUsers ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1.5">total users</p>
          </div>
          <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
            <p className="text-2xl font-bold text-brand-700 tabular-nums leading-none">{data?.everLoggedIn ?? "—"}</p>
            <p className="text-xs text-brand-600/70 mt-1.5">
              have logged in{data && data.totalUsers > 0 ? ` (${Math.round((data.everLoggedIn / data.totalUsers) * 100)}%)` : ""}
            </p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
            <p className="text-2xl font-bold text-green-700 tabular-nums leading-none flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {data?.onlineNow ?? "—"}
            </p>
            <p className="text-xs text-green-600/70 mt-1.5">online now</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{data?.activeToday ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1.5">active today</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{data?.activeThisWeek ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-1.5">active this week</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-400">{filtered.length.toLocaleString()} user{filtered.length === 1 ? "" : "s"}</p>
          <input
            type="text"
            placeholder="Search name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-52"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => {
                  const online = isOnline(u.lastActiveAt);
                  return (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{u.role.replace("_", " ")}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1.5 ${
                            online ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
                          {online ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatLastActive(u.lastActiveAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
