"use client";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  inputCls: string;
}

function PasswordField({ label, value, onChange, visible, onToggle, autoComplete, inputCls }: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => { const v = e.target.value; onChange(v); }}
          required
          autoComplete={autoComplete}
          className={inputCls}
          placeholder="••••••••"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}

export default function ChangePassword({ accentColor = "teal" }: { accentColor?: "teal" | "indigo" | "purple" }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const ring = { teal: "focus:ring-brand-500", indigo: "focus:ring-brand-500", purple: "focus:ring-brand-500" }[accentColor];
  const btn  = { teal: "bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400", indigo: "bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400", purple: "bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400" }[accentColor];
  const inputCls = `w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring} focus:border-transparent`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { toast("New passwords do not match", "error"); return; }
    if (form.newPassword.length < 8) { toast("New password must be at least 8 characters", "warning"); return; }
    setLoading(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { toast(data.error ?? "Failed to change password", "error"); return; }

    toast("Password changed successfully", "success");
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-md">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        <p className="text-sm text-gray-500 mt-0.5">Update your account password</p>
      </div>

      <div className="px-6 py-5">
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input type="text" name="username" autoComplete="username" aria-hidden="true" className="hidden" tabIndex={-1} readOnly />
          <input type="password" name="prevent-autofill" autoComplete="new-password" aria-hidden="true" className="hidden" tabIndex={-1} readOnly />
          <PasswordField
            label="Current Password" value={form.currentPassword}
            onChange={(v) => setForm((p) => ({ ...p, currentPassword: v }))}
            visible={show.current} onToggle={() => setShow((p) => ({ ...p, current: !p.current }))}
            autoComplete="current-password" inputCls={inputCls}
          />
          <PasswordField
            label="New Password" value={form.newPassword}
            onChange={(v) => setForm((p) => ({ ...p, newPassword: v }))}
            visible={show.new} onToggle={() => setShow((p) => ({ ...p, new: !p.new }))}
            autoComplete="new-password" inputCls={inputCls}
          />
          <PasswordField
            label="Confirm New Password" value={form.confirmPassword}
            onChange={(v) => setForm((p) => ({ ...p, confirmPassword: v }))}
            visible={show.confirm} onToggle={() => setShow((p) => ({ ...p, confirm: !p.confirm }))}
            autoComplete="new-password" inputCls={inputCls}
          />
          <div className="pt-1">
            <button type="submit" disabled={loading}
              className={`${btn} text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors`}>
              {loading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
