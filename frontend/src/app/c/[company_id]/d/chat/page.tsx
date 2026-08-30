"use client";

import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import React, { useState, useEffect, useRef } from "react";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";
import Icon from "@/components/marketing/Icon";

import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface ChatGroup {
  id: string;
  name: string;
  group_type: string;
  created_at: string;
  member_count: number;
}

interface ChatMessage {
  id: string;
  user_name?: string;
  message_text?: string;
  image_urls?: string[];
  is_mom: boolean;
  mom_date?: string;
  created_at: string;
}

interface ChatMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  name?: string; // Resolved real name returned by the backend
}

export default function ChatPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  useEffect(() => {
    if (!companyId || companyId === "e0000000-0000-0000-0000-000000000000") {
      if (typeof window !== "undefined") window.location.replace("/login");
    }
  }, [companyId]);

  // State managers
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  
  // Modals / Drawer views
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Tab within members modal
  const [membersTab, setMembersTab] = useState<"about" | "members">("members");
  
  // Search & input fields
  const [searchGroupQuery, setSearchGroupQuery] = useState("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isMom, setIsMom] = useState(false);
  const [momDate, setMomDate] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("member");
  const [memberForm, setMemberForm] = useState({ user_id: "", role: "member" });
  const [teamOptions, setTeamOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [showMobileList, setShowMobileList] = useState(true);
  
  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Group Details Inputs (for creation)
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState("site");

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${projectId}`, { headers: authHeaders() });
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error("Failed to load groups", e);
    }
  };

  const fetchMessages = async (groupId: string, sinceId?: string) => {
    try {
      const url = `${getApiHost()}/apis/v3/chat/messages/${groupId}`;
      const query = sinceId ? `?since_id=${sinceId}` : "?limit=200";
      const res = await fetch(`${url}${query}`, { headers: authHeaders() });
      if (res.ok) {
        const fresh: ChatMessage[] = await res.json();
        setMessages((prev) => {
          if (!sinceId) return fresh;
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...fresh.filter((m) => !seen.has(m.id))];
        });
        if (fresh.length > 0) {
          lastMessageIdRef.current = fresh[fresh.length - 1].id;
        }
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  const fetchTeamOptions = async () => {
    if (!companyId || companyId === "e0000000-0000-0000-0000-000000000000") return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/crm/team-members/${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTeamOptions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load team", e);
    }
  };

  const fetchMembers = async (groupId: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${groupId}/members`, { headers: authHeaders() });
      if (res.ok) {
        const rawMembers = await res.json();
        // Use the real name resolved by the backend. Fall back to a neutral
        // label (never a person's name) only if a name is somehow missing.
        const resolved = rawMembers.map((m: ChatMember) => ({
          ...m,
          name: m.name || `User ${m.user_id.slice(0, 5)}`
        }));
        setMembers(resolved);

        // Resolve current user's role! A missing stored user id simply means
        // the default "member" role; no sentinel id is ever substituted.
        const currentLoggedUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
        const currentMember = currentLoggedUserId
          ? rawMembers.find((m: ChatMember) => m.user_id === currentLoggedUserId)
          : undefined;
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        } else {
          setCurrentUserRole("member");
        }
      }
    } catch (e) {
      console.error("Failed to load members", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchGroups();
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeamOptions();
  }, [companyId]);

  useEffect(() => {
    if (!activeGroup) return;
    lastMessageIdRef.current = null;
    let interval: NodeJS.Timeout;
    
    fetchMessages(activeGroup.id);
    fetchMembers(activeGroup.id);
    
    interval = setInterval(() => {
      fetchMessages(activeGroup.id, lastMessageIdRef.current || undefined);
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [activeGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        // R2-270: created_by references company_team.id, not users.id - it is
        // resolved server-side from the authenticated session, so the client
        // must not send an id of the wrong kind.
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          name: newGroupName,
          group_type: newGroupType,
        }),
      });
      if (res.ok) {
        setNewGroupName("");
        setShowGroupModal(false);
        fetchGroups();
      }
    } catch (e) {
      console.error("Failed to create group", e);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !memberForm.user_id.trim()) return;

    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${activeGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          group_id: activeGroup.id,
          user_id: memberForm.user_id,
          role: memberForm.role,
        }),
      });
      if (res.ok) {
        setShowAddMemberModal(false);
        setMemberForm({ user_id: "", role: "member" });
        fetchMembers(activeGroup.id);
      }
    } catch (e) {
      console.error("Failed to add member", e);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeGroup) return;
    if (!confirm("Are you sure you want to remove this member from the group?")) return;

    try {
      const res = await fetch(
        `${getApiHost()}/apis/v3/chat/groups/${activeGroup.id}/members/${userId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.ok) {
        fetchMembers(activeGroup.id);
      }
    } catch (e) {
      console.error("Failed to remove member", e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const imageUrls = imageUrl
      ? imageUrl.split(",").map((s) => s.trim()).filter(Boolean).filter((u) => /^https?:\/\//i.test(u))
      : [];
    if (!activeGroup || (!messageText.trim() && imageUrls.length === 0)) return;

    try {
      const body: Record<string, unknown> = {
        group_id: activeGroup.id,
        message_text: messageText || null,
        is_mom: isMom,
        mom_date: isMom ? new Date(momDate).toISOString() : null,
        image_urls: imageUrls,
      };
      const res = await fetch(`${getApiHost()}/apis/v3/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessageText("");
        setImageUrl("");
        setIsMom(false);
        setMomDate("");
        fetchMessages(activeGroup.id);
      }
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    if (!confirm(`Are you sure you want to delete the group "${activeGroup.name}"?`)) return;

    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${activeGroup.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        setActiveGroup(null);
        setShowDropdown(false);
        fetchGroups();
      } else {
        const err = await res.json().catch(() => null);
        console.error("Failed to delete group", err?.detail || res.status);
      }
    } catch (e) {
      console.error("Failed to delete group", e);
    }
  };

  // Filters
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchGroupQuery.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    (m.name || m.user_id).toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  // Helper avatar colors
  const getAvatarColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "site":
        return "bg-success text-white";
      case "finance":
        return "bg-chart-4 text-white";
      case "safety":
        return "bg-warning text-white";
      default:
        return "bg-info text-white";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background text-foreground overflow-hidden font-sans">
      <PageHeader
        title="Team Chat"
        subtitle="Internal project discussions and channel messaging"
      />
      <div className="flex flex-1 overflow-hidden h-full">
        
        {/* Left Column: Recent Chats Sidebar */}
        <div className={`${showMobileList ? "flex" : "hidden"} md:flex w-full md:w-72 bg-card border-r border-border-custom flex-col shrink-0`}>
          <div className="p-4 border-b border-border-custom flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Chats</h2>
            <button
              onClick={() => setShowGroupModal(true)}
              className="h-7 w-7 flex items-center justify-center bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
              title="Create Chat Group"
            >
              +
            </button>
          </div>

          {/* Group Search */}
          <div className="p-3 border-b border-border-custom/50">
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchGroupQuery}
                onChange={(e) => setSearchGroupQuery(e.target.value)}
                className="w-full bg-elevated/40 border border-border-custom rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-all"
              />
              <Icon name="search" className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted pointer-events-none select-none" />
            </div>
          </div>

          {/* Group List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroup(g);
                    setCurrentUserRole("member");
                    setShowMobileList(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    activeGroup?.id === g.id
                      ? "bg-elevated text-foreground font-semibold shadow-xs [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4)]"
                      : "hover:bg-elevated/50 text-muted hover:text-foreground"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(g.group_type)}`}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-foreground truncate">{g.name}</div>
                    <div className="text-[10px] text-muted capitalize truncate">
                      {g.group_type} • {g.member_count} member{g.member_count !== 1 && "s"}
                    </div>
                  </div>
                </button>
              ))
            ) : projectId ? (
              <EmptyState
                title="No chats found"
                description="Start a conversation with project members or subconsultants."
                className="py-8"
              />
            ) : (
              <div className="text-center py-8 px-3 text-xs text-muted leading-relaxed">
                No active project selected. Pick a project from the "Pinned Projects" dropdown in the sidebar to view its chats.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className={`${showMobileList ? "hidden" : "flex"} md:flex flex-1 flex-col bg-elevated/5 relative overflow-hidden`}>
          {activeGroup ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-border-custom bg-card flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden h-8 w-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-elevated text-muted hover:text-foreground transition-all cursor-pointer"
                    title="Back to chats"
                  >
                    <span className="text-base leading-none">&#8592;</span>
                  </button>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(activeGroup.group_type)}`}>
                    {activeGroup.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-foreground leading-tight">{activeGroup.name}</h2>
                    <p className="text-[10px] text-muted capitalize">
                      {activeGroup.group_type} • {activeGroup.member_count} member{activeGroup.member_count !== 1 && "s"}
                    </p>
                  </div>
                </div>

                {/* Right Header Toolbar */}
                <div className="flex items-center gap-3">
                  {/* User avatars summary */}
                  <div
                    onClick={() => {
                      setMembersTab("members");
                      setShowMembersModal(true);
                    }}
                    className="flex -space-x-1.5 overflow-hidden cursor-pointer hover:opacity-85 transition-opacity"
                    title="View Members"
                  >
                    {members.slice(0, 3).map((m, idx) => (
                      <div
                        key={m.id}
                        className={`h-6 w-6 rounded-full border border-card flex items-center justify-center text-[9px] font-bold ${
                          idx === 0 ? "bg-primary text-white" : idx === 1 ? "bg-chart-4 text-white" : "bg-success text-white"
                        }`}
                      >
                        {(m.name || m.user_id).charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {members.length > 3 && (
                      <div className="h-6 w-6 rounded-full border border-card bg-elevated flex items-center justify-center text-[9px] font-bold text-muted">
                        +{members.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Add Member Button */}
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all text-xs font-bold cursor-pointer"
                    title="Add Member"
                  >
                    +
                  </button>

                  {/* Settings Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-elevated text-muted hover:text-foreground transition-all text-xs font-bold cursor-pointer"
                    >
                      •••
                    </button>
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                        <div className="absolute right-0 mt-1.5 w-40 bg-card border border-border-custom rounded-lg shadow-lg py-1 z-20">
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setMembersTab("about");
                              setShowMembersModal(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-elevated text-foreground"
                          >
                            About Group
                          </button>
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setMembersTab("members");
                              setShowMembersModal(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-elevated text-foreground"
                          >
                            Manage Members
                          </button>
                          <hr className="border-border-custom/50 my-1" />
                          <button
                            onClick={handleDeleteGroup}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-danger/10 text-danger font-bold"
                          >
                            Delete Group
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Message list panel */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <Icon name="chat_bubble" className="w-10 h-10 text-muted/30" />
                    <h3 className="text-xs font-bold text-muted">No messages yet</h3>
                    <p className="text-[10px] text-muted max-w-xs leading-relaxed">
                      This is the beginning of the chat group. Send a text, an attachment, or log a Minutes of Meeting (MOM).
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSystemMom = msg.is_mom;
                    return (
                      <div key={msg.id} className={`flex ${isSystemMom ? "justify-center" : "justify-start"}`}>
                        <div
                          className={`max-w-lg rounded-2xl p-4 shadow-sm border transition-all ${
                            isSystemMom
                              ? "bg-primary/5 border-primary/20 text-center w-full max-w-md rounded-xl"
                              : "bg-card border-border-custom"
                          }`}
                        >
                          {/* MOM Badge */}
                          {isSystemMom && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-wider mb-2.5">
                              <Icon name="bolt" className="w-3 h-3" /> Minutes of Meeting
                            </div>
                          )}

                          {/* Sender details */}
                          {!isSystemMom && (msg.user_name || "—") && (
                            <div className="text-[10px] font-bold text-primary mb-1">{msg.user_name || "—"}</div>
                          )}

                          {/* Message Body */}
                          {msg.message_text && (
                            <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {msg.message_text}
                            </div>
                          )}

                          {/* Image attachments */}
                          {msg.image_urls && msg.image_urls.filter((u) => /^https?:\/\//i.test(u)).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2.5">
                              {msg.image_urls.filter((u) => /^https?:\/\//i.test(u)).map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt="Attachment"
                                  className="rounded-lg max-h-48 object-cover border border-border-custom/50 hover:opacity-90 cursor-zoom-in transition-opacity"
                                />
                              ))}
                            </div>
                          )}

                          {/* MOM Date details */}
                          {msg.mom_date && (
                            <div className="text-[10px] text-muted mt-2 font-medium flex items-center justify-center gap-1">
                              <Icon name="calendar" className="w-3 h-3" /> MOM Date: {new Date(msg.mom_date).toLocaleDateString()}
                            </div>
                          )}

                          {/* Timestamp info */}
                          <div className="text-[9px] text-muted/70 mt-1.5 text-right font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input controls */}
              <div className="p-4 border-t border-border-custom bg-card shrink-0">
                {currentUserRole === "viewer" ? (
                  <div className="flex items-center justify-center p-3.5 bg-elevated/20 border border-dashed border-border-custom rounded-xl">
                    <span className="text-[11px] text-muted font-bold flex items-center gap-1.5 select-none">
                      <Icon name="lock" className="w-3.5 h-3.5" /> Read-Only Access (You are a group viewer and cannot send messages)
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div className="flex flex-col gap-2">
                      
                      {/* Top inputs row */}
                      <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2">
                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Enter Message..."
                          className="flex-1 min-w-0 md:min-w-[200px] bg-elevated/35 border border-border-custom rounded-lg px-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-all"
                        />
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="Image URL (optional)"
                          className="w-full md:w-44 bg-elevated/35 border border-border-custom rounded-lg px-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-all"
                        />
                      </div>

                      {/* Bottom controls row (MOM toggle & Send) */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isMom}
                              onChange={(e) => setIsMom(e.target.checked)}
                              className="rounded border-border-custom text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className="text-[11px] font-bold text-muted hover:text-foreground transition-colors">Mark as MOM</span>
                          </label>

                          {isMom && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted">MOM Date:</span>
                              <input
                                type="date"
                                value={momDate}
                                onChange={(e) => setMomDate(e.target.value)}
                                className="bg-elevated border border-border-custom rounded-lg px-3 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Send</span>
                          <Icon name="envelope" className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <Icon name="chat_bubble" className="w-16 h-16 text-muted/30" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Chat Group (Beta Version)</h3>
                <p className="text-xs text-muted max-w-sm">
                  Select a discussion channel from the sidebar or click the "+" button to start a new workspace chat.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border-custom rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            {/* Close */}
            <button
              onClick={() => setShowGroupModal(false)}
              className="absolute right-4 top-4 text-muted hover:text-foreground text-sm cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-6 text-center">Create Group</h2>
            
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              {/* Group icon placeholder */}
              <div className="flex flex-col items-center justify-center gap-2 mb-4">
                <div className="h-16 w-16 rounded-full bg-elevated/40 border border-border-custom flex items-center justify-center text-muted select-none">
                  <Icon name="group" className="w-7 h-7" />
                </div>
                <span className="text-[10px] text-muted">Select Group Image</span>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Site Announcements"
                  className="w-full bg-elevated/35 border border-border-custom rounded-lg px-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1.5">Group Category / Type</label>
                <select
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                  className="w-full bg-elevated border border-border-custom rounded-lg px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="site">Site & Logistics</option>
                  <option value="finance">Finance & Accounts</option>
                  <option value="safety">Safety & Compliance</option>
                  <option value="general">General Discussions</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  Create Chat Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Group Details & Members List Tabbed Drawer */}
      {showMembersModal && activeGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border-custom rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            {/* Close */}
            <button
              onClick={() => setShowMembersModal(false)}
              className="absolute right-4 top-4 text-muted hover:text-foreground text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Header info */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border-custom/50">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(activeGroup.group_type)}`}>
                {activeGroup.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground leading-tight">{activeGroup.name}</h3>
                <p className="text-[10px] text-muted capitalize">{activeGroup.group_type} Group</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border-custom/50 mb-4">
              <button
                onClick={() => setMembersTab("about")}
                className={`flex-1 text-center py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  membersTab === "about" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                About
              </button>
              <button
                onClick={() => setMembersTab("members")}
                className={`flex-1 text-center py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  membersTab === "members" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                Members ({members.length})
              </button>
            </div>

            {/* Tab content 1: About */}
            {membersTab === "about" && (
              <div className="space-y-4 py-2">
                <div>
                  <h4 className="text-[9px] font-extrabold text-muted uppercase tracking-wider">Group Name</h4>
                  <p className="text-xs text-foreground font-medium mt-0.5">{activeGroup.name}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-extrabold text-muted uppercase tracking-wider">Category</h4>
                  <p className="text-xs text-foreground capitalize mt-0.5">{activeGroup.group_type}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-extrabold text-muted uppercase tracking-wider">Created At</h4>
                  <p className="text-xs text-foreground mt-0.5">
                    {new Date(activeGroup.created_at).toLocaleDateString()} at {new Date(activeGroup.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-[9px] font-extrabold text-muted uppercase tracking-wider">Group ID</h4>
                  <p className="text-[10px] text-muted font-sans bg-elevated/40 border border-border-custom rounded-lg p-2 mt-1 select-all">
                    {activeGroup.id}
                  </p>
                </div>
              </div>
            )}

            {/* Tab content 2: Members */}
            {membersTab === "members" && (
              <div className="space-y-3 flex flex-col h-72 overflow-hidden">
                {/* Search members */}
                <div className="relative shrink-0">
                  <input
                    type="text"
                    placeholder="Search Members"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    className="w-full bg-elevated/40 border border-border-custom rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                  />
                  <Icon name="search" className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted pointer-events-none" />
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-elevated/20 border border-border-custom/30 hover:border-border-custom transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                        {(m.name || m.user_id).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{m.name || `User ${m.user_id.slice(0, 8)}`}</div>
                            <div className="text-[9px] text-muted capitalize font-medium">{m.role === "admin" ? "Group Admin" : "Member"}</div>
                          </div>
                        </div>
                        {m.role !== "admin" && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="p-1 text-muted hover:text-danger transition-colors cursor-pointer"
                            title="Remove Member"
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-muted">No members match search.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Add Member Modal */}
      {showAddMemberModal && activeGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border-custom rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            {/* Close */}
            <button
              onClick={() => setShowAddMemberModal(false)}
              className="absolute right-4 top-4 text-muted hover:text-foreground text-sm cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-6 text-center">Add Member</h2>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1.5">Team Member</label>
                <select
                  required
                  value={memberForm.user_id}
                  onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}
                  className="w-full bg-elevated border border-border-custom rounded-lg px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select a team member</option>
                  {teamOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1.5">Role Permission</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="w-full bg-elevated border border-border-custom rounded-lg px-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer / Auditor</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}