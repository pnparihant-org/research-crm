// "use client";
// import { useEffect, useState, useCallback } from "react";
// import {
//   DataGrid, GridColDef, GridToolbarContainer, GridToolbarFilterButton,
//   GridToolbarDensitySelector, GridToolbarColumnsButton, GridRenderCellParams,
//   GridFilterModel, getGridStringOperators,
// } from "@mui/x-data-grid";
// import { Chip, Tooltip, Box } from "@mui/material";
// import { useToast } from "@/components/ui/Toast";

// interface Row {
//   id: string;
//   date: string;
//   salesPerson: string;
//   clientName: string;
//   designation: string;
//   modeOfCommunication: string;
//   formType: "research" | "institution";
//   company: string;
//   sector: string;
//   cmpTarget: string;
//   recommendation: "Buy" | "Sell" | "Hold" | "";
//   analystName: string;
//   buySideAnalystDesignation: string;
//   rationale: string;
//   feedback: string;
//   others: string;
//   submittedBy: string;
//   submittedByEmail: string;
//   submittedAt: string;
// }

// interface Props {
//   submissionsEndpoint: string;
//   exportEndpoint: string;
//   exportFilename?: string;
//   passwordProtectedExport?: boolean;
//   canDelete?: boolean;
//   deleteEndpoint?: (id: string) => string;
//   title?: string;
//   subtitle?: string;
//   accent?: "indigo" | "purple";
// }

// const REC_COLOR: Record<string, "success" | "error" | "warning"> = { Buy: "success", Sell: "error", Hold: "warning" };
// const REC_STYLES: Record<string, string> = { Buy: "bg-green-100 text-green-700", Sell: "bg-red-100 text-red-700", Hold: "bg-yellow-100 text-yellow-700" };

// function Toolbar() {
//   return (
//     <GridToolbarContainer sx={{ px: 2, py: 1.5, gap: 1 }}>
//       <GridToolbarColumnsButton />
//       <GridToolbarFilterButton />
//       <GridToolbarDensitySelector />
//     </GridToolbarContainer>
//   );
// }

// const PAGE_LIMIT = 500;

// function mapSubmissions(data: Record<string, unknown>[]): Row[] {
//   return data.map((s) => {
//     const user = s.userId as { name?: string; email?: string } | null;
//     return {
//       id: s._id as string,
//       date: s.date as string,
//       salesPerson: s.salesPerson as string,
//       clientName: s.clientName as string,
//       designation: (s.designation as string) ?? "",
//       modeOfCommunication: (s.modeOfCommunication as string) ?? "",
//       formType: ((s.formType as string) === "institution" ? "institution" : "research") as "research" | "institution",
//       company: (s.company as string) ?? "",
//       sector: (s.sector as string) ?? "",
//       cmpTarget: (s.cmpTarget as string) ?? "",
//       recommendation: (s.recommendation as "Buy" | "Sell" | "Hold") ?? "",
//       analystName: (s.analystName as string) ?? "",
//       buySideAnalystDesignation: (s.buySideAnalystDesignation as string) ?? "",
//       rationale: (s.rationale as string) ?? "",
//       feedback: (s.feedback as string) ?? "",
//       others: (s.others as string) ?? "",
//       submittedBy: user?.name ?? "—",
//       submittedByEmail: user?.email ?? "—",
//       submittedAt: new Date(s.submittedAt as string).toLocaleString("en-IN"),
//     };
//   });
// }

// export default function SubmissionsTable({
//   submissionsEndpoint,
//   exportEndpoint,
//   exportFilename = `Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`,
//   passwordProtectedExport = false,
//   canDelete = false,
//   deleteEndpoint,
//   title = "All Submissions",
//   subtitle = "View and filter all client interaction records",
//   accent = "indigo",
// }: Props) {
//   const [allRows, setAllRows] = useState<Row[]>([]);
//   const [filteredRows, setFilteredRows] = useState<Row[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
//   const [search, setSearch] = useState("");
//   const [serverSearch, setServerSearch] = useState("");
//   const [expandedCard, setExpandedCard] = useState<string | null>(null);
//   const [deletingId, setDeletingId] = useState<string | null>(null);
//   const [confirmId, setConfirmId] = useState<string | null>(null);
//   const [exportModal, setExportModal] = useState(false);
//   const [exportPassword, setExportPassword] = useState("");
//   const [exportShowPwd, setExportShowPwd] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const [isLimited, setIsLimited] = useState(false);
//   const { toast } = useToast();

