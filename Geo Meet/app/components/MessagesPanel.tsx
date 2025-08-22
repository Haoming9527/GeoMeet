"use client";

import { useEffect, useState } from "react";
import { Button } from "./DemoComponents";
import { apiGet, apiPut } from "@/lib/api";

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (userId: string) => void;
  currentUserId?: string;
}

type Meetup = {
  id: string;
  participants: string[];
  type: string;
  start_time: string;
  status: string;
  feedback: Record<string, string>;
};

type Profile = {
  id: string;
  name?: string;
  role?: string;
  industry?: string;
  food_preference?: string;
  lat?: number;
  lng?: number;
};

export function MessagesPanel({
  isOpen,
  onClose,
  onOpenChat,
  currentUserId,
}: MessagesPanelProps) {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  // Feedback removed

  useEffect(() => {
    if (isOpen && currentUserId) {
      loadMessages();
    }
  }, [isOpen, currentUserId]);

  const loadMessages = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const data = await apiGet<Meetup[]>(
        `/api/meetup?userId=${currentUserId}`,
      );
      setMeetups(data || []);

      // Load other participant profiles for display
      const ids = Array.from(
        new Set(
          (data || [])
            .map((m) => m.participants.find((p) => p !== currentUserId))
            .filter(Boolean) as string[],
        ),
      );
      const profileMap: Record<string, Profile> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const p = await apiGet<Profile>(`/api/profile?id=${id}`);
            profileMap[id] = p;
          } catch {}
        }),
      );
      setProfiles(profileMap);
    } catch (e) {
      console.error("Failed to load meetups", e);
      setMeetups([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-60">
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-sm bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] shadow-2xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-[var(--app-card-border)] flex-shrink-0">
            <h3 className="text-lg font-semibold">Messages</h3>
            <button
              onClick={onClose}
              className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-4 text-center text-[var(--app-foreground-muted)]">
                Loading messages...
              </div>
            ) : meetups.length === 0 ? (
              <div className="p-4 text-center text-[var(--app-foreground-muted)]">
                No invites yet
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {meetups.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 hover:bg-[var(--app-card-border)] rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className={`text-xs font-medium ${m.status === "ongoing" ? "text-green-500" : m.status === "declined" ? "text-red-500" : "text-[var(--app-foreground)]"}`}
                      >
                        {m.status.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const other = m.participants.find(
                            (p) => p !== currentUserId,
                          );
                          const prof = other ? profiles[other] : undefined;
                          return (
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium truncate">
                                {prof?.name || other}
                              </div>
                              <div className="text-xs text-[var(--app-foreground-muted)] truncate">
                                {[prof?.role, prof?.industry]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </div>
                              {prof?.food_preference && (
                                <div className="text-[10px] text-[var(--app-foreground-muted)] truncate">
                                  Food: {prof.food_preference}
                                </div>
                              )}
                              <div className="text-[10px] text-[var(--app-foreground-muted)]">
                                {new Date(m.start_time).toLocaleString()} •{" "}
                                {m.type === "lunch" ? "Lunch" : "After-office"}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status === "pending" &&
                        (() => {
                          const me = String(currentUserId ?? "");
                          const meLower = me.toLowerCase();
                          const inviterLower = (
                            m.participants?.[0] ?? ""
                          ).toLowerCase();
                          const otherRaw =
                            m.participants.find((p) => p !== currentUserId) ??
                            "";
                          const otherLower = otherRaw.toLowerCase();
                          const myState = (m.feedback?.[me] ||
                            m.feedback?.[meLower]) as string | undefined;
                          const otherState = (m.feedback?.[otherRaw] ||
                            m.feedback?.[otherLower]) as string | undefined;
                          const isInviter = inviterLower === meLower;

                          if (isInviter) {
                            // Inviter: can revoke only before invitee accepts
                            if (otherState === "accepted") {
                              return (
                                <span className="text-xs text-[var(--app-foreground-muted)]">
                                  Waiting for other user…
                                </span>
                              );
                            }
                            return (
                              <button
                                className="px-2 py-1 text-xs border rounded-md"
                                onClick={async () => {
                                  await apiPut("/api/meetup", {
                                    meetupId: m.id,
                                    userId: currentUserId,
                                    action: "decline",
                                  });
                                  await loadMessages();
                                }}
                              >
                                Revoke
                              </button>
                            );
                          }

                          // Invitee: Accept / Decline if not already acted
                          if (myState === "accepted") {
                            return (
                              <span className="text-xs text-[var(--app-foreground-muted)]">
                                Waiting for other user…
                              </span>
                            );
                          }
                          if (myState === "declined") {
                            return (
                              <span className="text-xs text-red-500">
                                You declined
                              </span>
                            );
                          }
                          return (
                            <>
                              <button
                                className="px-2 py-1 text-xs border rounded-md"
                                onClick={async () => {
                                  await apiPut("/api/meetup", {
                                    meetupId: m.id,
                                    userId: currentUserId,
                                    action: "accept",
                                  });
                                  await loadMessages();
                                }}
                              >
                                Accept
                              </button>
                              <button
                                className="px-2 py-1 text-xs border rounded-md"
                                onClick={async () => {
                                  await apiPut("/api/meetup", {
                                    meetupId: m.id,
                                    userId: currentUserId,
                                    action: "decline",
                                  });
                                  await loadMessages();
                                }}
                              >
                                Decline
                              </button>
                            </>
                          );
                        })()}
                      {m.status === "ongoing" && (
                        <button
                          className="px-2 py-1 text-xs border rounded-md"
                          onClick={async () => {
                            await apiPut("/api/meetup", {
                              meetupId: m.id,
                              userId: currentUserId,
                              action: "complete",
                            });
                            await loadMessages();
                          }}
                        >
                          Complete
                        </button>
                      )}
                      {/* Feedback removed */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
