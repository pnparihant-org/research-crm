"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Item { _id: string; name: string }
interface CompanyItem { _id: string; name: string; groupId: string }

type Tab = "sectors" | "companies" | "salesExecutives";

function MasterList({
  title,
  items,
  onAdd,
  onDelete,
  loading,
  extra,
}: {
  title: string;
  items: Item[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
  extra?: React.ReactNode;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    await onAdd(newName.trim());
    setNewName("");
    setAdding(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{items.length} items</span>
      </div>

      {extra && <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">{extra}</div>}

      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder={`Add new ${title.toLowerCase().replace("manage ", "")}...`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No items yet. Add one above.</div>
        ) : (
          items.map((item) => (
            <div key={item._id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50">
              <span className="text-sm text-gray-700">{item.name}</span>
              <button
                onClick={() => onDelete(item._id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MasterDataManager() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("sectors");
  const [sectors, setSectors] = useState<Item[]>([]);
  const [companyGroups, setCompanyGroups] = useState<Item[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [salesExecs, setSalesExecs] = useState<Item[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingExecs, setLoadingExecs] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);

  useEffect(() => {
    fetch("/api/master/sectors").then((r) => r.json()).then((d) => { setSectors(Array.isArray(d) ? d : []); setLoadingSectors(false); });
    fetch("/api/master/company-groups").then((r) => r.json()).then((d) => { setCompanyGroups(Array.isArray(d) ? d : []); setLoadingGroups(false); });
    fetch("/api/master/sales-executives").then((r) => r.json()).then((d) => { setSalesExecs(Array.isArray(d) ? d : []); setLoadingExecs(false); });
  }, []);

  useEffect(() => {
    setLoadingCompanies(true);
    const url = selectedGroupId ? `/api/master/companies?groupId=${selectedGroupId}` : "/api/master/companies";
    fetch(url).then((r) => r.json()).then((d) => { setCompanies(Array.isArray(d) ? d : []); setLoadingCompanies(false); });
  }, [selectedGroupId]);

  async function masterPost(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.json();
  }

  async function masterDelete(url: string, id: string) {
    const res = await fetch(`${url}?id=${id}`, { method: "DELETE" });
    return res.ok;
  }

  async function addSector(name: string) {
    const doc = await masterPost("/api/master/sectors", { name });
    if (doc._id) { setSectors((prev) => [...prev, doc].sort((a, b) => a.name.localeCompare(b.name))); toast(`Sector "${name}" added`, "success"); }
    else toast("Failed to add sector", "error");
  }

  async function deleteSector(id: string) {
    const name = sectors.find((s) => s._id === id)?.name ?? "";
    const ok = await masterDelete("/api/master/sectors", id);
    if (ok) { setSectors((prev) => prev.filter((s) => s._id !== id)); toast(`Sector "${name}" deleted`, "warning"); }
    else toast("Failed to delete sector", "error");
  }

  async function addGroup(name: string) {
    const doc = await masterPost("/api/master/company-groups", { name });
    if (doc._id) { setCompanyGroups((prev) => [...prev, doc].sort((a, b) => a.name.localeCompare(b.name))); toast(`Group "${name}" added`, "success"); }
    else toast("Failed to add group", "error");
  }

  async function deleteGroup(id: string) {
    const name = companyGroups.find((g) => g._id === id)?.name ?? "";
    const ok = await masterDelete("/api/master/company-groups", id);
    if (ok) { setCompanyGroups((prev) => prev.filter((g) => g._id !== id)); if (selectedGroupId === id) setSelectedGroupId(""); toast(`Group "${name}" deleted`, "warning"); }
    else toast("Failed to delete group", "error");
  }

  async function addCompany() {
    if (!newCompanyName.trim() || !selectedGroupId) return;
    setAddingCompany(true);
    const doc = await masterPost("/api/master/companies", { name: newCompanyName.trim(), groupId: selectedGroupId });
    if (doc._id) { setCompanies((prev) => [...prev, doc].sort((a, b) => a.name.localeCompare(b.name))); toast(`Company "${newCompanyName.trim()}" added`, "success"); }
    else toast("Failed to add company", "error");
    setNewCompanyName("");
    setAddingCompany(false);
  }

  async function deleteCompany(id: string) {
    const name = companies.find((c) => c._id === id)?.name ?? "";
    const ok = await masterDelete("/api/master/companies", id);
    if (ok) { setCompanies((prev) => prev.filter((c) => c._id !== id)); toast(`Company "${name}" deleted`, "warning"); }
    else toast("Failed to delete company", "error");
  }

  async function addExec(name: string) {
    const doc = await masterPost("/api/master/sales-executives", { name });
    if (doc._id) { setSalesExecs((prev) => [...prev, doc].sort((a, b) => a.name.localeCompare(b.name))); toast(`Representative "${name}" added`, "success"); }
    else toast("Failed to add representative", "error");
  }

  async function deleteExec(id: string) {
    const name = salesExecs.find((e) => e._id === id)?.name ?? "";
    const ok = await masterDelete("/api/master/sales-executives", id);
    if (ok) { setSalesExecs((prev) => prev.filter((e) => e._id !== id)); toast(`Representative "${name}" deleted`, "warning"); }
    else toast("Failed to delete representative", "error");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "sectors", label: "Sectors" },
    { id: "companies", label: "Companies" },
    { id: "salesExecutives", label: "Arihant Representatives" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Master Data</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage the dropdown options shown in the tracker form</p>
      </div>

      <div className="flex gap-1 px-6 pt-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-5">
        {tab === "sectors" && (
          <MasterList title="Sectors" items={sectors} onAdd={addSector} onDelete={deleteSector} loading={loadingSectors} />
        )}

        {tab === "companies" && (
          <>
            <MasterList title="Company Groups" items={companyGroups} onAdd={addGroup} onDelete={deleteGroup} loading={loadingGroups} />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Companies</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select a group to manage its companies</p>
              </div>

              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All groups</option>
                  {companyGroups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>

              <div className="px-5 py-3 border-b border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompany(); } }}
                    placeholder={selectedGroupId ? "Add company to selected group..." : "Select a group first"}
                    disabled={!selectedGroupId}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
                  />
                  <button
                    onClick={addCompany}
                    disabled={!newCompanyName.trim() || !selectedGroupId || addingCompany}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {addingCompany ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {loadingCompanies ? (
                  <div className="px-5 py-6 text-center text-sm text-gray-400">Loading...</div>
                ) : companies.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-gray-400">
                    {selectedGroupId ? "No companies in this group yet." : "Select a group to see its companies."}
                  </div>
                ) : (
                  companies.map((c) => {
                    const groupName = companyGroups.find((g) => g._id === c.groupId)?.name ?? "";
                    return (
                      <div key={c._id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50">
                        <div>
                          <span className="text-sm text-gray-700">{c.name}</span>
                          {!selectedGroupId && <span className="ml-2 text-xs text-gray-400">({groupName})</span>}
                        </div>
                        <button onClick={() => deleteCompany(c._id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {tab === "salesExecutives" && (
          <MasterList title="Arihant Representatives" items={salesExecs} onAdd={addExec} onDelete={deleteExec} loading={loadingExecs} />
        )}
      </div>
    </div>
  );
}
