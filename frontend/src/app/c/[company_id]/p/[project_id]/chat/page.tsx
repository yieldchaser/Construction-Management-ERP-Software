"use client";
import { getApiHost } from "@/lib/api";
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

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
  media_url?: string;
  voice_note_url?: string;
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
}

export default function ChatPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isMom, setIsMom] = useState(false);
  const [momDate, setMomDate] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("member");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [memberForm, setMemberForm] = useState({ user_id: "", role: "member" });

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${projectId}`);
      if (res.ok) setGroups(await res.json());
    } catch (e) { console.error("Failed to load groups", e); }
  };

  const fetchMessages = async (groupId: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/messages/${groupId}`);
      if (res.ok) setMessages(await res.json());
    } catch (e) { console.error("Failed to load messages", e); }
  };

  const fetchMembers = async (groupId: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${groupId}/members`);
      if (res.ok) setMembers(await res.json());
    } catch (e) { console.error("Failed to load members", e); }
  };

  useEffect(() => {
    const id = setTimeout(() => fetchGroups(), 0);
    return () => clearTimeout(id);
  }, [projectId]);

  useEffect(() => {
    if (!activeGroup) return;
    let interval: NodeJS.Timeout;
    const id = setTimeout(() => {
      fetchMessages(activeGroup.id);
      fetchMembers(activeGroup.id);
      interval = setInterval(() => fetchMessages(activeGroup.id), 5000);
    }, 0);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [activeGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const group_type = formData.get("group_type") as string;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, project_id: projectId, name, group_type }),
      });
      if (res.ok) {
        setShowGroupModal(false);
        fetchGroups();
      }
    } catch (e) { console.error("Failed to create group", e); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/chat/groups/${activeGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: activeGroup.id, user_id: memberForm.user_id, role: memberForm.role }),
      });
      if (res.ok) {
        setShowMemberModal(false);
        setMemberForm({ user_id: "", role: "member" });
        fetchMembers(activeGroup.id);
      }
    } catch (e) { console.error("Failed to add member", e); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeGroup) return;
    if (!confirm("Remove this member?")) return;
    try {
      await fetch(`${getApiHost()}/apis/v3/chat/groups/${activeGroup.id}/members/${userId}`, { method: "DELETE" });
      fetchMembers(activeGroup.id);
    } catch (e) { console.error("Failed to remove member", e); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || (!messageText.trim() && !imageUrl.trim())) return;
    try {
      const body: Record<string, unknown> = {
        group_id: activeGroup.id,
        message_text: messageText || null,
        is_mom: isMom,
        mom_date: isMom ? new Date(momDate).toISOString() : null,
        image_urls: imageUrl ? imageUrl.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`${getApiHost()}/apis/v3/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessageText("");
        setImageUrl("");
        setIsMom(false);
        setMomDate("");
        fetchMessages(activeGroup.id);
      }
    } catch (e) { console.error("Failed to send message", e); }
  };

  const canManage = currentUserRole === "admin";

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed]">
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-72 bg-white/5 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Chat Groups</h2>
            <button
              onClick={() => setShowGroupModal(true)}
              className="p-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold transition-all"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g); setCurrentUserRole("member"); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeGroup?.id === g.id ? "bg-primary/20 text-white" : "hover:bg-white/5 text-zinc-400"
                }`}
              >
                <div className="font-medium truncate">{g.name}</div>
                <div className="text-xs text-zinc-500 capitalize">{g.group_type} • {g.member_count} members</div>
              </button>
            ))}
          </div>
        </div>

        {activeGroup && (
          <div className="w-64 bg-white/5 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Members</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5">
                  <div>
                    <div className="text-xs text-white">User {m.user_id.slice(0, 8)}</div>
                    <div className="text-[10px] text-zinc-500 capitalize">{m.role}</div>
                  </div>
                  {canManage && m.role !== "admin" && (
                    <button onClick={() => handleRemoveMember(m.user_id)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                  )}
                </div>
              ))}
            </div>
            {canManage && (
              <div className="p-3 border-t border-white/10">
                <button onClick={() => setShowMemberModal(true)} className="w-full px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium transition-all">
                  + Add Member
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {activeGroup ? (
            <>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">{activeGroup.name}</h2>
                <p className="text-xs text-zinc-400 capitalize">{activeGroup.group_type} group • {activeGroup.member_count} members</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-zinc-500 py-8">No messages yet. Start the conversation.</div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.is_mom ? "justify-center" : "justify-start"}`}>
                    <div className={`max-w-lg rounded-2xl px-4 py-2.5 ${
                      msg.is_mom
                        ? "bg-primary/20 border border-primary/30 text-center"
                        : "bg-white/10"
                    }`}>
                      {msg.is_mom && (
                        <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Minutes of Meeting</div>
                      )}
                      {!msg.is_mom && msg.user_name && (
                        <div className="text-xs font-medium text-zinc-400 mb-1">{msg.user_name}</div>
                      )}
                      {msg.message_text && <div className="text-sm text-white">{msg.message_text}</div>}
                      {msg.image_urls && msg.image_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.image_urls.map((url, i) => (
                            <img key={i} src={url} alt="" className="rounded-lg max-h-40 object-cover border border-white/10" />
                          ))}
                        </div>
                      )}
                      {msg.mom_date && (
                        <div className="text-xs text-zinc-400 mt-1">{new Date(msg.mom_date).toLocaleDateString()}</div>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-1">{new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-white/10">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Image URL (optional)"
                      className="w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                    <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMom}
                        onChange={(e) => setIsMom(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs text-zinc-400 whitespace-nowrap">MOM</span>
                    </label>
                    {isMom && (
                      <input
                        type="date"
                        value={momDate}
                        onChange={(e) => setMomDate(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                      />
                    )}
                  </div>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all">
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              Select a group or create a new one to start chatting
            </div>
          )}
        </div>
      </div>

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1726] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create Chat Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Group Name</label>
                <input type="text" name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
                <select name="group_type" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white">
                  <option value="general">General</option>
                  <option value="site">Site</option>
                  <option value="finance">Finance</option>
                  <option value="safety">Safety</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold">Create Group</button>
                <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMemberModal && activeGroup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1726] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">User ID</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={memberForm.user_id} onChange={(e) => setMemberForm({...memberForm, user_id: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Role</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={memberForm.role} onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold">Add Member</button>
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
