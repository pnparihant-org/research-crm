"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import UserHistoryModal from "@/components/shared/UserHistoryModal";

const DESIGNATIONS = [
  { group: "Research Dept", options: ["Director of Equity Research", "Executive Vice President - Institutional Equity Sales", "Sr Equity Research Analyst", "Equity Research Analyst", "Institutional Equity Sales Manager", "Equity Research Associate", "Sr Manager Sales", "Buy Side Person", "Intern"] },
  { group: "Institutional Dept", options: ["Head Institutional Equities", "Institutional Sales Trader", "Institutional Dealer", "Institution Client Relationship", "Insti Backoffice Executive", "Back Office Operations"] },
];

interface UserRow {
  _id: string;
  name: string;
  email: string;
  _rawEmail?: string;
  phone?: string;
  _rawPhone?: string;
  designation?: string;
  dept?: "research" | "institution" | null;
  createdAt: string;
}

const DEPT_LABEL: Record<string, string> = { research: "Research", institution: "Institution" };
const DEPT_STYLE: Record<string, string> = { research: "bg-blue-50 text-blue-700", institution: "bg-brand-50 text-brand-700" };

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

export default function ManageUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", designation: "", dept: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit form
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", password: "", designation: "", dept: "" });
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset MPIN
  const [resetMpinTarget, setResetMpinTarget] = useState<UserRow | null>(null);
  const [resettingMpin, setResettingMpin] = useState(false);

  // History
  const [historyTarget, setHistoryTarget] = useState<UserRow | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await fetch("/api/master-admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "Failed to create user"); return; }
    setUsers((prev) => [data, ...prev]);
    setForm({ name: "", email: "", password: "", phone: "", designation: "", dept: "" });
    setShowForm(false);
    toast(`User "${data.name}" created successfully`, "success");
  }

  function openEdit(u: UserRow) {
    setEditTarget(u);
    setEditForm({ name: u.name, email: u._rawEmail ?? u.email, phone: u._rawPhone ?? u.phone ?? "", password: "", designation: u.designation ?? "", dept: u.dept ?? "" });
    setEditError("");
    setEditShowPassword(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError("");
    setEditSaving(true);
    const res = await fetch(`/api/master-admin/users?id=${editTarget._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error ?? "Failed to update user"); return; }
    setUsers((prev) => prev.map((u) => u._id === editTarget._id ? { ...u, ...data } : u));
    toast(`User "${data.name}" updated successfully`, "success");
    setEditTarget(null);
  }

  async function handleResetMpin() {
    if (!resetMpinTarget) return;
    setResettingMpin(true);
    const res = await fetch("/api/admin/users/reset-mpin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetMpinTarget._id }),
    });
    setResettingMpin(false);
    if (!res.ok) { toast("Failed to reset MPIN", "error"); setResetMpinTarget(null); return; }
    toast(`MPIN reset for "${resetMpinTarget.name}" — they will set a new one on next login`, "success");
    setResetMpinTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/master-admin/users?id=${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast("Failed to delete user", "error"); setDeleteTarget(null); return; }
    setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
    toast(`User "${deleteTarget.name}" deleted`, "warning");
    setDeleteTarget(null);
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <>
      {/* History modal */}
      {historyTarget && (
        <UserHistoryModal
          userId={historyTarget._id}
          userName={historyTarget.name}
          userEmail={historyTarget._rawEmail ?? historyTarget.email}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Reset MPIN confirmation modal */}
      {resetMpinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reset MPIN?</h3>
                <p className="text-sm text-gray-500">{resetMpinTarget.name} · {resetMpinTarget.email}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will clear <span className="font-semibold">{resetMpinTarget.name}</span>&apos;s MPIN. They will be prompted to set a new one on their next login.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setResetMpinTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleResetMpin}
                disabled={resettingMpin}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {resettingMpin ? "Resetting…" : "Reset MPIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Edit User</h3>
                <p className="text-sm text-gray-500 mt-0.5">{editTarget.email}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm mb-4">{editError}</div>
            )}

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input
                    type="text" required value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email" required value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="tel" value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Leave blank to keep unchanged"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New Password <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <input
                      type={editShowPassword ? "text" : "password"} minLength={8} value={editForm.password}
                      onChange={(e) => { const v = e.target.value; setEditForm((p) => ({ ...p, password: v })); }}
                      autoComplete="new-password" name="new-password"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Leave blank to keep unchanged"
                    />
                    <button type="button" onClick={() => setEditShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      <EyeIcon open={editShowPassword} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                  <select
                    value={editForm.designation}
                    onChange={(e) => setEditForm((p) => ({ ...p, designation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                  >
                    <option value="">Select designation</option>
                    {DESIGNATIONS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.options.map((o) => <option key={o}>{o}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select
                    value={editForm.dept}
                    onChange={(e) => setEditForm((p) => ({ ...p, dept: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                  >
                    <option value="">No restriction</option>
                    <option value="research">Research</option>
                    <option value="institution">Institution</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-1 justify-end">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete User?</h3>
                <p className="text-sm text-gray-500">{deleteTarget.name} · {deleteTarget.email}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This will permanently delete <span className="font-semibold">{deleteTarget.name}</span>&apos;s account and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 w-full">
        {/* Header + add form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-gray-900">Users</h2>
            <button
              onClick={() => { setShowForm((v) => !v); setFormError(""); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </div>
          <p className="text-sm text-gray-500">Users can fill forms and view their submission history.</p>

          {showForm && (
            <form onSubmit={handleCreate} className="mt-5 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">New User Details</h3>
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="user@arihantcapital.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="tel" value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"} required minLength={8} value={form.password}
                      onChange={(e) => { const v = e.target.value; setForm((p) => ({ ...p, password: v })); }}
                      autoComplete="new-password" name="new-password"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Min. 8 characters"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Designation <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={form.designation}
                    onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                  >
                    <option value="">Select designation</option>
                    {DESIGNATIONS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.options.map((o) => <option key={o}>{o}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={form.dept}
                    onChange={(e) => setForm((p) => ({ ...p, dept: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                  >
                    <option value="">No restriction</option>
                    <option value="research">Research</option>
                    <option value="institution">Institution</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? "Creating…" : "Create User"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setFormError(""); }} className="px-5 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* User list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900 flex-1">All Users</h3>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text" placeholder="Search…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              {search ? `No users match "${search}"` : "No users yet. Add one above."}
            </div>
          ) : (
            <>
            {/* Desktop table — md and above */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide w-[15%]">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide w-[22%]">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide w-[10%]">Dept</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide w-[25%] hidden lg:table-cell">Designation</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide w-[13%] hidden xl:table-cell">Phone</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <tr key={u._id} onClick={() => setHistoryTarget(u)} className="hover:bg-gray-50 transition-colors cursor-pointer" title="View submission history">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 leading-snug">{u.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs break-all">{u.email}</td>
                      <td className="px-4 py-3">
                        {u.dept
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DEPT_STYLE[u.dept]}`}>{DEPT_LABEL[u.dept]}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {u.designation
                          ? <span className="inline-block max-w-[220px] truncate text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium" title={u.designation}>{u.designation}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden xl:table-cell">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(u); }} className="text-xs text-brand-500 hover:text-brand-700 font-medium hover:underline transition-colors whitespace-nowrap">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); setResetMpinTarget(u); }} className="text-xs text-amber-500 hover:text-amber-700 font-medium hover:underline transition-colors whitespace-nowrap">Reset MPIN</button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }} className="text-xs text-red-400 hover:text-red-600 font-medium hover:underline transition-colors whitespace-nowrap">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — below md */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((u) => (
                <div key={u._id} onClick={() => setHistoryTarget(u)} className="px-4 py-3 space-y-1 cursor-pointer active:bg-gray-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                    {u.dept && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DEPT_STYLE[u.dept]}`}>{DEPT_LABEL[u.dept]}</span>}
                  </div>
                  <p className="text-xs text-gray-500 break-all">{u.email}</p>
                  {u.designation && (
                    <span className="inline-block text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">{u.designation}</span>
                  )}
                  {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(u); }} className="text-xs text-brand-500 hover:text-brand-700 font-medium hover:underline transition-colors">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); setResetMpinTarget(u); }} className="text-xs text-amber-500 hover:text-amber-700 font-medium hover:underline transition-colors">Reset MPIN</button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }} className="text-xs text-red-400 hover:text-red-600 font-medium hover:underline transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
