"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";

export default function TwoFactorSettings({ twoFactorEnabled }: { twoFactorEnabled: boolean }) {
  const { update } = useSession();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(twoFactorEnabled);
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/2fa/setup");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast(data.error ?? "Failed to load 2FA setup", "error"); return; }
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStep("setup");
  }

  async function enableTwoFactor() {
    if (otp.length < 6) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: otp, enable: true }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Invalid code"); toast(data.error ?? "Invalid code", "error"); return; }

    setEnabled(true);
    setStep("idle");
    setOtp("");
    await update({ twoFactorVerified: true });
    toast("Two-factor authentication enabled successfully", "success");
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${enabled ? "bg-green-100" : "bg-gray-100"}`}>
            <svg className={`w-6 h-6 ${enabled ? "text-green-600" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Two-Factor Authentication</h2>
            <p className="text-gray-500 text-sm mt-1">
              Add an extra layer of security to your account using an authenticator app.
            </p>
          </div>
          <span className={`ml-auto shrink-0 text-sm font-medium px-3 py-1 rounded-full ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        {step === "idle" && (
          <div>
            {!enabled ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-medium mb-1">How it works</p>
                  <p>After enabling, you&apos;ll need to enter a code from your authenticator app (like Google Authenticator or Authy) each time you sign in.</p>
                </div>
                <button
                  onClick={startSetup}
                  disabled={loading}
                  className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {loading ? "Loading..." : "Enable 2FA"}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700">
                Your account is protected with two-factor authentication. You will need your authenticator app each time you sign in.
              </div>
            )}
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Step 1: Scan this QR code with your authenticator app
              </p>
              <div className="inline-block p-3 bg-white border-2 border-gray-200 rounded-xl">
                <Image src={qrCode} alt="2FA QR Code" width={180} height={180} />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Or enter this key manually:</p>
              <code className="block bg-gray-100 px-4 py-2.5 rounded-lg text-sm font-mono text-gray-700 break-all">
                {secret}
              </code>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Step 2: Enter the 6-digit code to confirm</p>
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-xl tracking-widest font-mono w-40"
                  placeholder="000000"
                />
                <button
                  onClick={enableTwoFactor}
                  disabled={loading || otp.length < 6}
                  className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {loading ? "Verifying..." : "Confirm & Enable"}
                </button>
                <button
                  onClick={() => { setStep("idle"); setOtp(""); setError(""); }}
                  className="text-gray-500 hover:text-gray-700 font-medium px-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
