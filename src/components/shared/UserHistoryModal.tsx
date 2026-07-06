"use client";
import { useEffect, useState } from "react";

interface Submission {
  _id: string;
  date: string;
  salesPerson: string;
  clientName: string;
  designation: string;
  modeOfCommunication: string;
  formType?: "research" | "institution";
  company: string;
  sector: string;
  cmpTarget: string;
  recommendation: "Buy" | "Sell" | "Hold" | "";
  analystName: string;
  buySideAnalystDesignation: string;
  rationale: string;
  feedback: string;
  others: string;
  submittedAt: string;
}

interface Props {
  userId: string;
  userName: string;
  userEmail?: string;
  onClose: () => void;
  accent?: "indigo" | "purple";
}

const REC_STYLES: Record<string, string> = {
  Buy: "bg-brand-100 text-brand-800",
  Sell: "bg-red-100 text-red-700",
  Hold: "bg-amber-100 text-amber-800",
};

const TYPE_STYLES: Record<string, string> = {
  institution: "bg-slate-200 text-slate-700",
  research: "bg-slate-100 text-slate-600",
};

export default function UserHistoryModal({ userId, userName, userEmail, onClose, accent = "indigo" }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRec, setFilterRec] = useState("");

  const ring = "focus:ring-brand-500";
  const spin = "border-brand-600";

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/submissions?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load history"); setLoading(false); });
  }, [userId]);

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (s.company ?? "").toLowerCase().includes(q) ||
      (s.clientName ?? "").toLowerCase().includes(q) ||
      (s.salesPerson ?? "").toLowerCase().includes(q) ||
      (s.sector ?? "").toLowerCase().includes(q) ||
      (s.analystName ?? "").toLowerCase().includes(q);
    const matchRec = !filterRec || s.recommendation === filterRec;
    return matchSearch && matchRec;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{userName}&apos;s History</h3>
              {userEmail && <p className="text-sm text-gray-500 mt-0.5">{userEmail}</p>}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!loading && !error && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" placeholder="Search by company, client, executive…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring}`}
                />
              </div>
              <select
                value={filterRec} onChange={(e) => setFilterRec(e.target.value)}
                className={`px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${ring} bg-white`}
              >
                <option value="">All Recommendations</option>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
                <option value="Hold">Hold</option>
              </select>
              <div className="text-sm text-gray-500 flex items-center whitespace-nowrap px-1">{filtered.length} of {submissions.length}</div>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="py-12 px-6 text-center">
            <div className={`w-8 h-8 border-2 ${spin} border-t-transparent rounded-full animate-spin mx-auto mb-3`} />
            <p className="text-gray-500 text-sm">Loading history…</p>
          </div>
        ) : error ? (
          <div className="py-8 px-6 text-center text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 font-medium text-sm">{submissions.length === 0 ? "No submissions yet" : "No matching submissions"}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <div key={s._id}>
                    <div className="px-6 py-3.5 cursor-pointer hover:bg-brand-50/40 transition-colors" onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {s.formType === "institution" ? (
                              <>
                                <span className="font-semibold text-gray-900 text-sm">{s.clientName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_STYLES.institution}`}>Institution</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-gray-900 text-sm">{s.company}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_STYLES.research}`}>Research</span>
                                {s.recommendation && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REC_STYLES[s.recommendation]}`}>{s.recommendation}</span>}
                                {s.sector && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.sector}</span>}
                              </>
                            )}
                          </div>
                          {s.formType === "institution"
                            ? <p className="text-xs text-gray-500">{s.salesPerson}</p>
                            : <p className="text-xs text-gray-500">{s.clientName} &nbsp;·&nbsp; {s.salesPerson}</p>}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(s.submittedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            &nbsp;·&nbsp; Meeting: {s.date}
                          </p>
                        </div>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 mt-1 ${expanded === s._id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {expanded === s._id && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <Detail label="Designation" value={s.designation} />
                          {s.formType !== "institution" && <Detail label="CMP & Target" value={s.cmpTarget} />}
                          <Detail label="Buy Side Person" value={s.analystName} />
                          {s.buySideAnalystDesignation && <Detail label="BS Analyst Designation" value={s.buySideAnalystDesignation} />}
                          {s.rationale && <Detail label="Rationale" value={s.rationale} full />}
                          {s.feedback && <Detail label="Feedback" value={s.feedback} full />}
                          {s.others && <Detail label="Others" value={s.others} full />}
                        </dl>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-gray-800 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}
