"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface AdminUser {
  _id: string; name: string; email: string; phone?: string;
  role: string; twoFactorEnabled: boolean; createdAt: string;
}

interface EmployeeUser {
  _id: string; name: string; email: string; phone?: string; createdAt: string;
}

export default function ManageAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Promote
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [promoteTarget, setPromoteTarget] = useState<EmployeeUser | null>(null);
  const [promoteConfirm, setPromoteConfirm] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Demote
  const [demoteTarget, setDemoteTarget] = useState<AdminUser | null>(null);
  const [demoteConfirm, setDemoteConfirm] = useState(false);
  const [demoting, setDemoting] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/master-admin/admins").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([a, u]) => {
      setAdmins(Array.isArray(a) ? a : []);
      setEmployees(Array.isArray(u) ? u : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/master-admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to create admin"); return; }
    setAdmins((prev) => [data, ...prev]);
    setForm({ name: "", email: "", password: "", phone: "" });
    setShowForm(false);
    toast(`Admin "${data.name}" created successfully`, "success");
  }

  async function handlePromote() {
    if (!promoteTarget) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/master-admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: promoteTarget._id, action: "promote" }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Promotion failed", "error"); return; }
      // Move from employees list to admins list
      setAdmins((prev) => [{ ...data, twoFactorEnabled: false, createdAt: promoteTarget.createdAt }, ...prev]);
      setEmployees((prev) => prev.filter((e) => e._id !== promoteTarget._id));
      toast(`${promoteTarget.name} has been promoted to Admin`, "success");
      setPromoteTarget(null);
      setEmployeeSearch("");
    } finally {
      setPromoting(false);
      setPromoteConfirm(false);
    }
  }

  async function handleDemote() {
    if (!demoteTarget) return;
    setDemoting(true);
    try {
      const res = await fetch("/api/master-admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: demoteTarget._id, action: "demote" }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Demotion failed", "error"); return; }
      // Move from admins list to employees list
      setAdmins((prev) => prev.filter((a) => a._id !== demoteTarget._id));
      setEmployees((prev) => [{ _id: data._id, name: data.name, email: data.email, createdAt: demoteTarget.createdAt }, ...prev]);
      toast(`${demoteTarget.name} has been demoted to Employee`, "warning");
      setDemoteTarget(null);
    } finally {
      setDemoting(false);
      setDemoteConfirm(false);
    }
  }

  const filteredEmployees = employees.filter((e) => {
    const q = employeeSearch.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
  });

  return (
    <>
    {/* Promote confirmation modal */}
    {promoteConfirm && promoteTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Promote to Admin?</h3>
              <p className="text-sm text-gray-500">{promoteTarget.name} · {promoteTarget.email}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            This will give <span className="font-semibold">{promoteTarget.name}</span> full admin access — they will be able to manage master data and view all submissions.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPromoteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handlePromote}
              disabled={promoting}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              {promoting ? "Promoting…" : "Yes, promote"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Demote confirmation modal */}
    {demoteConfirm && demoteTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Demote to Employee?</h3>
              <p className="text-sm text-gray-500">{demoteTarget.name} · {demoteTarget.email}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            <span className="font-semibold">{demoteTarget.name}</span> will lose admin access and revert to a regular employee account.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDemoteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleDemote}
              disabled={demoting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {demoting ? "Demoting…" : "Yes, demote"}
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="space-y-5 max-w-3xl">

      {/* Create new admin */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-gray-900">Admin Accounts</h2>
          <button
            onClick={() => { setShowForm((v) => !v); setError(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Admin
          </button>
        </div>
        <p className="text-sm text-gray-500">Admins can manage master data and view all submissions</p>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-5 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">New Admin Details</h3>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="admin@crm.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="10-digit mobile number" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => { const v = e.target.value; setForm((p) => ({ ...p, password: v })); }} required minLength={8}
                    autoComplete="new-password" name="new-password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? "Creating…" : "Create Admin"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="px-5 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Promote employee */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Promote an Employee</h3>
        <p className="text-sm text-gray-500 mb-4">Search for an existing employee and grant them admin access.</p>

        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={employeeSearch}
            onChange={(e) => { setEmployeeSearch(e.target.value); setPromoteTarget(null); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {employeeSearch && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
            {filteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">No employees found matching &ldquo;{employeeSearch}&rdquo;</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {filteredEmployees.map((e) => (
                  <li key={e._id}>
                    <button
                      onClick={() => { setPromoteTarget(e); setEmployeeSearch(e.name); }}
                      className={`w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors ${promoteTarget?._id === e._id ? "bg-brand-50" : ""}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-400">{e.email}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {promoteTarget && (
          <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-brand-900">{promoteTarget.name}</p>
              <p className="text-xs text-brand-600">{promoteTarget.email}</p>
            </div>
            <button
              onClick={() => setPromoteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Promote to Admin
            </button>
          </div>
        )}
      </div>

      {/* Admin list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Current Admins</h3>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No admin accounts yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">2FA</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 leading-snug">{a.name}</p>
                    <p className="text-xs text-gray-400 sm:hidden mt-0.5">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{a.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{a.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.twoFactorEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.twoFactorEnabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setDemoteTarget(a); setDemoteConfirm(true); }}
                      className="text-xs text-red-400 hover:text-red-600 font-medium hover:underline transition-colors"
                    >
                      Demote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </>
  );
}
