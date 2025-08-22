"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { apiGet, apiPost } from "@/lib/api";

export default function ProfilePage() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    industry: "",
    role: "",
    food_preference: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!address) return;
      try {
        const data = await apiGet<{
          name?: string;
          industry?: string;
          role?: string;
          food_preference?: string;
        }>(`/api/profile?id=${address}`);
        setDraft({
          name: data?.name ?? "",
          industry: data?.industry ?? "",
          role: data?.role ?? "",
          food_preference: data?.food_preference ?? "",
        });
      } catch (e) {
        // ignore, user may be new
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  const save = async () => {
    if (!address) return;
    if (!draft.name.trim()) {
      alert("Name is required");
      return;
    }
    setSaving(true);
    try {
      await apiPost(`/api/profile`, { id: address, ...draft });
      alert("Profile saved");
    } catch {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!address)
    return <div className="p-4">Connect wallet to edit profile.</div>;
  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 space-y-3">
      <h2 className="text-lg font-semibold">Profile</h2>

      <div className="grid grid-cols-1 gap-3">
        <input
          className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
        />
        <input
          className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
          placeholder="Industry"
          value={draft.industry}
          onChange={(e) =>
            setDraft((p) => ({ ...p, industry: e.target.value }))
          }
        />
        <input
          className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
          placeholder="Role"
          value={draft.role}
          onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))}
        />
        <input
          className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
          placeholder="Food preference"
          value={draft.food_preference}
          onChange={(e) =>
            setDraft((p) => ({ ...p, food_preference: e.target.value }))
          }
        />

        {/* Availability controls removed from profile per request */}
      </div>

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-lg border"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
