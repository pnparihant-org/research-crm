"use client";
import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import FillForm from "./FillForm";
import BulkUpload from "./BulkUpload";
import History from "./History";
import UserSubmissionsTable from "./shared/UserSubmissionsTable";
import ChangePassword from "./ChangePassword";
import UploadReports from "./UploadReports";

type Tab = "fill" | "bulk" | "history" | "submissions" | "reports" | "settings";

export default function DashboardClient({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState<Tab>("fill");
  const [refreshKey, setRefreshKey] = useState(0);
  const [designation, setDesignation] = useState("");

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => { if (data.designation) setDesignation(data.designation); })
      .catch(() => {});
  }, []);

  function onFormSubmitted() {
    setRefreshKey((k) => k + 1);
    setActiveTab("history");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "fill",
      label: "Fill Form",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: "bulk",
      label: "Bulk Upload",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      id: "history",
      label: "History",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "submissions",
      label: "Submissions",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h3m0 0l-3-3m3 3l-3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
        </svg>
      ),
    },
    {
      id: "reports",
      label: "Upload Reports",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Security",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-brand-50/40">
      <header className="bg-brand-50 border-b border-brand-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/ACML-Logo-Green-Bg.svg" alt="Arihant Capital Markets" className="h-9 w-auto rounded-lg" />
            <div className="w-px h-6 bg-gray-300" />
            <span className="text-sm font-semibold text-gray-600">CRM</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Show Arihant Representative name prominently */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
              
              {designation && <p className="text-xs text-brand-600 font-medium">{designation}</p>}
            </div>
            <button
              onClick={async () => { await signOut({ redirect: false }); window.location.href = "/auth/login"; }}
              className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "fill" && <FillForm onSubmitted={onFormSubmitted} userName={session.user.name} />}
        {activeTab === "bulk" && <BulkUpload onSubmitted={onFormSubmitted} userName={session.user.name} />}
        {activeTab === "history" && <History key={refreshKey} />}
        {activeTab === "submissions" && <UserSubmissionsTable key={refreshKey} />}
        {activeTab === "reports" && <UploadReports />}
        {activeTab === "settings" && <ChangePassword accentColor="teal" />}
      </main>
    </div>
  );
}