//   const ring = accent === "purple" ? "focus:ring-purple-400" : "focus:ring-indigo-400";
//   const btnBg = accent === "purple"
//     ? "bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300"
//     : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300";
//   const headerBg = accent === "purple" ? "#faf5ff" : "#eef2ff";
//   const spinColor = accent === "purple" ? "border-purple-600" : "border-indigo-600";
//   const mobileFocusRing = accent === "purple" ? "focus:ring-purple-500" : "focus:ring-indigo-500";

//   function loadData(searchQuery = "", loadAll = false) {
//     setLoading(true);
//     const params = new URLSearchParams();
//     if (loadAll) params.set("all", "true");
//     else if (searchQuery) params.set("search", searchQuery);
//     const qs = params.toString();
//     const url = `${submissionsEndpoint}${qs ? "?" + qs : ""}`;
//     fetch(url)
//       .then((r) => r.json())
//       .then((data: Record<string, unknown>[]) => {
//         const mapped = mapSubmissions(data);
//         setAllRows(mapped); setFilteredRows(mapped); setLoading(false);
//         setIsLimited(!loadAll && !searchQuery && data.length === PAGE_LIMIT);
//       })
//       .catch(() => setLoading(false));
//   }

//   useEffect(() => { loadData(); }, []);

//   function handleServerSearch(e: React.FormEvent) {
//     e.preventDefault();
//     loadData(serverSearch);
//   }

//   const handleFilterModelChange = useCallback((model: GridFilterModel) => {
//     setFilterModel(model);
//     if (!model.items.length) { setFilteredRows(allRows); return; }
//     setFilteredRows(allRows.filter((row) =>
//       model.items.every((item) => {
//         if (!item.value) return true;
//         const cell = String(row[item.field as keyof Row] ?? "").toLowerCase();
//         const val = String(item.value).toLowerCase();
//         switch (item.operator) {
//           case "contains": return cell.includes(val);
//           case "equals": case "is": return cell === val;
//           case "startsWith": return cell.startsWith(val);
//           case "endsWith": return cell.endsWith(val);
//           case "isAnyOf": return Array.isArray(item.value) && (item.value as string[]).map((v) => v.toLowerCase()).includes(cell);
//           default: return cell.includes(val);
//         }
//       })
//     ));
//   }, [allRows]);

//   const mobileFiltered = allRows.filter((r) => {
//     const q = search.toLowerCase();
//     return !q || r.company.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) ||
//       r.salesPerson.toLowerCase().includes(q) || r.submittedBy.toLowerCase().includes(q);
//   });

