"use client";

import { useState, useEffect } from "react";

interface Invite {
  id: string;
  token: string;
  label: string | null;
  type: "LIBRARY" | "DIRECT";
  allowedSections: string | null;
  ratingKey: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
  _count: { sessions: number };
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvite, setNewInvite] = useState({
    pin: "",
    label: "",
    type: "LIBRARY" as "LIBRARY" | "DIRECT",
    allowedSections: "",
    ratingKey: "",
    maxUses: "",
    expiresAt: "",
  });
  const [createdUrl, setCreatedUrl] = useState<{ url: string; pin: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthenticated(true);
      loadInvites();
    } else {
      setLoginError("Invalid password");
    }
  };

  const loadInvites = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/invites");
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    const data = await res.json();
    setInvites(data);
    setLoading(false);
  };

  useEffect(() => {
    // Check if already authenticated
    fetch("/api/admin/invites").then((res) => {
      if (res.ok) {
        setAuthenticated(true);
        res.json().then(setInvites);
      }
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newInvite),
    });
    const data = await res.json();
    if (res.ok) {
      setCreatedUrl({ url: data.url, pin: data.pin });
      setShowCreate(false);
      setNewInvite({ pin: "", label: "", type: "LIBRARY", allowedSections: "", ratingKey: "", maxUses: "", expiresAt: "" });
      loadInvites();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch("/api/admin/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    loadInvites();
  };

  const deleteInvite = async (id: string) => {
    if (!confirm("Delete this invite?")) return;
    await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadInvites();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Sharerr Admin
          </h1>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-purple-500 outline-none"
          />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Sharerr Admin
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
        >
          + New Invite
        </button>
      </div>

      {/* Created invite notification */}
      {createdUrl && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <p className="text-green-400 font-medium mb-2">Invite created!</p>
          <p className="text-sm text-zinc-300 break-all">
            URL: <code className="bg-zinc-800 px-2 py-0.5 rounded">{createdUrl.url}</code>
          </p>
          <p className="text-sm text-zinc-300 mt-1">
            PIN: <code className="bg-zinc-800 px-2 py-0.5 rounded">{createdUrl.pin}</code>
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${createdUrl.url}\nPIN: ${createdUrl.pin}`);
            }}
            className="mt-2 text-xs text-purple-400 hover:text-purple-300"
          >
            Copy to clipboard
          </button>
          <button onClick={() => setCreatedUrl(null)} className="ml-4 text-xs text-zinc-500 hover:text-zinc-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-lg font-medium mb-4">Create Invite</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">PIN (min 4 digits)</label>
              <input
                type="text"
                inputMode="numeric"
                value={newInvite.pin}
                onChange={(e) => setNewInvite({ ...newInvite, pin: e.target.value.replace(/\D/g, "") })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
                required
                minLength={4}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Label (optional)</label>
              <input
                type="text"
                placeholder="e.g. Dad's link"
                value={newInvite.label}
                onChange={(e) => setNewInvite({ ...newInvite, label: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Type</label>
              <select
                value={newInvite.type}
                onChange={(e) => setNewInvite({ ...newInvite, type: e.target.value as "LIBRARY" | "DIRECT" })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
              >
                <option value="LIBRARY">Library Browse</option>
                <option value="DIRECT">Direct to Item</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Max Uses (empty = unlimited)</label>
              <input
                type="number"
                value={newInvite.maxUses}
                onChange={(e) => setNewInvite({ ...newInvite, maxUses: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
              />
            </div>
            {newInvite.type === "DIRECT" && (
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Plex Rating Key</label>
                <input
                  type="text"
                  value={newInvite.ratingKey}
                  onChange={(e) => setNewInvite({ ...newInvite, ratingKey: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Allowed Sections (comma-separated IDs)</label>
              <input
                type="text"
                placeholder="e.g. 1,2"
                value={newInvite.allowedSections}
                onChange={(e) => setNewInvite({ ...newInvite, allowedSections: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={newInvite.expiresAt}
                onChange={(e) => setNewInvite({ ...newInvite, expiresAt: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm outline-none focus:border-purple-500"
              />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invites table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="text-left py-3 px-4">Label</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Uses</th>
                <th className="text-left py-3 px-4">Sessions</th>
                <th className="text-left py-3 px-4">Expires</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{invite.label || "Untitled"}</p>
                      <p className="text-xs text-zinc-500 font-mono">{invite.token.slice(0, 12)}...</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${invite.type === "DIRECT" ? "bg-blue-900/50 text-blue-400" : "bg-purple-900/50 text-purple-400"}`}>
                      {invite.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {invite.useCount}{invite.maxUses ? `/${invite.maxUses}` : ""}
                  </td>
                  <td className="py-3 px-4">{invite._count.sessions}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${invite.active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                      {invite.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          navigator.clipboard.writeText(`${baseUrl}/invite/${invite.token}`);
                        }}
                        className="text-xs text-zinc-400 hover:text-white transition-colors"
                        title="Copy link"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => toggleActive(invite.id, invite.active)}
                        className="text-xs text-zinc-400 hover:text-yellow-400 transition-colors"
                      >
                        {invite.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => deleteInvite(invite.id)}
                        className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No invites yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
