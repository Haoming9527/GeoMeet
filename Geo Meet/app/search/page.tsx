"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await apiGet<any[]>(
          `/api/search?q=${encodeURIComponent(q)}`,
        );
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Search</h2>
        <button className="text-sm underline" onClick={() => router.back()}>
          Back
        </button>
      </div>

      <input
        className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
        placeholder="Search by name, industry, role, or address"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />

      {loading && (
        <div className="text-xs text-[var(--app-foreground-muted)]">
          Searching…
        </div>
      )}
      <div className="space-y-2">
        {results.map((u) => (
          <div
            key={u.id}
            className="p-2 rounded-lg border border-[var(--app-card-border)]"
          >
            <div className="text-xs font-mono break-all">{u.name ?? u.id}</div>
            {u.industry && (
              <div className="text-[10px] text-[var(--app-foreground-muted)]">
                {u.industry}
              </div>
            )}
            {u.availability && (
              <div className="text-[10px] text-[var(--app-foreground-muted)]">
                Availability: {u.availability}
              </div>
            )}
          </div>
        ))}
        {!loading && results.length === 0 && q.trim() !== "" && (
          <div className="text-xs text-[var(--app-foreground-muted)]">
            No results
          </div>
        )}
      </div>
    </div>
  );
}