//   async function triggerDownload(res: Response) {
//     const blob = await res.blob();
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = exportFilename;
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   async function handleSimpleExport() {
//     setExporting(true);
//     try {
//       const res = await fetch(exportEndpoint, { method: "POST" });
//       if (!res.ok) { toast("Export failed", "error"); return; }
//       await triggerDownload(res);
//     } catch {
//       toast("Export failed — please try again", "error");
//     } finally {
//       setExporting(false);
//     }
//   }

//   async function handlePasswordExport(e: React.FormEvent) {
//     e.preventDefault();
//     if (!exportPassword.trim()) return;
//     setExporting(true);
//     try {
//       const res = await fetch(exportEndpoint, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ password: exportPassword.trim() }),
//       });
//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         toast((err as { error?: string }).error ?? "Export failed", "error");
//         return;
//       }
//       await triggerDownload(res);
//       setExportModal(false);
//       setExportPassword("");
//       toast("Excel exported successfully", "success");
//     } catch {
//       toast("Export failed — please try again", "error");
//     } finally {
//       setExporting(false);
//     }
//   }

//   async function handleDelete(id: string) {
//     if (!deleteEndpoint) return;
//     setDeletingId(id);
//     try {
//       const res = await fetch(deleteEndpoint(id), { method: "DELETE" });
//       if (res.ok) {
//         setAllRows((prev) => prev.filter((r) => r.id !== id));
//         setFilteredRows((prev) => prev.filter((r) => r.id !== id));
//         toast("Submission deleted successfully", "success");
//       } else {
//         toast("Failed to delete submission", "error");
//       }
//     } catch {
//       toast("Network error — please try again", "error");
//     } finally {
//       setDeletingId(null);
//       setConfirmId(null);
//     }
//   }

//   const strOps = getGridStringOperators().filter((op) =>
//     ["contains", "equals", "startsWith", "endsWith"].includes(op.value)
//   );

//   const columns: GridColDef[] = [
//     ...(canDelete ? [{
//       field: "actions", headerName: "", width: 60, sortable: false, filterable: false, disableColumnMenu: true,
//       renderCell: (p: GridRenderCellParams) => (
//         <button
//           onClick={() => setConfirmId(p.row.id as string)}
//           disabled={deletingId === p.row.id}
//           className="flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40"
//           title="Delete submission"
//         >
//           <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//           </svg>
//         </button>
//       ),
//     } as GridColDef] : []),
//     { field: "date", headerName: "Date", width: 110, filterOperators: strOps },
//     { field: "salesPerson", headerName: "Arihant Representative", width: 160, filterOperators: strOps },
//     { field: "clientName", headerName: "Client", width: 200, filterOperators: strOps },
//     { field: "designation", headerName: "Designation", width: 140, filterOperators: strOps },
//     { field: "modeOfCommunication", headerName: "Mode", width: 130, filterOperators: strOps },
//     {
//       field: "formType", headerName: "Type", width: 120, filterOperators: strOps,
//       renderCell: (p: GridRenderCellParams) => (
//         <Chip
//           label={p.value === "institution" ? "Institution" : "Research"}
//           size="small"
//           sx={{ fontWeight: 600, fontSize: 12, bgcolor: p.value === "institution" ? "#f3e8ff" : "#eff6ff", color: p.value === "institution" ? "#7e22ce" : "#1d4ed8" }}
//         />
//       ),
//     },
//     { field: "company", headerName: "Company", width: 150, filterOperators: strOps },
//     { field: "sector", headerName: "Sector", width: 120, filterOperators: strOps },
//     { field: "cmpTarget", headerName: "CMP & Target", width: 130, filterOperators: strOps },
//     {
//       field: "recommendation", headerName: "Rec.", width: 100, filterOperators: strOps,
//       renderCell: (p: GridRenderCellParams) => p.value
//         ? <Chip label={p.value as string} color={REC_COLOR[p.value as string] ?? "default"} size="small" sx={{ fontWeight: 600, fontSize: 12 }} />
//         : null,
//     },
//     { field: "analystName", headerName: "Buy Side Person", width: 160, filterOperators: strOps },
//     { field: "buySideAnalystDesignation", headerName: "Buy Side Person Designation", width: 200, filterOperators: strOps },
//     { field: "rationale", headerName: "Rationale", width: 200, filterOperators: strOps },
//     { field: "feedback", headerName: "Feedback", width: 200, filterOperators: strOps },
//     { field: "others", headerName: "Others", width: 200, filterOperators: strOps },
//     {
//       field: "submittedBy", headerName: "Submitted By", width: 150, filterOperators: strOps,
//       renderCell: (p: GridRenderCellParams) => (
//         <Tooltip title={p.row.submittedByEmail} placement="top" arrow>
//           <span>{p.value as string}</span>
//         </Tooltip>
//       ),
//     },
//     { field: "submittedAt", headerName: "Submitted At", width: 170, filterOperators: strOps },
//   ];

//   return (
//     <>
//       {/* Password-protected export modal */}
//       {passwordProtectedExport && exportModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
//           <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
//                 <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                 </svg>
//               </div>
//               <div>
//                 <h3 className="text-base font-semibold text-gray-900">Set Export Password</h3>
//                 <p className="text-xs text-gray-500 mt-0.5">The downloaded Excel file will require this password to open.</p>
//               </div>
//             </div>
//             <form onSubmit={handlePasswordExport} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
//                 <div className="relative">
//                   <input
//                     type={exportShowPwd ? "text" : "password"}
//                     value={exportPassword}
//                     onChange={(e) => setExportPassword(e.target.value)}
//                     required autoFocus autoComplete="new-password"
//                     placeholder="Enter a password for the file"
//                     className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
//                   />
//                   <button
//                     type="button" tabIndex={-1}
//                     onClick={() => setExportShowPwd((v) => !v)}
//                     className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600"
//                   >
//                     {exportShowPwd ? (
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
//                     ) : (
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
//                     )}
//                   </button>
//                 </div>
//               </div>
//               <div className="flex gap-3 justify-end pt-1">
//                 <button
//                   type="button"
//                   onClick={() => { setExportModal(false); setExportPassword(""); }}
//                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={exporting || !exportPassword.trim()}
//                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 disabled:cursor-not-allowed rounded-lg transition-colors"
//                 >
//                   {exporting ? (
//                     <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Exporting…</>
//                   ) : (
//                     <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download</>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Delete confirm modal */}
//       {confirmId && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
//           <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
//             <h3 className="text-base font-semibold text-gray-900 mb-2">Delete submission?</h3>
//             <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
//             <div className="flex gap-3 justify-end">
//               <button onClick={() => setConfirmId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
//               <button
//                 onClick={() => handleDelete(confirmId)}
//                 disabled={deletingId === confirmId}
//                 className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
//               >
//                 {deletingId === confirmId ? "Deleting…" : "Delete"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
//         {/* Header */}
//         <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//             <div>
//               <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
//               <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
//             </div>
//             <div className="flex items-center gap-3 flex-wrap">
//               <form onSubmit={handleServerSearch} className={`hidden sm:flex items-center gap-2`}>
//                 <input
//                   type="text"
//                   value={serverSearch}
//                   onChange={(e) => setServerSearch(e.target.value)}
//                   placeholder="Search across all records…"
//                   className={`px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${ring} w-48`}
//                 />
//                 <button type="submit" className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">Search</button>
//                 {serverSearch && <button type="button" onClick={() => { setServerSearch(""); loadData(); }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
//               </form>
//               <span className="text-sm text-gray-500 hidden sm:inline">{filteredRows.length} / {allRows.length} rows</span>
//               <button
//                 onClick={passwordProtectedExport ? () => { setExportModal(true); setExportPassword(""); setExportShowPwd(false); } : handleSimpleExport}
//                 disabled={allRows.length === 0 || exporting}
//                 className={`flex items-center gap-2 ${btnBg} disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors`}
//               >
//                 <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
//                 Export Excel
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Limited data banner */}
//         {isLimited && (
//           <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2 text-xs text-amber-700">
//             <span>Showing latest {PAGE_LIMIT} records. Use the search above to find older entries.</span>
//             <button onClick={() => { setServerSearch(""); loadData("", true); }} className="font-semibold underline hover:no-underline">Load all</button>
//           </div>
//         )}

