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
  isShared?: boolean;
  sharedByName?: string;
}

const REC_STYLES = {
  Buy: "bg-green-100 text-green-700",
  Sell: "bg-red-100 text-red-700",
  Hold: "bg-yellow-100 text-yellow-700",
};

const MODE_ICON: Record<string, React.ReactNode> = {
  Phone: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  "Online Meet": (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677v6.646a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Physical: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Message: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

export default function History() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRec, setFilterRec] = useState("");

  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // History only shows the user's own submissions — shared records live under the Submissions tab
        setSubmissions(list.filter((s: Submission) => !s.isShared));
        setLoading(false);
      })
      .catch(() => { setError("Failed to load submissions"); setLoading(false); });
  }, []);

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (s.company ?? "").toLowerCase().includes(q) ||
      (s.clientName ?? "").toLowerCase().includes(q) ||
      (s.salesPerson ?? "").toLowerCase().includes(q) ||
      (s.sector ?? "").toLowerCase().includes(q) ||
      (s.analystName ?? "").toLowerCase().includes(q);
    const matchRec = !filterRec || s.recommendation === filterRec;
    return matchSearch && matchRec;
  });

  if (loading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500">Loading submissions...</p>
    </div>
  );

  if (error) return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-red-600">{error}</div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search by company, client, executive…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <select value={filterRec} onChange={(e) => setFilterRec(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="">All Recommendations</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
            <option value="Hold">Hold</option>
          </select>
          <div className="text-sm text-gray-500 flex items-center whitespace-nowrap">{filtered.length} of {submissions.length}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 font-medium">{submissions.length === 0 ? "No submissions yet" : "No matching submissions"}</p>
          <p className="text-gray-400 text-sm mt-1">{submissions.length === 0 ? "Fill out the tracker form to get started" : "Try adjusting your search"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {s.formType === "institution" ? (
                        <>
                          <span className="font-semibold text-gray-900">{s.clientName}</span>
                          <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">Institution</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-gray-900">{s.company}</span>
                          {s.recommendation && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REC_STYLES[s.recommendation as "Buy" | "Sell" | "Hold"]}`}>{s.recommendation}</span>}
                          {s.sector && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.sector}</span>}
                        </>
                      )}
                      {s.modeOfCommunication && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          {MODE_ICON[s.modeOfCommunication]} {s.modeOfCommunication}
                        </span>
                      )}
                    </div>
                    {s.formType === "institution"
                      ? <p className="text-sm text-gray-500">{s.salesPerson}</p>
                      : <p className="text-sm text-gray-500">{s.clientName} &nbsp;·&nbsp; {s.salesPerson}</p>
                    }
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
                <div className="border-t border-gray-100 px-5 py-5">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
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