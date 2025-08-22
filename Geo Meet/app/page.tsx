"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
// Removed DemoComponents Home/Features in favor of GeoMeet UI
import { GeoMap } from "./components/GeoMap";
import { MessagesPanel } from "./components/MessagesPanel";
import { sortByNearest } from "@/lib/geo";
import { apiGet, apiPost, apiPut, setCurrentUserAddress } from "@/lib/api";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const { address, status } = useAccount();

  const [availability, setAvailability] = useState<
    "lunch" | "after-office" | "unavailable"
  >("lunch");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [matches, setMatches] = useState<any[]>([]);
  const [lastMeetupId, setLastMeetupId] = useState<string | null>(null);
  const [pendingInviteUserIds, setPendingInviteUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [profileDraft, setProfileDraft] = useState<{
    name: string;
    industry?: string;
    role?: string;
    foodPreference?: string;
  }>({ name: "" });
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [hasPendingInvites, setHasPendingInvites] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [geoPermission, setGeoPermission] = useState<
    "granted" | "denied" | "prompt" | null
  >(null);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(async () => {
      if (!isSearchOpen) return;
      if (!searchQ.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await apiGet<any[]>(
          `/api/search?q=${encodeURIComponent(searchQ)}`,
        );
        setSearchResults(data);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [isSearchOpen, searchQ]);

  // Prefill inline profile panel when opened
  useEffect(() => {
    const loadProfile = async () => {
      if (!isProfileOpen || !address) return;
      try {
        const data = await apiGet<any>(`/api/profile?id=${address}`);
        setProfileDraft({
          name: data?.name ?? "",
          industry: data?.industry ?? "",
          role: data?.role ?? "",
          foodPreference: data?.food_preference ?? "",
        });
      } catch {
        // ignore - new user
      }
    };
    loadProfile();
  }, [isProfileOpen, address]);

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const requestLocation = useCallback(() => {
    if (!navigator?.geolocation || !address) return;
    if (geoPermission === "denied") {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoDenied(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        try {
          await apiPost("/api/profile", {
            id: address,
            availability,
            lat,
            lng,
          });
          try {
            const existing = await apiGet<any>(`/api/profile?id=${address}`);
            if (!existing?.name) setShowProfilePrompt(true);
          } catch {}
        } catch (e) {
          console.error("Profile upsert failed", e);
        }
      },
      (err) => {
        if ((err as GeolocationPositionError)?.code === 1) {
          setGeoDenied(true);
        }
        setCoords(null);
        console.warn("Geolocation error", err);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [address, availability, geoPermission]);

  // On wallet connect, capture geolocation and upsert a minimal profile
  useEffect(() => {
    if (status !== "connected" || !address) return;
    setCurrentUserAddress(address);
    requestLocation();
  }, [status, address, requestLocation]);

  // Track geolocation permission changes (when supported)
  useEffect(() => {
    let ps: PermissionStatus | null = null;
    const setup = async () => {
      try {
        const anyNav: any = navigator as any;
        const p: PermissionStatus | undefined = await anyNav.permissions?.query(
          { name: "geolocation" as PermissionName },
        );
        if (p) {
          ps = p;
          setGeoPermission(p.state as any);
          p.onchange = () => setGeoPermission(p.state as any);
        }
      } catch {
        // ignore
      }
    };
    setup();
    return () => {
      if (ps) ps.onchange = null;
    };
  }, []);

  const findNearby = useCallback(async () => {
    try {
      if (!coords || availability === "unavailable") {
        setMatches([]);
        return;
      }
      const lat = coords.lat;
      const lng = coords.lng;
      const list = await apiGet<any[]>(
        `/api/match?lat=${lat}&lng=${lng}&type=${availability}`,
      );
      // Exclude self
      setMatches(list.filter((u) => u.id !== address));
    } catch (e) {
      console.error("Find nearby failed", e);
    }
  }, [coords, availability, address]);

  // Auto-load nearby when coords or availability changes
  useEffect(() => {
    if (!coords) return;
    findNearby();
  }, [coords, availability, findNearby]);

  const createMeetup = useCallback(
    async (otherId: string) => {
      if (!address) return;
      try {
        const resp = await apiPost<any>("/api/meetup", {
          participants: [address, otherId],
          type: availability,
        });
        setLastMeetupId(resp.id);
        setPendingInviteUserIds((prev) => new Set(prev).add(otherId));
      } catch (e) {
        console.error("Create meetup failed", e);
      }
    },
    [address, availability],
  );

  const submitFeedback = useCallback(
    async (satisfied: boolean) => {
      if (!address || !lastMeetupId) return;
      try {
        await apiPut("/api/meetup", {
          meetupId: lastMeetupId,
          userId: address,
          feedback: satisfied ? "👍" : "👎",
        });
        console.log("Feedback submitted");
      } catch (e) {
        console.error("Feedback failed", e);
      }
    },
    [address, lastMeetupId],
  );

  const handleOpenChat = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  // Load invites to control red dot
  useEffect(() => {
    const loadInvites = async () => {
      if (!address) return;
      try {
        const data = await apiGet<any[]>(`/api/meetup?userId=${address}`);
        const pending = (data || []).some((m: any) => m.status === "pending");
        setHasPendingInvites(pending);
      } catch (e) {
        // ignore
      }
    };
    loadInvites();
  }, [address]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  const formatAvailability = useCallback((val?: string | null) => {
    if (!val) return "Unavailable";
    switch (val) {
      case "lunch":
        return "Lunch";
      case "after-office":
        return "After-office";
      case "unavailable":
        return "Unavailable";
      default:
        return val;
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-[3000]">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveFrameButton}
            {address && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSearchOpen(true)}
                >
                  Search
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsMessagesOpen(true);
                      // mark as seen when opened
                      setHasPendingInvites(false);
                    }}
                  >
                    Messages
                  </Button>
                  {hasPendingInvites && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileOpen(true)}
                >
                  Profile
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1">
          {/* If not logged in, show marketing and prompt to connect */}
          {!address && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-[var(--app-card-border)]">
                <h2 className="text-lg font-semibold mb-1">Map Location</h2>
                <p className="text-sm text-[var(--app-foreground-muted)]">
                  Discover nearby professionals for lunch or after-office
                  meetups in industrial areas. Trade virtual namecards and share
                  feedback — built on Base with MiniKit.
                </p>
                <div className="mt-3">
                  <Wallet className="z-10">
                    <ConnectWallet>
                      <Name className="text-inherit" />
                    </ConnectWallet>
                  </Wallet>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden border border-[var(--app-card-border)]">
                <img
                  src="/screenshot.png"
                  alt="GeoMeet preview"
                  className="w-full"
                />
              </div>
              {/* Search bar is hidden until login */}
            </div>
          )}

          {/* Demo tabs removed to dedicate space to map and matches */}

          {/* GeoMeet Core UI: only when logged in */}
          {address && (
            <div className="space-y-3">
              {/* Search overlay like Explore Features */}
              {isSearchOpen && (
                <div className="animate-fade-in p-4 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Search</h3>
                    <button
                      className="text-sm underline"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQ("");
                        setSearchResults([]);
                      }}
                    >
                      Close
                    </button>
                  </div>
                  <input
                    className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
                    placeholder="Search by name, industry, role, or address"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    autoFocus
                  />
                  {searching && (
                    <div className="text-xs text-[var(--app-foreground-muted)] mt-2">
                      Searching…
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className="p-2 rounded-lg border border-[var(--app-card-border)]"
                      >
                        <div className="text-xs font-mono break-all">
                          {u.name ?? u.id}
                        </div>
                        {u.industry && (
                          <div className="text-[10px] text-[var(--app-foreground-muted)]">
                            {u.industry}
                          </div>
                        )}
                        <div className="text-[10px] text-[var(--app-foreground-muted)]">
                          Availability: {formatAvailability(u.availability)}
                        </div>
                      </div>
                    ))}
                    {!searching &&
                      searchResults.length === 0 &&
                      searchQ.trim() && (
                        <div className="text-xs text-[var(--app-foreground-muted)]">
                          No results
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Inline Profile panel - pops in like demo Explore Features */}
              {isProfileOpen && (
                <div className="animate-fade-in p-4 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Profile</h3>
                    <button
                      className="text-sm underline"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
                      placeholder="Name"
                      value={profileDraft.name}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                    <input
                      className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
                      placeholder="Industry"
                      value={profileDraft.industry ?? ""}
                      onChange={(e) =>
                        setProfileDraft((p) => ({
                          ...p,
                          industry: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
                      placeholder="Role"
                      value={profileDraft.role ?? ""}
                      onChange={(e) =>
                        setProfileDraft((p) => ({ ...p, role: e.target.value }))
                      }
                    />
                    <input
                      className="px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg"
                      placeholder="Food preference"
                      value={profileDraft.foodPreference ?? ""}
                      onChange={(e) =>
                        setProfileDraft((p) => ({
                          ...p,
                          foodPreference: e.target.value,
                        }))
                      }
                    />
                    {/* Availability controls not needed inside panel */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!address) return;
                          try {
                            await apiPost("/api/profile", {
                              id: address,
                              name: profileDraft.name,
                              industry: profileDraft.industry,
                              role: profileDraft.role,
                              food_preference: profileDraft.foodPreference,
                              availability,
                              lat: coords?.lat,
                              lng: coords?.lng,
                            });
                            setShowProfilePrompt(false);
                            setIsProfileOpen(false);
                          } catch (e) {
                            console.error("Save profile failed", e);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <h2 className="text-lg font-semibold">Map Location</h2>
              {/* Inline profile prompt removed; use Profile page instead */}
              {address && showProfilePrompt && (
                <div className="p-3 rounded-lg border border-[var(--app-card-border)]">
                  <div className="text-sm mb-2">
                    Complete your profile to get better matches.
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsProfileOpen(true)}
                  >
                    Complete Profile
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowProfilePrompt(false)}
                  >
                    Skip for now
                  </Button>
                </div>
              )}

              {/* Map */}
              <div className="mt-6">
                {geoDenied ? (
                  <div className="p-3 rounded-lg border border-[var(--app-card-border)]">
                    <div className="text-sm mb-2">
                      Location permission is required for Map Location and Find
                      nearby.
                    </div>
                    <div className="text-xs text-[var(--app-foreground-muted)] mb-2">
                      Please enable location for this site in your browser
                      settings and try again. If you previously clicked "Don't
                      allow", reset the permission and reload.
                    </div>
                    {/* Retry and Reload removed per request. */}
                  </div>
                ) : (
                  <GeoMap
                    center={coords}
                    nearby={matches.map((m) => ({
                      id: m.id,
                      lat: m.lat,
                      lng: m.lng,
                    }))}
                  />
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm">Availability:</span>
                <Button
                  variant={availability === "lunch" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setAvailability("lunch")}
                >
                  Lunch
                </Button>
                <Button
                  variant={
                    availability === "after-office" ? "primary" : "outline"
                  }
                  size="sm"
                  onClick={() => setAvailability("after-office")}
                >
                  After-office
                </Button>
                <Button
                  variant={
                    availability === "unavailable" ? "primary" : "outline"
                  }
                  size="sm"
                  onClick={() => setAvailability("unavailable")}
                >
                  Unavailable
                </Button>
                {/* Find nearby button removed; list loads automatically */}
              </div>

              {/* Nearby list sorted by nearest */}
              <h2 className="text-lg font-semibold mt-2">Nearby Users</h2>
              {matches.length > 0 ? (
                <div className="space-y-2">
                  {sortByNearest(coords, matches).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm p-2 rounded-lg border border-[var(--app-card-border)]"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-xs break-all">
                          {m.name ?? m.id}
                        </span>
                        {m.industry && (
                          <span className="text-[var(--app-foreground-muted)] text-xs">
                            {m.industry}
                          </span>
                        )}
                        <span className="text-[var(--app-foreground-muted)] text-xs">
                          Availability: {formatAvailability(m.availability)}
                        </span>
                        {typeof m.distanceMeters === "number" && (
                          <span className="text-[var(--app-foreground-muted)] text-xs">
                            {(m.distanceMeters / 1000).toFixed(2)} km away
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={
                            pendingInviteUserIds.has(m.id)
                              ? "secondary"
                              : "outline"
                          }
                          onClick={async () => {
                            if (pendingInviteUserIds.has(m.id)) return;
                            await createMeetup(m.id);
                          }}
                          disabled={pendingInviteUserIds.has(m.id)}
                        >
                          {pendingInviteUserIds.has(m.id)
                            ? "Pending"
                            : "Invite"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--app-foreground-muted)]">
                  No nearby users.
                </div>
              )}
            </div>
          )}
        </main>

        {/* Slide-over panels removed per request */}

        {/* Demo section at bottom for reference */}
        <div className="mt-6">
          <Home setActiveTab={() => {}} />
        </div>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            Built on Base with MiniKit
          </Button>
        </footer>
      </div>

      {/* Messages panel */}
      <MessagesPanel
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        onOpenChat={handleOpenChat}
        currentUserId={address}
      />
    </div>
  );
}
