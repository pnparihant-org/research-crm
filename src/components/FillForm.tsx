"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { MODES as BASE_MODES, ADMIN_MODES } from "@/lib/modeOfCommunication";

interface ClientItem { _id: string; name: string }
interface StockItem { StockName: string; sect_name: string }

type FormType = "research" | "institution";

const EMPTY_FORM = {
  date: "",
  salesPerson: "",
  clientName: "",
  designation: "",
  modeOfCommunication: "" as "Phone" | "Online Meet" | "Physical" | "Message" | "",
  company: "",
  sector: "",
  cmpTarget: "",
  recommendation: "" as "Buy" | "Sell" | "Hold" | "",
  analystName: "",
  buySideAnalystDesignation: "",
  rationale: "",
  feedback: "",
  others: "",
};

function FormPanel({
  formType,
  isAdmin,
  userName,
  onSubmitted,
  clients,
  clientsLoading,
  stocks,
  stocksLoading,
  designationLoading,
  initialDesignation,
}: {
  formType: FormType;
  isAdmin: boolean;
  userName: string;
  onSubmitted: () => void;
  clients: ClientItem[];
  clientsLoading: boolean;
  stocks: StockItem[];
  stocksLoading: boolean;
  designationLoading: boolean;
  initialDesignation: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM, salesPerson: userName, designation: initialDesignation });
  const MODES = isAdmin ? ADMIN_MODES : BASE_MODES;
  const [loading, setLoading] = useState(false);

  const [clientOtherText, setClientOtherText] = useState("");
  const [companyOtherText, setCompanyOtherText] = useState("");
  const [companyIsOther, setCompanyIsOther] = useState(false);

  const [stockQuery, setStockQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [stockSelected, setStockSelected] = useState(false);
  const stockRef = useRef<HTMLDivElement>(null);

  const [clientQuery, setClientQuery] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];

  useEffect(() => {
    if (initialDesignation) setForm((prev) => ({ ...prev, designation: initialDesignation }));
  }, [initialDesignation]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (stockRef.current && !stockRef.current.contains(e.target as Node)) setShowDropdown(false);
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDropdown(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredStocks = stockQuery.trim().length >= 1
    ? stocks.filter((s) => s.StockName.toLowerCase().includes(stockQuery.toLowerCase())).slice(0, 50)
    : [];

  const filteredClients = clients.filter((c) =>
    !clientQuery.trim() || c.name.toLowerCase().includes(clientQuery.toLowerCase())
  ).slice(0, 50);

  function selectClient(client: ClientItem) {
    setForm((prev) => ({ ...prev, clientName: client.name }));
    setClientQuery(client.name);
    setShowClientDropdown(false);
  }

  function clearClient() {
    setForm((prev) => ({ ...prev, clientName: "" }));
    setClientQuery("");
    setClientOtherText("");
    setShowClientDropdown(false);
  }

  function selectClientOthers(prefill = "") {
    setForm((prev) => ({ ...prev, clientName: "__others__" }));
    setClientOtherText(prefill);
    setClientQuery("");
    setShowClientDropdown(false);
  }

  function selectStock(stock: StockItem) {
    setStockQuery(stock.StockName);
    setForm((prev) => ({ ...prev, company: stock.StockName, sector: stock.sect_name ?? "" }));
    setStockSelected(true);
    setShowDropdown(false);
  }

  function clearStock() {
    setStockQuery("");
    setForm((prev) => ({ ...prev, company: "", sector: "" }));
    setStockSelected(false);
    setCompanyIsOther(false);
    setCompanyOtherText("");
  }

  function selectCompanyOther() {
    setStockQuery("");
    setStockSelected(false);
    setShowDropdown(false);
    setCompanyIsOther(true);
    setForm((prev) => ({ ...prev, company: "", sector: "" }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formType === "research" && !form.recommendation) { toast("Please select Buy, Sell or Hold", "warning"); return; }
    if (!form.modeOfCommunication) { toast("Please select mode of communication", "warning"); return; }
    if (!form.clientName) { toast("Please select a client", "warning"); return; }
    if (form.clientName === "__others__" && !clientOtherText.trim()) {
      toast("Please enter the client name", "warning"); return;
    }
    if (formType === "research" && companyIsOther && !companyOtherText.trim()) {
      toast("Please enter the company name", "warning"); return;
    }
    setLoading(true);

    const payload = {
      ...form,
      formType,
      clientName: form.clientName === "__others__" ? clientOtherText.trim() : form.clientName,
      company: companyIsOther ? companyOtherText.trim() : form.company,
    };

    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { toast(data.error ?? "Submission failed", "error"); return; }

    toast("Form submitted successfully", "success");
    setForm({ ...EMPTY_FORM, salesPerson: userName, designation: initialDesignation });
    setStockQuery(""); setStockSelected(false);
    setClientQuery(""); setShowClientDropdown(false);
    setClientOtherText(""); setCompanyOtherText(""); setCompanyIsOther(false);
    setTimeout(() => onSubmitted(), 1000);
  }

  const inputCls = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-700 text-sm bg-white placeholder:text-gray-400 transition-shadow";

  const Badge = ({ n }: { n: number }) => (
    <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600 text-[10px] font-bold text-white shrink-0">{n}</span>
  );

  const SectionLabel = ({ title }: { title: string }) => (
    <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
    </div>
  );

  return (
    <div className="px-6 sm:px-8 py-7 space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Section 1: Basic Info */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <SectionLabel title="Basic Information" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={1} /> Date <span className="text-red-500">*</span>
              </label>
              <input type="date" name="date" value={form.date} onChange={handleChange} min={todayIST} required className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={2} /> Arihant Sales Person / Arihant Research Analyst / Associate
              </label>
              <div className="relative">
                <input type="text" value={form.salesPerson} readOnly className="w-full px-3.5 py-2.5 pr-9 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 sm:max-w-xs">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={3} /> Designation
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={designationLoading ? "Loading…" : (form.designation || "Not assigned")}
                  readOnly
                  className="w-full px-3.5 py-2.5 pr-9 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Client Details */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <SectionLabel title="Client Details" />
          <div className="p-5 space-y-5">

            <div className="space-y-1.5" ref={clientRef}>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={4} /> Client Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {form.clientName === "__others__" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 border border-amber-300 rounded-lg bg-amber-50 text-sm text-amber-700 font-medium">
                      <span className="flex-1">Others (manual entry)</span>
                      <button type="button" onClick={clearClient} className="text-amber-500 hover:text-red-500 transition-colors shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={clientOtherText}
                      onChange={(e) => setClientOtherText(e.target.value)}
                      placeholder="Enter client name…"
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                ) : form.clientName ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border border-brand-400 rounded-lg bg-brand-50 text-sm text-brand-800 font-medium">
                    <svg className="w-4 h-4 text-brand-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="flex-1 truncate">{form.clientName}</span>
                    <button type="button" onClick={clearClient} className="text-brand-500 hover:text-red-500 transition-colors ml-1 shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={clientQuery}
                      onChange={(e) => { setClientQuery(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      required
                      placeholder={clientsLoading ? "Loading clients…" : clients.length === 0 ? "No clients assigned — contact admin" : "Type to search client…"}
                      disabled={clientsLoading}
                      className={`${inputCls} pr-8 disabled:bg-gray-50 disabled:text-gray-400`}
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Client not listed?{" "}
                      <button type="button" onClick={() => selectClientOthers()} className="text-brand-600 hover:text-brand-700 font-medium underline">
                        Select Others
                      </button>
                    </p>
                    {showClientDropdown && filteredClients.length > 0 && (
                      <ul className="absolute z-50 mt-1 w-full max-h-[40vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
                        {filteredClients.map((c) => (
                          <li
                            key={c._id}
                            onMouseDown={() => selectClient(c)}
                            className="px-3.5 py-2.5 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-0 font-medium text-gray-800"
                          >
                            {c.name}
                          </li>
                        ))}
                        <li
                          onMouseDown={() => selectClientOthers()}
                          className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-amber-50 cursor-pointer text-amber-700 font-medium"
                        >
                          Others (not listed)
                        </li>
                      </ul>
                    )}
                    {showClientDropdown && clientQuery.trim().length >= 1 && filteredClients.length === 0 && !clientsLoading && (
                      <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg text-sm overflow-hidden">
                        <div className="px-3.5 py-3 text-gray-400 border-b border-gray-100">No clients found for &quot;{clientQuery}&quot;</div>
                        <div
                          onMouseDown={() => selectClientOthers(clientQuery)}
                          className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-amber-50 cursor-pointer text-amber-700 font-medium"
                        >
                          Use &quot;{clientQuery}&quot; as Others
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!clientsLoading && clients.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Ask your admin to assign clients to your account.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={5} /> Buy Side Person <span className="text-red-500">*</span>
              </label>
              <input type="text" name="analystName" value={form.analystName} onChange={handleChange} required placeholder="Buy Side Person Name" className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={6} /> Buy Side Person Designation
              </label>
              <input type="text" name="buySideAnalystDesignation" value={form.buySideAnalystDesignation} onChange={handleChange} placeholder="e.g. Portfolio Manager, Fund Manager…" className={inputCls} />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={7} /> Mode of Communication <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3 flex-wrap">
                {MODES.map((mode) => {
                  const active = form.modeOfCommunication === mode;
                  return (
                    <label key={mode} className="cursor-pointer">
                      <input type="radio" name="modeOfCommunication" value={mode} checked={active} onChange={handleChange} className="sr-only" />
                      <div className={`flex items-center gap-2 px-4 py-3 sm:py-2 rounded-lg border-2 text-sm font-medium transition-all select-none ${active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600 hover:border-brand-400"}`}>
                        {mode === "Phone" && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        )}
                        {mode === "Online Meet" && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677v6.646a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        {mode === "Physical" && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        {mode === "Message" && (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        )}
                        {mode}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Section 3: Stock Details — Research only */}
        {formType === "research" && <div className="rounded-xl border border-gray-200 overflow-hidden">
          <SectionLabel title="Stock Details" />
          <div className="p-5 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              <div className="space-y-1.5" ref={stockRef}>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Badge n={8} /> Company <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  {companyIsOther ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-amber-300 rounded-lg bg-amber-50 text-sm text-amber-700 font-medium">
                        <span className="flex-1">Others (manual entry)</span>
                        <button type="button" onClick={clearStock} className="text-amber-500 hover:text-red-500 transition-colors shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={companyOtherText}
                        onChange={(e) => setCompanyOtherText(e.target.value)}
                        placeholder="Enter company name…"
                        className={inputCls}
                        autoFocus
                      />
                    </div>
                  ) : stockSelected ? (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 border border-brand-400 rounded-lg bg-brand-50 text-sm text-brand-800 font-medium">
                      <svg className="w-4 h-4 text-brand-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="flex-1 truncate">{stockQuery}</span>
                      <button type="button" onClick={clearStock} className="text-brand-500 hover:text-red-500 transition-colors ml-1 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={stockQuery}
                        onChange={(e) => { setStockQuery(e.target.value); setShowDropdown(true); setForm((p) => ({ ...p, company: e.target.value, sector: "" })); }}
                        onFocus={() => { if (stockQuery) setShowDropdown(true); }}
                        required={!stockSelected && !companyIsOther}
                        placeholder={stocksLoading ? "Loading stocks…" : "Type to search stock…"}
                        disabled={stocksLoading}
                        className={`${inputCls} pr-8 disabled:bg-gray-50 disabled:text-gray-400`}
                        autoComplete="off"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Company not in list?{" "}
                        <button type="button" onClick={selectCompanyOther} className="text-amber-600 hover:underline font-medium">
                          Select Others
                        </button>
                      </p>
                      {stockQuery && (
                        <button type="button" onClick={clearStock} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {showDropdown && filteredStocks.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full max-h-[40vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm">
                          {filteredStocks.map((s) => (
                            <li
                              key={s.StockName}
                              onMouseDown={() => selectStock(s)}
                              className="flex items-center justify-between px-3.5 py-2.5 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-0"
                            >
                              <span className="font-medium text-gray-800">{s.StockName}</span>
                              {s.sect_name && <span className="text-xs text-gray-400 ml-2 shrink-0">{s.sect_name}</span>}
                            </li>
                          ))}
                          <li
                            onMouseDown={selectCompanyOther}
                            className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-amber-50 cursor-pointer text-amber-700 font-medium border-t border-gray-200"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Others (not in list)
                          </li>
                        </ul>
                      )}
                      {showDropdown && stockQuery.trim().length >= 1 && filteredStocks.length === 0 && !stocksLoading && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg text-sm overflow-hidden">
                          <div className="px-3.5 py-3 text-gray-400 border-b border-gray-100">No stocks found for &quot;{stockQuery}&quot;</div>
                          <div
                            onMouseDown={selectCompanyOther}
                            className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-amber-50 cursor-pointer text-amber-700 font-medium"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Others (not in list)
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Badge n={9} /> Sector
                  {stockSelected && <span className="text-xs text-brand-600 font-normal">(auto-filled)</span>}
                </label>
                <input
                  type="text"
                  name="sector"
                  value={form.sector}
                  readOnly
                  placeholder="Auto-filled on stock selection"
                  className={`${inputCls} bg-gray-50 text-gray-500 cursor-default`}
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:max-w-xs">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={10} /> CMP &amp; Target <span className="text-red-500">*</span>
              </label>
              <input type="text" name="cmpTarget" value={form.cmpTarget} onChange={handleChange} required placeholder="e.g. CMP 540 / Target 650" className={inputCls} />
            </div>

          </div>
        </div>}

        {/* Section 4: Recommendation — Research only */}
        {formType === "research" && <div className="rounded-xl border border-gray-200 overflow-hidden">
          <SectionLabel title="Recommendation" />
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={11} /> Buy / Sell / Hold <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3 flex-wrap">
                {(["Buy", "Sell", "Hold"] as const).map((opt) => {
                  const active = form.recommendation === opt;
                  const styles = {
                    Buy:  active ? "border-brand-600 bg-brand-50 text-brand-700"  : "border-gray-300 text-gray-600 hover:border-brand-400",
                    Sell: active ? "border-red-500 bg-red-50 text-red-700"     : "border-gray-300 text-gray-600 hover:border-red-400",
                    Hold: active ? "border-gray-500 bg-gray-100 text-gray-700" : "border-gray-300 text-gray-600 hover:border-gray-500",
                  };
                  const dots = { Buy: active ? "bg-brand-600" : "bg-gray-300", Sell: active ? "bg-red-500" : "bg-gray-300", Hold: active ? "bg-gray-500" : "bg-gray-300" };
                  return (
                    <label key={opt} className="cursor-pointer">
                      <input type="radio" name="recommendation" value={opt} checked={active} onChange={handleChange} className="sr-only" />
                      <div className={`flex items-center gap-2 px-5 py-3 sm:py-2.5 rounded-lg border-2 text-sm font-semibold transition-all select-none ${styles[opt]}`}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dots[opt]}`} />
                        {opt}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>}

        {/* Section 5: Rationale & Feedback */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <SectionLabel title="Rationale & Feedback" />
          <div className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={12} /> Rationale
              </label>
              <textarea name="rationale" value={form.rationale} onChange={handleChange} rows={3} placeholder="Brief rationale for the recommendation…" className={`${inputCls} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={13} /> Feedback
              </label>
              <textarea name="feedback" value={form.feedback} onChange={handleChange} rows={3} placeholder="Client feedback or response…" className={`${inputCls} resize-none`} />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Badge n={14} /> Others
              </label>
              <textarea name="others" value={form.others} onChange={handleChange} rows={3} placeholder="Any other notes or remarks…" className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 pb-2">
          <p className="text-xs text-gray-400">Fields marked <span className="text-red-500 font-medium">*</span> are required</p>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 disabled:cursor-not-allowed text-white font-semibold px-7 py-3 sm:py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function FillForm({ onSubmitted, userName, isAdmin = false }: { onSubmitted: () => void; userName: string; isAdmin?: boolean }) {
  const [activeTab, setActiveTab] = useState<FormType>("research");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [designationLoading, setDesignationLoading] = useState(true);
  const [designation, setDesignation] = useState("");
  const [dept, setDept] = useState<"research" | "institution" | null>(null);

  useEffect(() => {
    fetch("/api/users/my-clients")
      .then((r) => r.json())
      .then((data) => { setClients(Array.isArray(data) ? data : []); setClientsLoading(false); })
      .catch(() => setClientsLoading(false));

    fetch("/api/mssql/stocks")
      .then((r) => r.json())
      .then((data) => { setStocks(Array.isArray(data) ? data : []); setStocksLoading(false); })
      .catch(() => setStocksLoading(false));

    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.designation) setDesignation(data.designation);
        if (data.dept) {
          setDept(data.dept);
          setActiveTab(data.dept);
        }
        setDesignationLoading(false);
      })
      .catch(() => setDesignationLoading(false));
  }, []);

  const allTabs: { id: FormType; label: string; description: string }[] = [
    { id: "research", label: "Research", description: "Log client interaction & stock discussion" },
    { id: "institution", label: "Institution", description: "Log institutional client interaction" },
  ];
  const tabs = dept ? allTabs.filter((t) => t.id === dept) : allTabs;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

      <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-4 sm:px-8 py-5 sm:py-6">
        <p className="text-brand-200 text-xs font-semibold uppercase tracking-widest mb-1">Arihant Capital Markets</p>
        <h2 className="text-2xl font-bold text-white tracking-tight">Research Servicing Tracker</h2>
        <p className="text-brand-100/80 text-sm mt-1">{tabs.find((t) => t.id === activeTab)?.description}</p>
      </div>

      {/* Tab switcher */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 sm:px-8">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors focus:outline-none ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <FormPanel
        key={activeTab}
        formType={activeTab}
        isAdmin={isAdmin}
        userName={userName}
        onSubmitted={onSubmitted}
        clients={clients}
        clientsLoading={clientsLoading}
        stocks={stocks}
        stocksLoading={stocksLoading}
        designationLoading={designationLoading}
        initialDesignation={designation}
      />
    </div>
  );
}
