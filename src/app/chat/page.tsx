// "use client";

// import { useEffect, useRef, useState, useCallback } from "react";
// import { useSession } from "next-auth/react";
// import { useSearchParams, useRouter } from "next/navigation";
// import Pusher from "pusher-js";

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface Sender   { id: string; name: string; profilePhoto: string | null; }
// interface Message  { id: string; content?: string; imageUrl?: string; type: string; createdAt: string; sender: Sender; }
// interface Member   { id: string; name: string; profilePhoto: string | null; }

// // ── Avatar ────────────────────────────────────────────────────────────────────
// function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
//   const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
//   if (src) return <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />;
//   return (
//     <div style={{ width: size, height: size, fontSize: size * 0.35 }}
//       className="rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center font-semibold text-white flex-shrink-0">
//       {initials}
//     </div>
//   );
// }

// // ── Format time ───────────────────────────────────────────────────────────────
// function formatTime(iso: string) {
//   const d = new Date(iso);
//   const now = new Date();
//   const isToday = d.toDateString() === now.toDateString();
//   if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
//          d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
// }

export default function ChatPage() {
//   const { data: session } = useSession();
//   const router            = useRouter();
//   const searchParams      = useSearchParams();
//   const groupId           = searchParams.get("groupId");

//   // Chat state
//   const [messages,    setMessages]    = useState<Message[]>([]);
//   const [members,     setMembers]     = useState<Member[]>([]);
//   const [activeChat,  setActiveChat]  = useState<"group" | string>("group"); // "group" or memberId
//   const [activeName,  setActiveName]  = useState("Group Chat");
//   const [input,       setInput]       = useState("");
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const [imageFile,   setImageFile]   = useState<string | null>(null); // base64
//   const [sending,     setSending]     = useState(false);
//   const [loadingMsgs, setLoadingMsgs] = useState(false);
//   const [nextCursor,  setNextCursor]  = useState<string | null>(null);
//   const [isTyping,    setIsTyping]    = useState(false);
//   const [typingUser,  setTypingUser]  = useState("");

//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const fileInputRef   = useRef<HTMLInputElement>(null);
//   const pusherRef      = useRef<Pusher | null>(null);
//   const channelRef     = useRef<any>(null);
//   const typingTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const myId           = (session?.user as any)?.id;

//   // ── Fetch members ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!groupId) return;
//     fetch(`/api/dashboard`)
//       .then((r) => r.json())
//       .then((d) => {
//         const group = d.groups?.find((g: any) => g.id === groupId);
//         if (group) {
//           setMembers(
//             group.members
//               .map((m: any) => m.user)
//               .filter((m: any) => m.id !== myId)
//           );
//         }
//       });
//   }, [groupId, myId]);

//   // ── Fetch messages ─────────────────────────────────────────────────────────
//   const fetchMessages = useCallback(async (chatTarget: "group" | string, cur?: string) => {
//     if (!groupId) return;
//     setLoadingMsgs(true);
//     const params = new URLSearchParams();
//     if (chatTarget === "group") params.set("groupId", groupId);
//     else params.set("receiverId", chatTarget);
//     if (cur) params.set("cursor", cur);

//     const res  = await fetch(`/api/chat/messages?${params}`);
//     const data = await res.json();
//     if (cur) setMessages((prev) => [...(data.messages || []), ...prev]);
//     else     setMessages(data.messages || []);
//     setNextCursor(data.nextCursor);
//     setLoadingMsgs(false);
//   }, [groupId]);

//   // ── Setup Pusher ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!groupId || !myId) return;

//     fetchMessages(activeChat);

//     // Cleanup old channel
//     if (channelRef.current) { channelRef.current.unbind_all(); channelRef.current.unsubscribe(); }

//     if (!pusherRef.current) {
//       pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
//         cluster:      process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
//         authEndpoint: "/api/pusher/auth",
//       });
//     }

//     // Subscribe to correct channel
//     let channelName: string;
//     if (activeChat === "group") {
//       channelName = `group-${groupId}`;
//     } else {
//       const [u1, u2] = [myId, activeChat].sort();
//       channelName = `private-dm-${u1}-${u2}`;
//     }

//     const channel = pusherRef.current.subscribe(channelName);
//     channelRef.current = channel;

//     channel.bind("new-message", (msg: Message) => {
//       setMessages((prev) => {
//         if (prev.find((m) => m.id === msg.id)) return prev;
//         return [...prev, msg];
//       });
//     });

//     channel.bind("typing", ({ name, userId }: { name: string; userId: string }) => {
//       if (userId === myId) return;
//       setTypingUser(name);
//       setIsTyping(true);
//       setTimeout(() => setIsTyping(false), 2500);
//     });

//     return () => {
//       channel.unbind_all();
//       channel.unsubscribe();
//     };
//   }, [activeChat, groupId, myId]);

//   // ── Scroll to bottom ───────────────────────────────────────────────────────
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // ── Switch chat ────────────────────────────────────────────────────────────
//   const switchChat = (target: "group" | string, name: string) => {
//     setActiveChat(target);
//     setActiveName(name);
//     setMessages([]);
//     setNextCursor(null);
//     fetchMessages(target);
//   };

//   // ── Typing indicator ───────────────────────────────────────────────────────
//   const handleTyping = () => {
//     if (!pusherRef.current || !channelRef.current) return;
//     // Throttle — only send once per 2s
//     if (typingTimeout.current) return;
//     typingTimeout.current = setTimeout(() => { typingTimeout.current = null; }, 2000);
//     // We trigger typing via a separate lightweight API call
//     fetch("/api/chat/typing", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ groupId, receiverId: activeChat === "group" ? null : activeChat }),
//     }).catch(() => {});
//   };

//   // ── Image picker ───────────────────────────────────────────────────────────
//   const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const base64 = reader.result as string;
//       setImageFile(base64);
//       setImagePreview(base64);
//     };
//     reader.readAsDataURL(file);
//   };

//   // ── Send message ───────────────────────────────────────────────────────────
//   const sendMessage = async () => {
//     if ((!input.trim() && !imageFile) || sending) return;
//     setSending(true);

//     let imageUrl: string | null = null;

//     // Upload image first if any
//     if (imageFile) {
//       const res  = await fetch("/api/upload", {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ data: imageFile, folder: "kinnected/chat" }),
//       });
//       const data = await res.json();
//       imageUrl   = data.url;
//     }

//     await fetch("/api/chat/send", {
//       method: "POST", headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         content:    input.trim() || null,
//         imageUrl,
//         groupId:    activeChat === "group" ? groupId : null,
//         receiverId: activeChat !== "group" ? activeChat : null,
//       }),
//     });

//     setInput("");
//     setImageFile(null);
//     setImagePreview(null);
//     setSending(false);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
//   };

//   // ─────────────────────────────────────────────────────────────────────────
  return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&display=swap');
//         * { box-sizing: border-box; }
//         body { margin: 0; }
//         .font-display { font-family: 'Instrument Serif', serif; }
//         .font-body    { font-family: 'Geist', sans-serif; }
//         @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
//         @keyframes spin    { to { transform: rotate(360deg); } }
//         @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
//         .msg-in  { animation: fadeIn 0.2s ease; }
//         .spinner-sm { width:18px; height:18px; border:2px solid #bbf7d0; border-top-color:#16a34a; border-radius:50%; animation:spin 0.7s linear infinite; }
//         .typing-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; animation:pulse 1.2s ease infinite; }
//         .typing-dot:nth-child(2) { animation-delay:0.2s; }
//         .typing-dot:nth-child(3) { animation-delay:0.4s; }
//         .member-btn { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border-radius:12px; border:none; background:transparent; cursor:pointer; transition:all 0.15s; text-align:left; font-family:'Geist',sans-serif; }
//         .member-btn:hover { background:#f0fdf4; }
//         .member-btn.active { background:linear-gradient(135deg,#dcfce7,#bbf7d0); }
//         .input-area { display:flex; align-items:flex-end; gap:10px; padding:16px 20px; background:white; border-top:1px solid #dcfce7; }
//         .chat-input { flex:1; resize:none; border:1.5px solid #bbf7d0; border-radius:14px; padding:12px 16px; font-family:'Geist',sans-serif; font-size:14px; color:#14532d; background:#f0fdf4; outline:none; max-height:120px; transition:border-color 0.2s; line-height:1.5; }
//         .chat-input:focus { border-color:#22c55e; background:white; box-shadow:0 0 0 3px rgba(34,197,94,0.1); }
//         .chat-input::placeholder { color:#86efac; }
//         .send-btn { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#16a34a,#22c55e); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.2s; box-shadow:0 3px 10px rgba(34,197,94,0.3); }
//         .send-btn:hover:not(:disabled) { box-shadow:0 6px 16px rgba(34,197,94,0.4); transform:translateY(-1px); }
//         .send-btn:disabled { opacity:0.5; cursor:not-allowed; }
//         .icon-btn { width:40px; height:40px; border-radius:10px; border:1.5px solid #bbf7d0; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.2s; color:#16a34a; }
//         .icon-btn:hover { background:#f0fdf4; border-color:#22c55e; }
//         .msg-bubble-me    { background:linear-gradient(135deg,#16a34a,#22c55e); color:white; border-radius:18px 18px 4px 18px; padding:10px 14px; max-width:70%; word-break:break-word; box-shadow:0 2px 8px rgba(34,197,94,0.2); }
//         .msg-bubble-them  { background:white; color:#14532d; border:1px solid #dcfce7; border-radius:18px 18px 18px 4px; padding:10px 14px; max-width:70%; word-break:break-word; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
//         .load-more-btn { margin:12px auto; display:block; padding:6px 18px; font-size:12px; color:#16a34a; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:999px; cursor:pointer; font-family:'Geist',sans-serif; transition:all 0.2s; }
//         .load-more-btn:hover { background:#dcfce7; }
//         .date-chip { margin:16px auto; display:block; text-align:center; font-size:11px; color:#86efac; background:#f0fdf4; border:1px solid #dcfce7; border-radius:999px; padding:3px 12px; width:fit-content; font-family:'Geist',sans-serif; }
//       `}</style>

//       <div className="font-body flex h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#f0fdf4] overflow-hidden">

//         {/* ── LEFT SIDEBAR ── */}
//         <aside className="w-[260px] flex-shrink-0 border-r border-green-100 bg-white flex flex-col h-full">

//           {/* Header */}
//           <div className="px-4 pt-5 pb-4 border-b border-green-50">
//             <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-green-600 text-sm font-medium mb-4 hover:text-green-800 transition-colors">
//               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
//               Dashboard
//             </button>
//             <div className="flex items-center gap-2.5">
//               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
//                 <span className="font-display text-white text-base">K</span>
//               </div>
//               <span className="font-display text-green-900 text-lg">Messages</span>
//             </div>
//           </div>

//           {/* Group chat button */}
//           <div className="px-3 pt-4">
//             <p className="text-[10px] text-green-400 font-semibold uppercase tracking-widest px-3 mb-2">Group</p>
//             <button
//               className={`member-btn ${activeChat === "group" ? "active" : ""}`}
//               onClick={() => switchChat("group", "Group Chat")}
//             >
//               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
//                   <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
//                   <circle cx="9" cy="7" r="4"/>
//                   <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
//                 </svg>
//               </div>
//               <div>
//                 <p className="text-sm font-semibold text-green-900">Family Group</p>
//                 <p className="text-xs text-green-500">Everyone in the group</p>
//               </div>
//             </button>
//           </div>

//           {/* DM list */}
//           <div className="px-3 pt-5 flex-1 overflow-y-auto">
//             <p className="text-[10px] text-green-400 font-semibold uppercase tracking-widest px-3 mb-2">Direct Messages</p>
//             {members.length === 0 ? (
//               <p className="text-xs text-green-300 px-3">No other members yet</p>
//             ) : (
//               members.map((m) => (
//                 <button
//                   key={m.id}
//                   className={`member-btn ${activeChat === m.id ? "active" : ""}`}
//                   onClick={() => switchChat(m.id, m.name)}
//                 >
//                   <Avatar src={m.profilePhoto} name={m.name} size={36} />
//                   <div className="min-w-0">
//                     <p className="text-sm font-semibold text-green-900 truncate">{m.name}</p>
//                     <p className="text-xs text-green-400">Click to message</p>
//                   </div>
//                 </button>
//               ))
//             )}
//           </div>
//         </aside>

<div className="h-screen bg-black text-white text-2xl font-bold flex justify-center items-center">
  This feature will come later...
</div>

//         {/* ── MAIN CHAT AREA ── */}
//         <div className="flex-1 flex flex-col h-full">

//           {/* Chat header */}
//           <div className="px-6 py-4 bg-white border-b border-green-50 flex items-center gap-3">
//             {activeChat === "group" ? (
//               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
//                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
//                   <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
//                   <circle cx="9" cy="7" r="4"/>
//                   <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
//                 </svg>
//               </div>
//             ) : (
//               <Avatar src={members.find((m) => m.id === activeChat)?.profilePhoto} name={activeName} size={40} />
//             )}
//             <div>
//               <h2 className="font-semibold text-green-900 text-base">{activeName}</h2>
//               <p className="text-xs text-green-400">
//                 {activeChat === "group" ? `${members.length + 1} members` : "Direct Message"}
//               </p>
//             </div>
//           </div>

//           {/* Messages */}
//           <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1">

//             {/* Load more */}
//             {nextCursor && (
//               <button className="load-more-btn" onClick={() => fetchMessages(activeChat, nextCursor)}>
//                 Load older messages
//               </button>
//             )}

//             {loadingMsgs && messages.length === 0 && (
//               <div className="flex items-center justify-center flex-1 gap-3">
//                 <div className="spinner-sm" />
//                 <p className="text-green-400 text-sm">Loading messages…</p>
//               </div>
//             )}

//             {!loadingMsgs && messages.length === 0 && (
//               <div className="flex flex-col items-center justify-center flex-1 gap-3 opacity-60">
//                 <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-3xl">💬</div>
//                 <p className="font-display text-xl text-green-700">No messages yet</p>
//                 <p className="text-sm text-green-400">Be the first to say something!</p>
//               </div>
//             )}

//             {/* Message list */}
//             {messages.map((msg, i) => {
//               const isMe       = msg.sender.id === myId;
//               const prevMsg    = messages[i - 1];
//               const showAvatar = !prevMsg || prevMsg.sender.id !== msg.sender.id;
//               const showDate   = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

//               return (
//                 <div key={msg.id} className="msg-in">
//                   {showDate && (
//                     <div className="date-chip">
//                       {new Date(msg.createdAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
//                     </div>
//                   )}

//                   <div className={`flex items-end gap-2 mt-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
//                     {/* Avatar — only show when sender changes */}
//                     <div className="w-8 flex-shrink-0">
//                       {showAvatar && !isMe && <Avatar src={msg.sender.profilePhoto} name={msg.sender.name} size={30} />}
//                     </div>

//                     <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
//                       {showAvatar && !isMe && (
//                         <p className="text-xs font-semibold text-green-600 px-1">{msg.sender.name}</p>
//                       )}

//                       <div className={isMe ? "msg-bubble-me" : "msg-bubble-them"}>
//                         {/* Image */}
//                         {msg.imageUrl && (
//                           <img src={msg.imageUrl} alt="attachment"
//                             className="rounded-xl max-w-[260px] max-h-[280px] object-cover mb-2 cursor-pointer"
//                             onClick={() => window.open(msg.imageUrl!, "_blank")} />
//                         )}
//                         {/* Text */}
//                         {msg.content && (
//                           <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
//                         )}
//                       </div>

//                       <p className="text-[10px] text-green-400 px-1">{formatTime(msg.createdAt)}</p>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}

//             {/* Typing indicator */}
//             {isTyping && (
//               <div className="flex items-end gap-2">
//                 <div className="w-8" />
//                 <div className="msg-bubble-them flex items-center gap-1 py-3 px-4">
//                   <div className="typing-dot" />
//                   <div className="typing-dot" />
//                   <div className="typing-dot" />
//                   <span className="text-xs text-green-400 ml-2">{typingUser} is typing</span>
//                 </div>
//               </div>
//             )}

//             <div ref={messagesEndRef} />
//           </div>

//           {/* Image preview */}
//           {imagePreview && (
//             <div className="px-6 py-3 bg-green-50 border-t border-green-100 flex items-center gap-3">
//               <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded-xl border border-green-200" />
//               <div className="flex-1">
//                 <p className="text-xs text-green-600 font-medium">Image ready to send</p>
//                 <p className="text-xs text-green-400">Add a caption below or send as is</p>
//               </div>
//               <button
//                 onClick={() => { setImagePreview(null); setImageFile(null); }}
//                 className="w-8 h-8 rounded-full bg-white border border-green-200 flex items-center justify-center text-green-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
//               >
//                 ×
//               </button>
//             </div>
//           )}

//           {/* Input area */}
//           <div className="input-area">
//             {/* Image button */}
//             <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach photo">
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <rect x="3" y="3" width="18" height="18" rx="2"/>
//                 <circle cx="8.5" cy="8.5" r="1.5"/>
//                 <polyline points="21 15 16 10 5 21"/>
//               </svg>
//             </button>
//             <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

//             {/* Text input */}
//             <textarea
//               className="chat-input"
//               placeholder={`Message ${activeName}…`}
//               value={input}
//               rows={1}
//               onChange={(e) => { setInput(e.target.value); handleTyping(); }}
//               onKeyDown={handleKeyDown}
//             />

//             {/* Emoji picker placeholder */}
//             <button className="icon-btn" title="Emoji">
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <circle cx="12" cy="12" r="10"/>
//                 <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
//                 <line x1="9" y1="9" x2="9.01" y2="9"/>
//                 <line x1="15" y1="9" x2="15.01" y2="9"/>
//               </svg>
//             </button>

//             {/* Send button */}
//             <button className="send-btn" onClick={sendMessage} disabled={sending || (!input.trim() && !imageFile)}>
//               {sending ? (
//                 <div className="spinner-sm" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
//               ) : (
//                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
//                   <line x1="22" y1="2" x2="11" y2="13"/>
//                   <polygon points="22 2 15 22 11 13 2 9 22 2"/>
//                 </svg>
//               )}
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
  );
}