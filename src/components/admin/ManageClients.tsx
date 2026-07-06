"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

// Cycles through a fixed palette for any number of dynamic categories
const COLOR_PALETTE = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-brand-50 text-brand-700 border-brand-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-brand-50 text-brand-700 border-brand-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-green-50 text-green-700 border-green-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-sky-50 text-sky-700 border-sky-200",
];

interface ClientDoc  { _id: string; name: string; category: string }
interface CategoryDoc { _id: string; name: string }

export default function ManageClients() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [clients, setClients]       = useState<ClientDoc[]>([]);
  const [loading, setLoading]        = useState(true);
  const [search, setSearch]          = useState("");
  const [filterCat, setFilterCat]    = useState<string>("all");

  // Category management panel
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [newCatName, setNewCatName]     = useState("");
  const [addingCat, setAddingCat]       = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Add client form
  const [showAdd, setShowAdd]   = useState(false);
  const [addName, setAddName]   = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addSaving, setAddSaving]     = useState(false);

  // Edit modal
  const [editTarget, setEditTarget]     = useState<ClientDoc | null>(null);
  const [editName, setEditName]         = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSaving, setEditSaving]     = useState(false);

  // Delete client
  const [deleteTarget, setDeleteTarget] = useState<ClientDoc | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, clientRes] = await Promise.all([
        fetch("/api/master/client-categories"),
        fetch("/api/master/clients"),
      ]);
      const cats    = catRes.ok    ? await catRes.json()    : [];
      const clients = clientRes.ok ? await clientRes.json() : [];
      setCategories(Array.isArray(cats)    ? cats    : []);
      setClients(Array.isArray(clients) ? clients : []);
      if (Array.isArray(cats) && cats.length > 0 && !addCategory) {
        setAddCategory(cats[0].name);
      }
    } finally {
      setLoading(false);
    }
  }, [addCategory]);

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived color map
  const colorMap: Record<string, string> = {};
  categories.forEach((c, i) => { colorMap[c.name] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });

  const catNames = categories.map((c) => c.name);

  const grouped: Record<string, ClientDoc[]> = {};
  catNames.forEach((cat) => {
    const q = search.toLowerCase();
    grouped[cat] = clients.filter(
      (c) => c.category === cat && (!q || c.name.toLowerCase().includes(q))
    );
  });

  // Clients with unknown / deleted categories
  const knownCats = new Set(catNames);
  const orphans = clients.filter((c) => !knownCats.has(c.category) && (!search || c.name.toLowerCase().includes(search.toLowerCase())));

  const displayCats = filterCat === "all" ? catNames : [filterCat];
  const totalVisible = displayCats.reduce((n, cat) => n + (grouped[cat]?.length ?? 0), 0) + (filterCat === "all" ? orphans.length : 0);

  // ── Category management ───────────────────────────────────────────────────
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setAddingCat(true);
    const res = await fetch("/api/master/client-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    const data = await res.json();
    setAddingCat(false);
    if (!res.ok) { toast(data.error ?? "Failed to add category", "error"); return; }
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCatName("");
    toast(`Category "${data.name}" added`, "success");
  }

  async function handleDeleteCategory(cat: CategoryDoc) {
    const clientsInCat = clients.filter((c) => c.category === cat.name).length;
    if (clientsInCat > 0) {
      toast(`Cannot delete — ${clientsInCat} client(s) are in this category`, "error");
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setDeletingCatId(cat._id);
    await fetch(`/api/master/client-categories?id=${cat._id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c._id !== cat._id));
    setDeletingCatId(null);
    toast(`Category "${cat.name}" deleted`, "warning");
  }

  // ── Client CRUD ───────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    const res = await fetch("/api/master/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, category: addCategory }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) { toast(data.error ?? "Failed to add client", "error"); return; }
    setClients((prev) => [...prev, data].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    setAddName("");
    setShowAdd(false);
    toast(`"${data.name}" added`, "success");
  }

  function openEdit(c: ClientDoc) {
    setEditTarget(c);
    setEditName(c.name);
    setEditCategory(c.category);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    const res = await fetch(`/api/master/clients?id=${editTarget._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, category: editCategory }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { toast(data.error ?? "Failed to update", "error"); return; }
    setClients((prev) =>
      prev.map((c) => c._id === editTarget._id ? data : c)
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    );
    toast(`"${data.name}" updated`, "success");
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/master/clients?id=${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast("Failed to delete client", "error"); setDeleteTarget(null); return; }
    setClients((prev) => prev.filter((c) => c._id !== deleteTarget._id));
    toast(`"${deleteTarget.name}" deleted`, "warning");
    setDeleteTarget(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900">Edit Client</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                >
                  {catNames.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input
                  type="text" required value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3 pt-1 justify-end">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {editSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete client confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Client?</h3>
                <p className="text-sm text-gray-500 mt-0.5">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">This will permanently remove this client from the system.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors">
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 max-w-4xl">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Clients</h2>
              <p className="text-sm text-gray-500 mt-0.5">Add, edit or remove institutional clients grouped by category.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowCatPanel((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
                </svg>
                <span className="hidden xs:inline">Manage </span>Categories
              </button>
              <button
                onClick={() => { setShowAdd((v) => !v); setAddName(""); setAddCategory(catNames[0] ?? ""); }}
                disabled={catNames.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Client
              </button>
            </div>
          </div>

          {/* Manage Categories panel */}
          {showCatPanel && (
            <div className="mb-4 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Categories</h3>

              {/* Existing categories */}
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400">No categories yet. Add one below.</p>
              ) : (
                <ul className="space-y-2">
                  {categories.map((cat, i) => (
                    <li key={cat._id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${COLOR_PALETTE[i % COLOR_PALETTE.length]}`}>
                          {cat.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {clients.filter((c) => c.category === cat.name).length} clients
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={deletingCatId === cat._id}
                        className="text-xs text-red-400 hover:text-red-600 font-medium disabled:opacity-50"
                      >
                        {deletingCatId === cat._id ? "Deleting…" : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new category */}
              <form onSubmit={handleAddCategory} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={addingCat || !newCatName.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {addingCat ? "Adding…" : "Add"}
                </button>
              </form>
            </div>
          )}

          {/* Add client form */}
          {showAdd && (
            <form onSubmit={handleAdd} className="mt-2 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">New Client</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
                  >
                    {catNames.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                  <input
                    type="text" required value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Full client / fund name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={addSaving} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {addSaving ? "Adding…" : "Add Client"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">Cancel</button>
              </div>
            </form>
          )}

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text" placeholder="Search clients…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
              />
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Client list */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : catNames.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            No categories yet. Click <strong>Manage Categories</strong> to add one.
          </div>
        ) : totalVisible === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            {search ? `No clients match "${search}"` : "No clients yet. Add one above."}
          </div>
        ) : (
          <>
            {displayCats.map((cat, i) => {
              const list = grouped[cat] ?? [];
              if (list.length === 0 && search) return null;
              const colorCls = COLOR_PALETTE[categories.findIndex((c) => c.name === cat) % COLOR_PALETTE.length] ?? "bg-gray-50 text-gray-600 border-gray-200";
              return (
                <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorCls}`}>{cat}</span>
                    <span className="text-xs text-gray-400">{list.length} {list.length === 1 ? "client" : "clients"}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-400">No clients in this category yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {list.map((c) => (
                        <li key={c._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group">
                          <span className="text-sm text-gray-800 font-medium">{c.name}</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => openEdit(c)} className="text-xs text-brand-500 hover:text-brand-700 font-medium">Edit</button>
                            <button onClick={() => setDeleteTarget(c)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {/* Orphaned clients (category was deleted) */}
            {filterCat === "all" && orphans.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-amber-100 flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">Uncategorised</span>
                  <span className="text-xs text-gray-400">{orphans.length} clients</span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {orphans.map((c) => (
                    <li key={c._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group">
                      <div>
                        <span className="text-sm text-gray-800 font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-gray-400">({c.category})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(c)} className="text-xs text-brand-500 hover:text-brand-700 font-medium">Edit</button>
                        <button onClick={() => setDeleteTarget(c)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