//         {/* Desktop DataGrid */}
//         <div className="hidden md:block">
//           <Box sx={{ width: "100%", height: 600 }}>
//             <DataGrid
//               rows={allRows} columns={columns} loading={loading} pageSizeOptions={[25, 50, 100]}
//               initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
//               filterModel={filterModel} onFilterModelChange={handleFilterModelChange}
//               slots={{ toolbar: Toolbar }}
//               disableRowSelectionOnClick
//               sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { backgroundColor: headerBg, fontWeight: 700, fontSize: 13 }, "& .MuiDataGrid-cell": { fontSize: 13 }, "& .MuiDataGrid-toolbarContainer": { borderBottom: "1px solid #e5e7eb" } }}
//             />
//           </Box>
//         </div>

//         {/* Mobile card list */}
//         <div className="md:hidden">
//           <div className="px-4 py-3 border-b border-gray-100">
//             <input
//               type="text"
//               placeholder="Search company, client, user…"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${mobileFocusRing}`}
//             />
//             <p className="text-xs text-gray-400 mt-2">{mobileFiltered.length} records</p>
//           </div>
//           {loading ? (
//             <div className="p-8 text-center">
//               <div className={`w-7 h-7 border-2 ${spinColor} border-t-transparent rounded-full animate-spin mx-auto mb-2`} />
//               <p className="text-sm text-gray-400">Loading…</p>
//             </div>
//           ) : mobileFiltered.length === 0 ? (
//             <div className="p-8 text-center text-sm text-gray-400">No submissions found</div>
//           ) : (
//             <div className="divide-y divide-gray-100">
//               {mobileFiltered.map((r) => (
//                 <div key={r.id}>
//                   <div className="px-4 py-3 cursor-pointer" onClick={() => setExpandedCard(expandedCard === r.id ? null : r.id)}>
//                     <div className="flex items-start justify-between gap-2">
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 flex-wrap mb-1">
//                           {r.formType === "institution" ? (
//                             <>
//                               <span className="font-semibold text-gray-900 text-sm">{r.clientName}</span>
//                               <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Institution</span>
//                             </>
//                           ) : (
//                             <>
//                               <span className="font-semibold text-gray-900 text-sm">{r.company || "—"}</span>
//                               <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Research</span>
//                               {r.recommendation && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REC_STYLES[r.recommendation]}`}>{r.recommendation}</span>}
//                             </>
//                           )}
//                         </div>
//                         <p className="text-xs text-gray-500 truncate">{r.formType === "institution" ? r.salesPerson : `${r.clientName} · ${r.salesPerson}`}</p>
//                         <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
//                       </div>
//                       <div className="flex items-center gap-1 shrink-0 mt-1">
//                         {canDelete && (
//                           <button
//                             onClick={(e) => { e.stopPropagation(); setConfirmId(r.id); }}
//                             className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
//                           >
//                             <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
//                           </button>
//                         )}
//                         <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCard === r.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                           <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
//                         </svg>
//                       </div>
//                     </div>
//                   </div>
//                   {expandedCard === r.id && (
//                     <div className="px-4 pb-4 bg-gray-50 grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-gray-100 " >
//                       {[
//                         ["Designation", r.designation],
//                         ["Mode", r.modeOfCommunication],
//                         ...(r.formType !== "institution" ? [["Sector", r.sector], ["CMP & Target", r.cmpTarget]] : []),
//                         ["Buy Side Person", r.analystName],
//                         ["BS Analyst Designation", r.buySideAnalystDesignation],
//                         ["Rationale", r.rationale],
//                         ["Feedback", r.feedback],
//                         ["Others", r.others],
//                         ["Submitted By", r.submittedBy],
//                         ["Submitted At", r.submittedAt],
//                       ].map(([label, val]) => (
//                         <div key={label} className="pt-3">
//                           <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5" style={{ fontSize: 10 }}>{label}</p>
//                           <p className="text-gray-800">{val || "—"}</p>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DataGrid, GridColDef, GridToolbarContainer, GridToolbarFilterButton,
  GridToolbarDensitySelector, GridToolbarColumnsButton, GridRenderCellParams,
  GridFilterModel, getGridStringOperators,
} from "@mui/x-data-grid";
import { Chip, Tooltip, Box } from "@mui/material";
import { useToast } from "@/components/ui/Toast";

