"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import UserHistoryModal from "@/components/shared/UserHistoryModal";

interface ClientItem { _id: string; code: string; name: string }
interface AssignedEntry { client: ClientItem; assignedByName: string; assignedAt: string }
interface UserItem { _id: string; name: string; email: string; role: string; assignedClients: AssignedEntry[] }

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AssignClients() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [allClients, setAllClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [historyTarget, setHistoryTarget] = useState<UserItem | null>(null);
  const clientPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (clientPickerRef.current && !clientPickerRef.current.contains(e.target as Node))
        setShowClientDropdown(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then(r => r.json()),
      fetch("/api/master/clients").then(r => r.json()),
    ]).then(([u, c]) => {
      if (Array.isArray(u)) {
        const mapped = u.map(user => ({ ...user, assignedClients: user.assignedClients ?? [] }));
        mapped.sort((a, b) => {
          if (a.email === session?.user?.email) return -1;
          if (b.email === session?.user?.email) return 1;
          return a.name.localeCompare(b.name);
        });
        setUsers(mapped);
      } else {
        setUsers([]);
      }
      setAllClients(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  function getAssignment(user: UserItem, clientId: string): AssignedEntry | undefined {
    return user.assignedClients.find(ac => ac.client?._id === clientId);
  }

  async function toggle(user: UserItem, client: ClientItem) {
    const existing = getAssignment(user, client._id);
    const action = existing ? "remove" : "add";
    setSaving(user._id + client._id);
    const res = await fetch(`/api/admin/users?id=${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, clientId: client._id }),
    });
    setSaving(null);
    if (!res.ok) { toast("Failed to update assignment", "error"); return; }
    setUsers(prev => prev.map(u => {
      if (u._id !== user._id) return u;
      const updatedClients = action === "remove"
        ? u.assignedClients.filter(ac => ac.client?._id !== client._id)
        : [...u.assignedClients, { client, assignedByName: session?.user?.name ?? "", assignedAt: new Date().toISOString() }];
      return { ...u, assignedClients: updatedClients };
    }));
    toast(
      action === "add" ? `${client.name} assigned to ${user.name}` : `${client.name} removed from ${user.name}`,
      action === "add" ? "success" : "warning"
    );
  }

  const filteredClients = clientQuery.trim().length >= 1
    ? allClients.filter(c =>
        c.name?.toLowerCase().includes(clientQuery.toLowerCase()) ||
        c.code?.toLowerCase().includes(clientQuery.toLowerCase())
      ).slice(0, 50)
    : [];

  function toggleUser(userId: string) {
    setOpenUser(prev => prev === userId ? null : userId);
    setClientQuery("");
    setShowClientDropdown(false);
  }

  function selectClient(user: UserItem, client: ClientItem) {
    toggle(user, client);
    setClientQuery("");
    setShowClientDropdown(false);
  }

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-400">Loading users…</p>
    </div>
  );

  return (
    <div className="space-y-3 max-w-4xl">
      {historyTarget && (
        <UserHistoryModal
          userId={historyTarget._id}
          userName={historyTarget.name}
          userEmail={historyTarget.email}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Assign Clients</h2>
          <p className="text-sm text-gray-500 mt-0.5">Each user sees only their assigned clients when filling a form.</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{users.length}</p>
          <p className="text-xs text-gray-400 mt-1">users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Find a user by name or email…"
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        />
        {userSearch && (
          <button
            onClick={() => setUserSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* List */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-14 text-center">
          <p className="text-sm text-gray-400">
            {users.length === 0 ? "No users found." : `No users match "${userSearch}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => {
            const isOpen = openUser === user._id;
            const col = avatarColor(user.name);
            const isSelf = user.email === session?.user?.email;

            return (
              <div key={user._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

                {/* User row */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50/70 transition-colors select-none"
                  onClick={() => toggleUser(user._id)}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: col.bg, color: col.fg }}
                  >
                    {initials(user.name)}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap leading-none mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">{user.name}</span>
                      {isSelf && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wider">You</span>
                      )}
                      {(user.role === "admin" || user.role === "master_admin") && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wider">
                          {user.role === "master_admin" ? "Master" : "Admin"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>

                  {/* Client name preview — collapsed summary */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {user.assignedClients.length === 0 ? (
                      <span className="text-xs text-gray-300 italic">None</span>
                    ) : (
                      <>
                        {user.assignedClients.slice(0, 2).map(ac => (
                          <span
                            key={ac.client._id}
                            className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium max-w-[90px] truncate"
                            title={ac.client.name}
                          >
                            {ac.client.name}
                          </span>
                        ))}
                        {user.assignedClients.length > 2 && (
                          <span className="text-xs text-gray-400 tabular-nums">+{user.assignedClients.length - 2}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Count badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold tabular-nums shrink-0 ${
                    user.assignedClients.length === 0
                      ? "bg-gray-100 text-gray-400"
                      : "bg-indigo-50 text-indigo-700"
                  }`}>
                    {user.assignedClients.length}
                  </span>

                  {/* History */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setHistoryTarget(user); }}
                    className="text-xs text-gray-400 hover:text-indigo-600 font-medium transition-colors whitespace-nowrap shrink-0"
                    title="View submission history"
                  >
                    History
                  </button>

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
                  <div className="border-t border-gray-100" style={{ backgroundColor: "#F8F9FB" }}>

                    {/* Add client search */}
                    <div className="px-4 pt-4 pb-3" ref={clientPickerRef}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Add a client</p>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={clientQuery}
                          onChange={e => { setClientQuery(e.target.value); setShowClientDropdown(true); }}
                          onFocus={() => { if (clientQuery) setShowClientDropdown(true); }}
                          placeholder="Search by client name or code…"
                          className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                          autoComplete="off"
                        />
                        {clientQuery && (
                          <button
                            type="button"
                            onClick={() => { setClientQuery(""); setShowClientDropdown(false); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}

                        {/* Dropdown */}
                        {showClientDropdown && clientQuery.trim().length >= 1 && (
                          <div className="absolute z-20 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                            {filteredClients.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-400">
                                No clients found for &ldquo;{clientQuery}&rdquo;
                              </div>
                            ) : (
                              <ul>
                                {filteredClients.map(client => {
                                  const assigned = !!getAssignment(user, client._id);
                                  const isSaving = saving === user._id + client._id;
                                  return (
                                    <li
                                      key={client._id}
                                      onMouseDown={() => !isSaving && selectClient(user, client)}
                                      className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                                        assigned ? "bg-indigo-50/60" : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-sm font-medium truncate ${assigned ? "text-indigo-900" : "text-gray-800"}`}>
                                          {client.name}
                                        </span>
                                        {client.code && (
                                          <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                                            {client.code}
                                          </span>
                                        )}
                                      </div>
                                      <div className="shrink-0">
                                        {isSaving ? (
                                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                        ) : assigned ? (
                                          <div className="flex items-center gap-1 text-indigo-500">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-[10px] font-semibold">Remove</span>
                                          </div>
                                        ) : (
                                          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                          </svg>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 border-t border-gray-200" />

                    {/* Assigned clients */}
                    <div className="px-4 pt-3 pb-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                        Assigned &middot; {user.assignedClients.length}
                      </p>

                      {user.assignedClients.length === 0 ? (
                        <div className="py-5 flex flex-col items-center text-center">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-400">No clients assigned — search above to add one.</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {user.assignedClients.map(ac => {
                            const isSaving = saving === user._id + ac.client._id;
                            return (
                              <span
                                key={ac.client._id}
                                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border border-indigo-100 bg-white text-indigo-800 text-xs font-medium"
                                title={`Assigned by ${ac.assignedByName} · ${fmtDate(ac.assignedAt)}`}
                              >
                                <span>{ac.client.name}</span>
                                {ac.client.code && (
                                  <span className="font-mono text-[9px] text-indigo-300">{ac.client.code}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggle(user, ac.client)}
                                  disabled={isSaving}
                                  className="ml-0.5 w-4 h-4 rounded flex items-center justify-center text-indigo-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  {isSaving ? (
                                    <div className="w-2.5 h-2.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
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
