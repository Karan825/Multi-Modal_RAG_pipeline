import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

/* ─────────────── Inject global styles once ─────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;width:100%;overflow:hidden;font-family:'Inter',system-ui,sans-serif}

/* scrollbars */
.db-scroll::-webkit-scrollbar{width:4px}
.db-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:4px}

/* animations */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes dot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
.msg-in{animation:fadeUp .22s ease both}
.d1{animation:dot 1.4s infinite ease-in-out both;animation-delay:-.32s}
.d2{animation:dot 1.4s infinite ease-in-out both;animation-delay:-.16s}
.d3{animation:dot 1.4s infinite ease-in-out both}

/* sidebar nav rows */
.nav-row{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:all .15s}
.nav-row:hover{background:rgba(255,255,255,0.08)}
.nav-row.active{background:rgba(255,255,255,0.13);border-color:rgba(255,255,255,0.15)}

/* doc card */
.doc-card{padding:10px 12px;border-radius:10px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);transition:all .15s;display:flex;align-items:center;gap:9px}
.doc-card:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2)}
.doc-card.sel{background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.3)}

/* input area */
.chat-input{width:100%;border:none;outline:none;background:transparent;resize:none;font-family:inherit;font-size:14px;color:#1a1a2e;line-height:1.55;padding:6px 0}
.chat-input::placeholder{color:#9ea3bf}

/* send button */
.send-btn{width:38px;height:38px;border-radius:10px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .2s}
.send-btn:disabled{background:#e0e3ff;color:#b0b4e0;cursor:default;box-shadow:none}
.send-btn:not(:disabled){background:#5865F2;color:#fff;box-shadow:0 3px 12px rgba(88,101,242,.35)}

/* demo badge */
.demo-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:3px 10px 3px 6px;font-size:11px;font-weight:600;color:rgba(255,255,255,0.8)}
`;

function injectCSS() {
  if (!document.getElementById("db-css")) {
    const s = document.createElement("style");
    s.id = "db-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, logout } = useAuth();
  useEffect(() => { injectCSS(); }, []);

  /* ── state ── */
  const [sessions, setSessions]           = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [chatLoading, setChatLoading]     = useState(false);

  const [documents, setDocuments]         = useState([]);
  const [selectedDoc, setSelectedDoc]     = useState(null);
  const [uploadingDoc, setUploadingDoc]   = useState(false);
  const [loadingDemo, setLoadingDemo]     = useState(false);
  const [docMsg, setDocMsg]               = useState("");

  const [text, setText]                   = useState("");
  const [stats, setStats]                 = useState({ totalChunks:0, textChunks:0, imageChunks:0 });

  const fileRef   = useRef(null);
  const bottomRef = useRef(null);

  /* ── boot ── */
  useEffect(() => { boot(); }, []);
  useEffect(() => { if (activeSession) loadMessages(activeSession.id); else setMessages([]); }, [activeSession]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, chatLoading]);

  async function boot() {
    try { await Promise.all([loadStats(), loadDocs()]); } catch(_) {}
    try {
      const r = await api.get("/api/chats");
      setSessions(r.data);
      if (r.data.length) setActiveSession(r.data[0]);
      else await newChat("New Chat");
    } catch(_) { await newChat("New Chat"); }
  }

  async function loadStats() { try { const r = await api.get("/api/stats"); setStats(r.data); } catch(_) {} }
  async function loadDocs()  { try { const r = await api.get("/api/documents"); setDocuments(r.data); } catch(_) {} }
  async function loadMessages(id) { try { const r = await api.get(`/api/chats/${id}/messages`); setMessages(r.data); } catch(_) {} }

  /* ── sessions ── */
  async function newChat(title) {
    const label = title || `Chat ${sessions.length + 1}`;
    try {
      const r = await api.post("/api/chats", { title: label });
      setSessions(p => [r.data, ...p]);
      setActiveSession(r.data);
    } catch(_) {
      // Backend unavailable — create a local in-memory session so chat always works
      const local = { id: "local-" + Date.now(), title: label, user_id: "guest", created_at: new Date().toISOString() };
      setSessions(p => [local, ...p]);
      setActiveSession(local);
    }
  }
  async function deleteChat(id, e) {
    e.stopPropagation();
    try { await api.delete(`/api/chats/${id}`); } catch(_) {}
    const rest = sessions.filter(s => s.id !== id);
    setSessions(rest);
    if (activeSession?.id === id) setActiveSession(rest[0] || null);
  }

  /* ── documents ── */
  async function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    setUploadingDoc(true); setDocMsg("");
    try {
      const fd = new FormData(); fd.append("file", file);
      await api.post("/api/documents", fd, { headers:{ "Content-Type":"multipart/form-data" } });
      setDocMsg(`✓ "${file.name}" indexed`);
      await Promise.all([loadDocs(), loadStats()]);
    } catch(_) { setDocMsg("✗ Upload failed"); }
    finally {
      setUploadingDoc(false);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setDocMsg(""), 4000);
    }
  }

  async function handleLoadDemo() {
    setLoadingDemo(true); setDocMsg("");
    try {
      await api.post("/api/demo-document");
      setDocMsg("✓ Demo document indexed");
      await Promise.all([loadDocs(), loadStats()]);
    } catch(err) {
      setDocMsg(err.response?.data?.detail || "✗ Failed to load demo");
    } finally {
      setLoadingDemo(false);
      setTimeout(() => setDocMsg(""), 5000);
    }
  }

  async function deleteDoc(id, e) {
    e.stopPropagation();
    try { await api.delete(`/api/documents/${id}`); } catch(_) {}
    if (selectedDoc?.id === id) setSelectedDoc(null);
    await Promise.all([loadDocs(), loadStats()]);
  }

  /* ── send message ── */
  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !activeSession) return;
    const q = text.trim(); setText("");
    const tmp = { id:"tmp-"+Date.now(), sender:"user", text_content:q, created_at:new Date().toISOString() };
    setMessages(p => [...p, tmp]);
    setChatLoading(true);
    try {
      const fd = new FormData();
      fd.append("text_content", q);
      if (selectedDoc) fd.append("active_document", selectedDoc.name);
      const r = await api.post(`/api/chats/${activeSession.id}/messages`, fd);
      setMessages(p => p.filter(m => m.id !== tmp.id).concat(r.data.messages));
    } catch(_) {
      setMessages(p => [...p, { id:"err-"+Date.now(), sender:"assistant", text_content:"Failed to reach the backend. Is the server running?", created_at:new Date().toISOString() }]);
    } finally { setChatLoading(false); }
  }

  function onKey(e) { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }

  /* ── ui helpers ── */
  const initial  = user?.email?.[0]?.toUpperCase() || "G";
  const isGuest  = user?.isGuest;

  return (
    <div style={{ display:"flex", height:"100vh", width:"100vw", background:"#fff", fontFamily:"'Inter',sans-serif" }}>

      {/* ══════ SIDEBAR ══════ */}
      <aside style={{
        width:"280px", flexShrink:0,
        background:"#5865F2",
        borderRight:"none",
        display:"flex", flexDirection:"column", padding:"22px 16px", gap:"0",
        overflowY:"auto",
      }} className="db-scroll">

        {/* Brand */}
        <div style={{ display:"flex", alignItems:"center", gap:"11px", marginBottom:"24px" }}>
          <div style={{ width:"40px", height:"40px", background:"#fff", borderRadius:"11px", color:"#5865F2", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"900", fontSize:"22px", fontFamily:"Arial,sans-serif", transform:"rotate(-10deg)", boxShadow:"0 4px 14px rgba(0,0,0,0.25)", flexShrink:0 }}>W</div>
          <div>
            <div style={{ color:"#fff", fontWeight:"700", fontSize:"15px" }}>Workspace</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"11px" }}>Multi-Modal RAG</div>
          </div>
        </div>

        {/* ── Documents ── */}
        <SectionLabel label="Documents" />

        {/* Two action buttons */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingDoc}
            style={{ flex:1, padding:"8px 0", background:"rgba(255,255,255,0.1)", border:"1.5px dashed rgba(255,255,255,0.25)", borderRadius:"8px", color:"rgba(255,255,255,0.8)", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}
          >{uploadingDoc ? "Uploading…" : "⬆ Upload"}</button>

          <button
            onClick={handleLoadDemo}
            disabled={loadingDemo}
            style={{ flex:1, padding:"8px 0", background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.18)", borderRadius:"8px", color:"rgba(255,255,255,0.8)", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}
          >{loadingDemo ? "Loading…" : "🗂 Demo Doc"}</button>
        </div>
        <input type="file" ref={fileRef} accept="application/pdf,image/*" style={{ display:"none" }} onChange={handleUpload} />

        {docMsg && (
          <div style={{ fontSize:"11px", color: docMsg.startsWith("✓") ? "#6ee7b7" : "#fca5a5", marginBottom:"8px", textAlign:"center" }}>{docMsg}</div>
        )}

        {/* All + uploaded docs */}
        <div style={{ display:"flex", flexDirection:"column", gap:"5px", marginBottom:"20px" }}>
          <div className={`doc-card ${!selectedDoc ? "sel" : ""}`} onClick={() => setSelectedDoc(null)}>
            <span style={{ fontSize:"14px" }}>📚</span>
            <span style={{ flex:1, fontSize:"12px", fontWeight:"600", color:!selectedDoc?"#fff":"rgba(255,255,255,0.6)" }}>All Documents</span>
          </div>
          {documents.map(doc => (
            <div key={doc.id} className={`doc-card ${selectedDoc?.id===doc.id?"sel":""}`} onClick={() => setSelectedDoc(doc)}>
              <span style={{ fontSize:"14px" }}>📄</span>
              <span style={{ flex:1, fontSize:"12px", fontWeight:"500", color:selectedDoc?.id===doc.id?"#fff":"rgba(255,255,255,0.6)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{doc.name}</span>
              <button onClick={e => deleteDoc(doc.id, e)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", cursor:"pointer", fontSize:"14px", lineHeight:1, padding:"0 2px" }}>×</button>
            </div>
          ))}
        </div>

        {/* ── Chats ── */}
        <SectionLabel label="Chats" action={<PlusBtn onClick={() => newChat("")} />} />
        <div style={{ display:"flex", flexDirection:"column", gap:"4px", flex:1, overflowY:"auto" }} className="db-scroll">
          {sessions.map(s => (
            <div key={s.id} className={`nav-row ${activeSession?.id===s.id?"active":""}`} onClick={() => setActiveSession(s)}>
              <span style={{ fontSize:"13px", opacity:.5 }}>💬</span>
              <span style={{ flex:1, fontSize:"13px", color: activeSession?.id===s.id?"#fff":"rgba(255,255,255,0.55)", fontWeight: activeSession?.id===s.id?"600":"400", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.title}</span>
              <button onClick={e => deleteChat(s.id, e)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.2)", cursor:"pointer", fontSize:"16px", lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>

        {/* ── Stats chip ── */}
        <div style={{ marginTop:"16px", background:"rgba(255,255,255,0.06)", borderRadius:"10px", padding:"12px", border:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:"9px", fontWeight:"700", letterSpacing:"1px", marginBottom:"8px" }}>INDEX STATUS</div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <Stat n={stats.totalChunks} label="Total" />
            <Stat n={stats.textChunks}  label="Text" />
            <Stat n={stats.imageChunks} label="Images" />
          </div>
        </div>

        {/* ── User chip ── */}
        <div style={{ marginTop:"12px", display:"flex", alignItems:"center", gap:"9px", background:"rgba(255,255,255,0.06)", borderRadius:"10px", padding:"10px 12px", border:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:"rgba(255,255,255,0.2)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", fontSize:"13px", flexShrink:0 }}>{initial}</div>
          <div style={{ flex:1, overflow:"hidden" }}>
            <div style={{ color:"rgba(255,255,255,0.8)", fontSize:"12px", fontWeight:"600", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user?.email}</div>
            {isGuest && <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)" }}>Guest session</div>}
          </div>
          <button onClick={logout} title="Sign out" style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", padding:"4px", borderRadius:"6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* ══════ CHAT PANEL ══════ */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", background:"#f8f9ff", overflow:"hidden", boxShadow:"inset 0 0 0 1px rgba(88,101,242,0.06)" }}>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"28px 32px 24px", display:"flex", flexDirection:"column" }} className="db-scroll">
          {messages.length === 0 ? (
            <EmptyState hasDocs={documents.length > 0} onLoadDemo={handleLoadDemo} loadingDemo={loadingDemo} onUpload={() => fileRef.current?.click()} />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"16px", maxWidth:"700px", width:"100%", margin:"0 auto" }}>
              {messages.map(m => <Bubble key={m.id} msg={m} />)}
              {chatLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
          {messages.length > 0 && <div ref={bottomRef} />}
        </div>

        {/* Input */}
        <div style={{ padding:"10px 32px 20px", background:"#f8f9ff", borderTop:"1px solid #e8eaf6" }}>
          {selectedDoc && (
            <div style={{ maxWidth:"700px", margin:"0 auto 8px", display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ fontSize:"11px", color:"#5865F2", fontWeight:"600", background:"rgba(88,101,242,0.08)", border:"1px solid rgba(88,101,242,0.15)", borderRadius:"20px", padding:"3px 10px" }}>📄 {selectedDoc.name}</span>
              <button onClick={() => setSelectedDoc(null)} style={{ fontSize:"11px", color:"#94a3b8", background:"none", border:"none", cursor:"pointer", fontWeight:"600" }}>× clear filter</button>
            </div>
          )}
          <form onSubmit={sendMessage} style={{ maxWidth:"700px", margin:"0 auto", display:"flex", alignItems:"center", gap:"10px", background:"#fff", borderRadius:"14px", padding:"10px 14px", boxShadow:"0 2px 12px rgba(88,101,242,0.08)", border:"1.5px solid #e0e3ff" }}>
            <textarea
              className="chat-input"
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKey}
              disabled={chatLoading}
              placeholder={selectedDoc ? `Ask about "${selectedDoc.name}"…` : "Ask anything about your documents…"}
            />
            <button type="submit" className="send-btn" disabled={chatLoading || !text.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
          <p style={{ textAlign:"center", fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"8px" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─────────────── SUB-COMPONENTS ─────────────── */
function SectionLabel({ label, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", marginTop:"4px" }}>
      <span style={{ color:"rgba(255,255,255,0.3)", fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase" }}>{label}</span>
      {action}
    </div>
  );
}
function PlusBtn({ onClick }) {
  return <button onClick={onClick} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"5px", color:"rgba(255,255,255,0.6)", width:"20px", height:"20px", cursor:"pointer", fontSize:"16px", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>+</button>;
}
function Stat({ n, label }) {
  return (
    <div style={{ textAlign:"center", flex:1 }}>
      <div style={{ color:"#a5b4fc", fontSize:"17px", fontWeight:"700" }}>{n}</div>
      <div style={{ color:"rgba(255,255,255,0.3)", fontSize:"9px", fontWeight:"600", textTransform:"uppercase", marginTop:"2px" }}>{label}</div>
    </div>
  );
}

function Bubble({ msg }) {
  const isUser = msg.sender === "user";
  return (
    <div className="msg-in" style={{ display:"flex", justifyContent: isUser?"flex-end":"flex-start" }}>
      <div style={{
        maxWidth:"76%", padding:"13px 17px",
        borderRadius: isUser?"18px 18px 4px 18px":"18px 18px 18px 4px",
        background: isUser?"#5865F2":"#fff",
        color: isUser?"#fff":"#1a1a2e",
        fontSize:"14px", lineHeight:"1.6",
        boxShadow: isUser?"0 3px 12px rgba(88,101,242,.3)":"0 2px 8px rgba(0,0,0,0.06)",
        border: isUser?"none":"1px solid #e8eaf6",
      }}>
        <div style={{ whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{msg.text_content}</div>
        {msg.citations?.length > 0 && (
          <div style={{ marginTop:"10px", paddingTop:"8px", borderTop: isUser?"1px solid rgba(255,255,255,0.2)":"1px solid #e8eaf6" }}>
            <div style={{ fontSize:"10px", fontWeight:"700", textTransform:"uppercase", color: isUser?"rgba(255,255,255,0.5)":"#94a3b8", marginBottom:"4px" }}>Sources</div>
            {msg.citations.map((c,i) => (
              <div key={i} style={{ fontSize:"12px", color: isUser?"rgba(255,255,255,0.75)":"#64748b", display:"flex", gap:"5px" }}>
                <span style={{ color: isUser?"#c7d2fe":"#5865F2", fontWeight:"700" }}>[{i+1}]</span>
                <span>{c.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display:"flex", justifyContent:"flex-start" }}>
      <div style={{ padding:"13px 18px", background:"#fff", borderRadius:"18px 18px 18px 4px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"1px solid #e8eaf6", display:"flex", gap:"5px", alignItems:"center" }}>
        {["d1","d2","d3"].map(c => <span key={c} className={c} style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#c7d2fe", display:"inline-block" }} />)}
      </div>
    </div>
  );
}

function EmptyState({ hasDocs, onLoadDemo, loadingDemo, onUpload }) {
  return (
    <div style={{ margin:"auto", textAlign:"center", maxWidth:"400px", padding:"32px 20px" }}>
      <h2 style={{ color:"#1a1a2e", fontSize:"20px", fontWeight:"700", marginBottom:"10px" }}>Ready to answer your questions</h2>
      <p style={{ color:"#6b7280", fontSize:"14px", lineHeight:"1.7", marginBottom:"28px" }}>
        {hasDocs ? "Select a document from the sidebar or ask about all indexed content." : "Get started by uploading your own document, or load our built-in demo Qatar Economic Report."}
      </p>
      {!hasDocs && (
        <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
          <button
            onClick={onUpload}
            style={{ padding:"11px 22px", borderRadius:"10px", border:"1.5px dashed #c7d2fe", background:"rgba(88,101,242,0.05)", color:"#5865F2", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit" }}
          >⬆ Upload Your Doc</button>
          <button
            onClick={onLoadDemo}
            disabled={loadingDemo}
            style={{ padding:"11px 22px", borderRadius:"10px", border:"1.5px solid #5865F2", background:"#5865F2", color:"#fff", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"inherit", opacity: loadingDemo ? 0.7 : 1 }}
          >{loadingDemo ? "Loading…" : "🗂 Try Demo Doc"}</button>
        </div>
      )}
    </div>
  );
}