interface Row {
  id: string;
  date: string;
  salesPerson: string;
  clientName: string;
  designation: string;
  modeOfCommunication: string;
  formType: "research" | "institution";
  company: string;
  sector: string;
  cmpTarget: string;
  recommendation: "Buy" | "Sell" | "Hold" | "";
  analystName: string;
  buySideAnalystDesignation: string;
  rationale: string;
  feedback: string;
  others: string;
  submittedBy: string;
  submittedByEmail: string;
  submittedAt: string;
}

interface Props {
  submissionsEndpoint: string;
  exportEndpoint: string;
  exportFilename?: string;
  passwordProtectedExport?: boolean;
  canDelete?: boolean;
  deleteEndpoint?: (id: string) => string;
  title?: string;
  subtitle?: string;
  accent?: "indigo" | "purple";
}

const REC_COLOR: Record<string, "success" | "error" | "warning"> = { Buy: "success", Sell: "error", Hold: "warning" };
const REC_STYLES: Record<string, string> = { Buy: "bg-green-100 text-green-700", Sell: "bg-red-100 text-red-700", Hold: "bg-yellow-100 text-yellow-700" };

function LongTextCell({ value }: { value: string }) {
  if (!value) return <span className="text-gray-300">—</span>;
  return (
    <Tooltip title={value} placement="top" arrow>
      <span
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "block",
        }}
      >
        {value}
      </span>
    </Tooltip>
  );
}

const FIELD_LABELS: [keyof Row, string][] = [
  ["date", "Date"],
  ["salesPerson", "Arihant Representative"],
  ["clientName", "Client"],
  ["designation", "Designation"],
  ["modeOfCommunication", "Mode of Communication"],
  ["company", "Company"],
  ["sector", "Sector"],
  ["cmpTarget", "CMP & Target"],
  ["analystName", "Buy Side Person"],
  ["buySideAnalystDesignation", "Buy Side Person Designation"],
  ["rationale", "Rationale"],
  ["feedback", "Feedback"],
  ["others", "Others"],
  ["submittedBy", "Submitted By"],
  ["submittedByEmail", "Submitted By Email"],
  ["submittedAt", "Submitted At"],
];

