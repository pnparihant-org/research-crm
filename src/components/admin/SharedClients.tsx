"use client";
import { useEffect, useMemo, useState } from "react";

interface ClientItem { _id: string; code: string; name: string }
interface AssignedEntry { client: ClientItem; assignedByName: string; assignedAt: string }
interface UserItem { _id: string; name: string; email: string; role: string; assignedClients: AssignedEntry[] }
interface SharedClient { client: ClientItem; users: { user: UserItem; assignedByName: string; assignedAt: string }[] }
interface Props { accent?: "indigo" | "purple" }

const PALETTE = [
  { bg: "#EEF2FF", fg: "#4338CA" }, { bg: "#F0FDF4", fg: "#15803D" },
  { bg: "#FFF7ED", fg: "#C2410C" }, { bg: "#FDF4FF", fg: "#9333EA" },
  { bg: "#F0F9FF", fg: "#0369A1" }, { bg: "#FFF1F2", fg: "#BE123C" },
  { bg: "#FEFCE8", fg: "#A16207" }, { bg: "#F0FDFA", fg: "#0F766E" },
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xff;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";
}

function badgeClass(n: number) {
  if (n >= 5) return "bg-rose-50 text-rose-700 border-rose-200";
  if (n >= 3) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-sky-50 text-sky-700 border-sky-200";
}

function leftBorder(n: number, accent: "indigo" | "purple") {
  if (n >= 5) return "#F43F5E";
  if (n >= 3) return "#F59E0B";
  return accent === "purple" ? "#9333EA" : "#6366F1";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SharedClients({ accent = "indigo" }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const ring = accent === "purple" ? "focus:ring-purple-500" : "focus:ring-indigo-500";
  const accentHex = accent === "purple" ? "#7C3AED" : "#4F46E5";

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data.map((u: UserItem) => ({ ...u, assignedClients: u.assignedClients ?? [] })) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sharedClients = useMemo<SharedClient[]>(() => {
    const map = new Map<string, SharedClient>();
    for (const user of users) {
      for (const ac of user.assignedClients) {
        if (!ac.client?._id) continue;
        if (!map.has(ac.client._id)) map.set(ac.client._id, { client: ac.client, users: [] });
        map.get(ac.client._id)!.users.push({ user, assignedByName: ac.assignedByName, assignedAt: ac.assignedAt });
      }
    }
    return Array.from(map.values())
      .filter(sc => sc.users.length > 1)
      .sort((a, b) => b.users.length - a.users.length || a.client.name.localeCompare(b.client.name));
  }, [users]);

  const totalClientIds = useMemo(() => {
    const ids = new Set<string>();
    users.forEach(u => u.assignedClients.forEach(ac => ac.client?._id && ids.add(ac.client._id)));
    return ids.size;
  }, [users]);

  const uniqueUsersInShared = useMemo(() => {
    const ids = new Set<string>();
    sharedClients.forEach(sc => sc.users.forEach(({ user }) => ids.add(user._id)));
    return ids.size;
  }, [sharedClients]);

  const filtered = search.trim()
    ? sharedClients.filter(sc =>
        sc.client.name.toLowerCase().includes(search.toLowerCase()) ||
        sc.client.code?.toLowerCase().includes(search.toLowerCase()) ||
        sc.users.some(u => u.user.name.toLowerCase().includes(search.toLowerCase()))
      )
    : sharedClients;

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-3"
        style={{ borderColor: accentHex, borderTopColor: "transparent" }}
      />
      <p className="text-sm text-gray-400">Loading shared clients…</p>
    </div>
  );

  const topClient = sharedClients[0];

  return (
    <div className="space-y-3 max-w-4xl">

      {/* Header + stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">Shared Clients</h2>
        <p className="text-sm text-gray-500 mb-4">Clients currently assigned to more than one user</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{sharedClients.length}</p>
            <p className="text-xs text-gray-400 mt-1.5">shared clients</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{uniqueUsersInShared}</p>
            <p className="text-xs text-gray-400 mt-1.5">users involved</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            {topClient ? (
              <>
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">{topClient.client.name}</p>
                <p className="text-xs text-gray-400 mt-1.5">most shared &middot; {topClient.users.length} users</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-300 leading-tight">—</p>
                <p className="text-xs text-gray-400 mt-1.5">most shared</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by client name, code, or user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 ${search ? "pr-8" : "pr-3"} py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 ${ring} transition-colors`}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0 tabular-nums">{filtered.length} / {sharedClients.length}</span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-600">
            {sharedClients.length === 0 ? "No shared clients" : `No results for "${search}"`}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {sharedClients.length === 0
              ? "Every client is currently assigned to at most one user."
              : "Try a different name, code, or username."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sc => {
            const isOpen = expanded.has(sc.client._id);
            const MAX_AVATARS = 4;

            return (
              <div
                key={sc.client._id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                style={{ borderLeft: `3px solid ${leftBorder(sc.users.length, accent)}` }}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-3 pl-4 pr-5 py-3.5 cursor-pointer hover:bg-gray-50/80 transition-colors select-none"
                  onClick={() => toggle(sc.client._id)}
                >
                  {/* Name + code */}
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm leading-tight">{sc.client.name}</span>
                    {sc.client.code && (
                      <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{sc.client.code}</span>
                    )}
                  </div>

                  {/* Avatar stack */}
                  <div className="flex -space-x-2 shrink-0">
                    {sc.users.slice(0, MAX_AVATARS).map(({ user }) => {
                      const col = avatarColor(user.name);
                      return (
                        <div
                          key={user._id}
                          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: col.bg, color: col.fg }}
                          title={user.name}
                        >
                          {initials(user.name)}
                        </div>
                      );
                    })}
                    {sc.users.length > MAX_AVATARS && (
                      <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        +{sc.users.length - MAX_AVATARS}
                      </div>
                    )}
                  </div>

                  {/* Count badge */}
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border tabular-nums shrink-0 ${badgeClass(sc.users.length)}`}>
                    {sc.users.length} users
                  </span>

                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-gray-300 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      Assigned to {sc.users.length} users
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sc.users.map(({ user, assignedByName, assignedAt }) => {
                        const col = avatarColor(user.name);
                        return (
                          <div key={user._id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 px-3.5 py-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                              style={{ backgroundColor: col.bg, color: col.fg }}
                            >
                              {initials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                              <p className="text-[10px] text-gray-400 mt-1.5">
                                via {assignedByName} &middot; {fmtDate(assignedAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
