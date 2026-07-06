"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";

export default function Setup2FAClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/2fa/setup")
      .then((r) => r.json())
      .then((data) => { setQrCode(data.qrCode); setSecret(data.secret); setFetching(false); })
      .catch(() => { toast("Failed to load 2FA setup", "error"); setFetching(false); });
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: otp, enable: true }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Invalid code, try again"); toast(data.error ?? "Invalid code, try again", "error"); return; }

    toast("2FA setup complete!", "success");
    const role = session?.user?.role;
    router.push(role === "master_admin" ? "/master-admin" : role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-brand-100">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Two-Factor Authentication</h1>
          <p className="text-gray-500 text-sm mt-2">
            Your account requires 2FA. Scan the QR code once and you&apos;re good to go.
          </p>
        </div>

        {fetching ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Generating your 2FA secret...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Step 1 — Install an authenticator app</p>
              <p>Use <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app on your phone.</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Step 2 — Scan this QR code</p>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl inline-block">
                  <Image src={qrCode} alt="2FA QR Code" width={160} height={160} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Or enter this key manually:</p>
                  <code className="block bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono text-gray-700 break-all">
                    {secret}
                  </code>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Step 3 — Enter the 6-digit code to confirm</p>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleVerify} className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-xl tracking-widest font-mono w-40"
                  placeholder="000000"
                />
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  {loading ? "Verifying..." : "Confirm & Continue"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