function Toolbar() {
  return (
    <GridToolbarContainer sx={{ px: 2, py: 1.5, gap: 1 }}>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
}

const PAGE_LIMIT = 500;

function mapSubmissions(data: Record<string, unknown>[]): Row[] {
  return data.map((s) => {
    const user = s.userId as { name?: string; email?: string } | null;
    return {
      id: s._id as string,
      date: s.date as string,
      salesPerson: s.salesPerson as string,
      clientName: s.clientName as string,
      designation: (s.designation as string) ?? "",
      modeOfCommunication: (s.modeOfCommunication as string) ?? "",
      formType: ((s.formType as string) === "institution" ? "institution" : "research") as "research" | "institution",
      company: (s.company as string) ?? "",
      sector: (s.sector as string) ?? "",
      cmpTarget: (s.cmpTarget as string) ?? "",
      recommendation: (s.recommendation as "Buy" | "Sell" | "Hold") ?? "",
      analystName: (s.analystName as string) ?? "",
      buySideAnalystDesignation: (s.buySideAnalystDesignation as string) ?? "",
      rationale: (s.rationale as string) ?? "",
      feedback: (s.feedback as string) ?? "",
      others: (s.others as string) ?? "",
      submittedBy: user?.name ?? "—",
      submittedByEmail: user?.email ?? "—",
      submittedAt: new Date(s.submittedAt as string).toLocaleString("en-IN"),
    };
  });
}

export default function SubmissionsTable({
  submissionsEndpoint,
  exportEndpoint,
  exportFilename = `Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`,
  passwordProtectedExport = false,
  canDelete = false,
  deleteEndpoint,
  title = "All Submissions",
  subtitle = "View and filter all client interaction records",
  accent = "indigo",
}: Props) {
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportShowPwd, setExportShowPwd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isLimited, setIsLimited] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const { toast } = useToast();

  const ring = accent === "purple" ? "focus:ring-purple-400" : "focus:ring-indigo-400";
  const btnBg = accent === "purple"
    ? "bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300"
    : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300";
  const headerBg = accent === "purple" ? "#faf5ff" : "#eef2ff";
  const spinColor = accent === "purple" ? "border-purple-600" : "border-indigo-600";
  const mobileFocusRing = accent === "purple" ? "focus:ring-purple-500" : "focus:ring-indigo-500";

  function loadData(searchQuery = "", loadAll = false) {
    setLoading(true);
    const params = new URLSearchParams();
    if (loadAll) params.set("all", "true");
    else if (searchQuery) params.set("search", searchQuery);
    const qs = params.toString();
    const url = `${submissionsEndpoint}${qs ? "?" + qs : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        const mapped = mapSubmissions(data);
        setAllRows(mapped); setFilteredRows(mapped); setLoading(false);
        setIsLimited(!loadAll && !searchQuery && data.length === PAGE_LIMIT);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  function handleServerSearch(e: React.FormEvent) {
    e.preventDefault();
    loadData(serverSearch);
  }

  const hasActiveFilter = Boolean(serverSearch) || Boolean(search) || filterModel.items.length > 0;

  function clearFilters() {
    setServerSearch("");
    setSearch("");
    setFilterModel({ items: [] });
    loadData();
  }

  const handleFilterModelChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
    if (!model.items.length) { setFilteredRows(allRows); return; }
    setFilteredRows(allRows.filter((row) =>
      model.items.every((item) => {
        if (!item.value) return true;
        const cell = String(row[item.field as keyof Row] ?? "").toLowerCase();
        const val = String(item.value).toLowerCase();
        switch (item.operator) {
          case "contains": return cell.includes(val);
          case "equals": case "is": return cell === val;
          case "startsWith": return cell.startsWith(val);
          case "endsWith": return cell.endsWith(val);
          case "isAnyOf": return Array.isArray(item.value) && (item.value as string[]).map((v) => v.toLowerCase()).includes(cell);
          default: return cell.includes(val);
        }
      })
    ));
  }, [allRows]);

  const mobileFiltered = allRows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.company.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) ||
      r.salesPerson.toLowerCase().includes(q) || r.submittedBy.toLowerCase().includes(q);
  });

  async function triggerDownload(res: Response) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSimpleExport() {
    setExporting(true);
    try {
      const res = await fetch(exportEndpoint, { method: "POST" });
      if (!res.ok) { toast("Export failed", "error"); return; }
      await triggerDownload(res);
    } catch {
      toast("Export failed — please try again", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handlePasswordExport(e: React.FormEvent) {
    e.preventDefault();
    if (!exportPassword.trim()) return;
    setExporting(true);
    try {
      const res = await fetch(exportEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: exportPassword.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast((err as { error?: string }).error ?? "Export failed", "error");
        return;
      }
      await triggerDownload(res);
      setExportModal(false);
      setExportPassword("");
      toast("Excel exported successfully", "success");
    } catch {
      toast("Export failed — please try again", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!deleteEndpoint) return;
    setDeletingId(id);
    try {
      const res = await fetch(deleteEndpoint(id), { method: "DELETE" });
      if (res.ok) {
        setAllRows((prev) => prev.filter((r) => r.id !== id));
        setFilteredRows((prev) => prev.filter((r) => r.id !== id));
        toast("Submission deleted successfully", "success");
      } else {
        toast("Failed to delete submission", "error");
      }
    } catch {
      toast("Network error — please try again", "error");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  const strOps = getGridStringOperators().filter((op) =>
    ["contains", "equals", "startsWith", "endsWith"].includes(op.value)
  );

  const columns: GridColDef[] = [
    ...(canDelete ? [{
      field: "actions", headerName: "", width: 60, sortable: false, filterable: false, disableColumnMenu: true,
      renderCell: (p: GridRenderCellParams) => (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmId(p.row.id as string); }}
          disabled={deletingId === p.row.id}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40"
          title="Delete submission"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ),
    } as GridColDef] : []),
    { field: "date", headerName: "Date", width: 110, filterOperators: strOps },
    { field: "salesPerson", headerName: "Arihant Representative", width: 160, filterOperators: strOps },
    { field: "clientName", headerName: "Client", width: 200, filterOperators: strOps },
    { field: "designation", headerName: "Designation", width: 140, filterOperators: strOps },
    { field: "modeOfCommunication", headerName: "Mode", width: 130, filterOperators: strOps },
    {
      field: "formType", headerName: "Type", width: 120, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => (
        <Chip
          label={p.value === "institution" ? "Institution" : "Research"}
          size="small"
          sx={{ fontWeight: 600, fontSize: 12, bgcolor: p.value === "institution" ? "#f3e8ff" : "#eff6ff", color: p.value === "institution" ? "#7e22ce" : "#1d4ed8" }}
        />
      ),
    },
    { field: "company", headerName: "Company", width: 150, filterOperators: strOps },
    { field: "sector", headerName: "Sector", width: 120, filterOperators: strOps },
    { field: "cmpTarget", headerName: "CMP & Target", width: 130, filterOperators: strOps },
    {
      field: "recommendation", headerName: "Rec.", width: 100, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => p.value
        ? <Chip label={p.value as string} color={REC_COLOR[p.value as string] ?? "default"} size="small" sx={{ fontWeight: 600, fontSize: 12 }} />
        : null,
    },
    { field: "analystName", headerName: "Buy Side Person", width: 160, filterOperators: strOps },
    { field: "buySideAnalystDesignation", headerName: "Buy Side Person Designation", width: 200, filterOperators: strOps },
    {
      field: "rationale", headerName: "Rationale", width: 260, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => <LongTextCell value={p.value as string} />,
    },
    {
      field: "feedback", headerName: "Feedback", width: 260, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => <LongTextCell value={p.value as string} />,
    },
    {
      field: "others", headerName: "Others", width: 260, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => <LongTextCell value={p.value as string} />,
    },
    {
      field: "submittedBy", headerName: "Submitted By", width: 150, filterOperators: strOps,
      renderCell: (p: GridRenderCellParams) => (
        <Tooltip title={p.row.submittedByEmail} placement="top" arrow>
          <span>{p.value as string}</span>
        </Tooltip>
      ),
    },
    { field: "submittedAt", headerName: "Submitted At", width: 170, filterOperators: strOps },
  ];

  return (
    <>
      {/* Password-protected export modal */}
      {passwordProtectedExport && exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Set Export Password</h3>
                <p className="text-xs text-gray-500 mt-0.5">The downloaded Excel file will require this password to open.</p>
              </div>
            </div>
            <form onSubmit={handlePasswordExport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={exportShowPwd ? "text" : "password"}
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    required autoFocus autoComplete="new-password"
                    placeholder="Enter a password for the file"
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setExportShowPwd((v) => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-gray-400 hover:text-gray-600"
                  >
                    {exportShowPwd ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setExportModal(false); setExportPassword(""); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={exporting || !exportPassword.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {exporting ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Exporting…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete submission?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={deletingId === confirmId}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {deletingId === confirmId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row detail modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelectedRow(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedRow.formType === "institution" ? selectedRow.clientName : selectedRow.company || "Submission details"}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <Chip
                    label={selectedRow.formType === "institution" ? "Institution" : "Research"}
                    size="small"
                    sx={{ fontWeight: 600, fontSize: 12, bgcolor: selectedRow.formType === "institution" ? "#f3e8ff" : "#eff6ff", color: selectedRow.formType === "institution" ? "#7e22ce" : "#1d4ed8" }}
                  />
                  {selectedRow.recommendation && (
                    <Chip label={selectedRow.recommendation} color={REC_COLOR[selectedRow.recommendation]} size="small" sx={{ fontWeight: 600, fontSize: 12 }} />
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {FIELD_LABELS.map(([field, label]) => (
                <div key={field}>
                  <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5" style={{ fontSize: 10 }}>{label}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{selectedRow[field] || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <form onSubmit={handleServerSearch} className={`hidden sm:flex items-center gap-2`}>
                <input
                  type="text"
                  value={serverSearch}
                  onChange={(e) => setServerSearch(e.target.value)}
                  placeholder="Search across all records…"
                  className={`px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${ring} w-48`}
                />
                <button type="submit" className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">Search</button>
              </form>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                >
                  Clear Filter
                </button>
              )}
              <span className="text-sm text-gray-500 hidden sm:inline">{filteredRows.length} / {allRows.length} rows</span>
              <button
                onClick={passwordProtectedExport ? () => { setExportModal(true); setExportPassword(""); setExportShowPwd(false); } : handleSimpleExport}
                disabled={allRows.length === 0 || exporting}
                className={`flex items-center gap-2 ${btnBg} disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors`}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Limited data banner */}
        {isLimited && (
          <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2 text-xs text-amber-700">
            <span>Showing latest {PAGE_LIMIT} records. Use the search above to find older entries.</span>
            <button onClick={() => { setServerSearch(""); loadData("", true); }} className="font-semibold underline hover:no-underline">Load all</button>
          </div>
        )}

        {/* Desktop DataGrid */}
        <div className="hidden md:block">
          <Box sx={{ width: "100%", height: 600 }}>
            <DataGrid
              rows={allRows} columns={columns} loading={loading} pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              filterModel={filterModel} onFilterModelChange={handleFilterModelChange}
              slots={{ toolbar: Toolbar }}
              disableRowSelectionOnClick
              onRowClick={(params) => setSelectedRow(params.row as Row)}
              sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { backgroundColor: headerBg, fontWeight: 700, fontSize: 13 }, "& .MuiDataGrid-cell": { fontSize: 13 }, "& .MuiDataGrid-row": { cursor: "pointer" }, "& .MuiDataGrid-toolbarContainer": { borderBottom: "1px solid #e5e7eb" } }}
            />
          </Box>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search company, client, user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${mobileFocusRing}`}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">{mobileFiltered.length} records</p>
              {hasActiveFilter && <button type="button" onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Clear Filter</button>}
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className={`w-7 h-7 border-2 ${spinColor} border-t-transparent rounded-full animate-spin mx-auto mb-2`} />
              <p className="text-sm text-gray-400">Loading…</p>
            </div>
          ) : mobileFiltered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No submissions found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {mobileFiltered.map((r) => (
                <div key={r.id}>
                  <div className="px-4 py-3 cursor-pointer" onClick={() => setExpandedCard(expandedCard === r.id ? null : r.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.formType === "institution" ? (
                            <>
                              <span className="font-semibold text-gray-900 text-sm">{r.clientName}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Institution</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-gray-900 text-sm">{r.company || "—"}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Research</span>
                              {r.recommendation && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REC_STYLES[r.recommendation]}`}>{r.recommendation}</span>}
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{r.formType === "institution" ? r.salesPerson : `${r.clientName} · ${r.salesPerson}`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-1">
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(r.id); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCard === r.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {expandedCard === r.id && (
                    <div className="px-4 pb-4 bg-gray-50 grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-gray-100">
                      {[
                        ["Designation", r.designation],
                        ["Mode", r.modeOfCommunication],
                        ...(r.formType !== "institution" ? [["Sector", r.sector], ["CMP & Target", r.cmpTarget]] : []),
                        ["Buy Side Person", r.analystName],
                        ["BS Analyst Designation", r.buySideAnalystDesignation],
                        ["Rationale", r.rationale],
                        ["Feedback", r.feedback],
                        ["Others", r.others],
                        ["Submitted By", r.submittedBy],
                        ["Submitted At", r.submittedAt],
                      ].map(([label, val]) => (
                        <div key={label} className="pt-3">
                          <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5" style={{ fontSize: 10 }}>{label}</p>
                          <p className="text-gray-800">{val || "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}