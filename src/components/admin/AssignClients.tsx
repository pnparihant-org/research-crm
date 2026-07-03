"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import UserHistoryModal from "@/components/shared/UserHistoryModal";

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
      if (clientPickerRef.current && !clientPickerRef.current.contains(e.target as Node)) setShowClientDropdown(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/master/clients").then((r) => r.json()),
    ]).then(([u, c]) => {
      if (Array.isArray(u)) {
        // Sort: self first, then others alphabetically
        const mapped = u.map((user) => ({ ...user, assignedClients: user.assignedClients ?? [] }));
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
    return user.assignedClients.find((ac) => ac.client?._id === clientId);
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

    setUsers((prev) => prev.map((u) => {
      if (u._id !== user._id) return u;
      const updatedClients = action === "remove"
        ? u.assignedClients.filter((ac) => ac.client?._id !== client._id)
        : [...u.assignedClients, { client, assignedByName: session?.user?.name ?? "", assignedAt: new Date().toISOString() }];
      return { ...u, assignedClients: updatedClients };
    }));

    toast(
      action === "add"
        ? `${client.name} assigned to ${user.name}`
        : `${client.name} removed from ${user.name}`,
      action === "add" ? "success" : "warning"
    );
  }

  const filteredClients = clientQuery.trim().length >= 1
    ? allClients.filter((c) =>
        c.name?.toLowerCase().includes(clientQuery.toLowerCase()) ||
        c.code?.toLowerCase().includes(clientQuery.toLowerCase())
      ).slice(0, 50)
    : [];

  function toggleUser(userId: string) {
    setOpenUser((prev) => (prev === userId ? null : userId));
    setClientQuery("");
    setShowClientDropdown(false);
  }

  function selectClient(user: UserItem, client: ClientItem) {
    toggle(user, client);
    setClientQuery("");
    setShowClientDropdown(false);
  }

  const filteredUsers = users.filter((u) =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500">Loading users…</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl">
      {historyTarget && (
        <UserHistoryModal
          userId={historyTarget._id}
          userName={historyTarget.name}
          userEmail={historyTarget.email}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Assign Clients to Users</h2>
        <p className="text-sm text-gray-500">Each user sees only their assigned clients in the form. Assignments are logged with the admin who made them.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search users by name or email…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
          {users.length === 0 ? "No users found." : "No users match your search."}
        </div>
      ) : (
        filteredUsers.map((user) => (
          <div key={user._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleUser(user._id)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{user.name}</p>
                  {user.email === session?.user?.email && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide">You</span>
                  )}
                  {user.role === "admin" || user.role === "master_admin" ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide">{user.role === "master_admin" ? "Master Admin" : "Admin"}</span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  {user.assignedClients.length} client{user.assignedClients.length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setHistoryTarget(user); }}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-medium hover:underline transition-colors whitespace-nowrap"
                >
                  History
                </button>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${openUser === user._id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {openUser === user._id && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="relative mb-4" ref={clientPickerRef}>
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => { setClientQuery(e.target.value); setShowClientDropdown(true); }}
                    onFocus={() => { if (clientQuery) setShowClientDropdown(true); }}
                    placeholder="Type to search a client to assign…"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />
                  {clientQuery && (
                    <button
                      type="button"
                      onClick={() => { setClientQuery(""); setShowClientDropdown(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {showClientDropdown && filteredClients.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full max-h-[40vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
                      {filteredClients.map((client) => {
                        const assigned = !!getAssignment(user, client._id);
                        const isSaving = saving === user._id + client._id;
                        return (
                          <li
                            key={client._id}
                            onMouseDown={() => !isSaving && selectClient(user, client)}
                            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer border-b border-gray-100 last:border-0 ${assigned ? "bg-indigo-50" : "hover:bg-indigo-50"}`}
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-gray-800">{client.name}</span>
                              {client.code && <span className="text-xs text-gray-400 ml-2">{client.code}</span>}
                            </div>
                            {isSaving ? (
                              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : assigned ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide shrink-0">Assigned · tap to remove</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {showClientDropdown && clientQuery.trim().length >= 1 && filteredClients.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg text-sm px-3.5 py-3 text-gray-400">
                      No clients found for &quot;{clientQuery}&quot;
                    </div>
                  )}
                </div>

                {user.assignedClients.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No clients assigned yet — search above to assign one.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {user.assignedClients.map((assignment) => (
                      <span
                        key={assignment.client._id}
                        className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-800 text-xs font-medium"
                        title={`Assigned by ${assignment.assignedByName} · ${new Date(assignment.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                      >
                        {assignment.client.name}
                        <button
                          type="button"
                          onClick={() => toggle(user, assignment.client)}
                          disabled={saving === user._id + assignment.client._id}
                          className="text-indigo-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
