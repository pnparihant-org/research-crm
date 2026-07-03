"use client";
import { useEffect, useState } from "react";

interface ClientItem { _id: string; code: string; name: string }

interface AssignedEntry {
  client: ClientItem;
  assignedByName: string;
  assignedAt: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedClients: AssignedEntry[];
}

interface SharedClient {
  client: ClientItem;
  users: { user: UserItem; assignedByName: string; assignedAt: string }[];
}

interface Props {
  accent?: "indigo" | "purple";
}

export default function SharedClients({ accent = "indigo" }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const accentBg = accent === "purple" ? "bg-purple-700" : "bg-indigo-600";
  const accentRing = accent === "purple" ? "focus:ring-purple-500" : "focus:ring-indigo-500";
  const accentBadgeBg = accent === "purple" ? "bg-purple-50 text-purple-700" : "bg-indigo-50 text-indigo-700";
  const accentUserBg = accent === "purple" ? "bg-purple-50 border-purple-200 text-purple-800" : "bg-indigo-50 border-indigo-200 text-indigo-800";

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data.map((u: UserItem) => ({ ...u, assignedClients: u.assignedClients ?? [] })) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sharedClients: SharedClient[] = (() => {
    const map = new Map<string, SharedClient>();
    for (const user of users) {
      for (const ac of user.assignedClients) {
        if (!ac.client?._id) continue;
        const key = ac.client._id;
        if (!map.has(key)) map.set(key, { client: ac.client, users: [] });
        map.get(key)!.users.push({ user, assignedByName: ac.assignedByName, assignedAt: ac.assignedAt });
      }
    }
    return Array.from(map.values())
      .filter((sc) => sc.users.length > 1)
      .sort((a, b) => b.users.length - a.users.length || a.client.name.localeCompare(b.client.name));
  })();

  const filtered = search.trim()
    ? sharedClients.filter(
        (sc) =>
          sc.client.name.toLowerCase().includes(search.toLowerCase()) ||
          sc.client.code?.toLowerCase().includes(search.toLowerCase()) ||
          sc.users.some((u) => u.user.name.toLowerCase().includes(search.toLowerCase()))
      )
    : sharedClients;

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className={`w-8 h-8 border-2 ${accentBg.replace("bg-", "border-")} border-t-transparent rounded-full animate-spin mx-auto mb-3`} />
      <p className="text-gray-500">Loading shared clients…</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Shared Clients</h2>
        <p className="text-sm text-gray-500">
          Clients assigned to more than one user.{" "}
          <span className="font-medium text-gray-700">{sharedClients.length} shared</span> out of{" "}
          <span className="font-medium text-gray-700">
            {(() => {
              const ids = new Set<string>();
              users.forEach((u) => u.assignedClients.forEach((ac) => ac.client?._id && ids.add(ac.client._id)));
              return ids.size;
            })()} total assigned clients
          </span>.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by client name, code, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${accentRing}`}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 font-medium text-sm">
            {sharedClients.length === 0
              ? "No shared clients — each client is assigned to at most one user."
              : `No results for "${search}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sc) => (
            <div key={sc.client._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded((p) => (p === sc.client._id ? null : sc.client._id))}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{sc.client.name}</span>
                      {sc.client.code && <span className="text-xs text-gray-400">{sc.client.code}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${accentBadgeBg}`}>
                    {sc.users.length} users
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expanded === sc.client._id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expanded === sc.client._id && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Assigned to</p>
                  <div className="flex flex-wrap gap-2">
                    {sc.users.map(({ user, assignedByName, assignedAt }) => (
                      <div
                        key={user._id}
                        className={`flex flex-col px-3 py-2 rounded-xl border text-xs ${accentUserBg}`}
                        title={`Assigned by ${assignedByName} on ${new Date(assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      >
                        <span className="font-semibold">{user.name}</span>
                        <span className="opacity-70 mt-0.5">{user.email}</span>
                        <span className="opacity-50 mt-0.5">
                          via {assignedByName} · {new Date(assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
