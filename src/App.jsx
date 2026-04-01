import { useState, useRef } from "react";

// ── API ───────────────────────────────────────────────────────────────────────
async function callAI(system, text) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": localStorage.getItem("tfy_key") || "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: text }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map((b) => b.text || "").join("") ?? "";
}

// ── Prompts ───────────────────────────────────────────────────────────────────
const HUMANIZER_PROMPT = `You are a world-class editor specialising in making AI-generated text completely undetectable. Rewrite the text using these techniques:
- Mix very short sentences with long ones randomly — destroy uniform rhythm
- Add contractions, colloquialisms and casual asides ("Look,", "Honestly,", "The thing is,")
- Start some sentences with "And", "But", "So" — humans do this, AI avoids it
- Use em dashes, ellipses and parenthetical remarks naturally
- Remove all perfectly balanced paragraph structure
- Replace formal vocabulary with simpler direct words
- Add slight imperfections and natural tangents
- Vary paragraph lengths dramatically
- Remove all hedging phrases like "it is important to note" and "furthermore"
- Add occasional personal-sounding observations
Goal: pass Turnitin, Originality.ai and GPTZero with 0% AI score.
Return ONLY the rewritten text. No explanation. No preamble.`;

const GRAMMAR_PROMPT = `You are a strict professional copy editor. Check the text thoroughly for ALL grammar, spelling, punctuation, style and clarity issues. Be strict — catch everything.
Return ONLY raw JSON, no markdown, no explanation:
{"corrected":"<fully corrected text>","score":<0-100 be strict>,"issues":[{"type":"Grammar|Spelling|Punctuation|Style|Clarity","original":"<exact snippet>","suggestion":"<fix>","explanation":"<why>","severity":"critical|major|minor"}],"summary":"<2 sentence assessment>"}`;

const DETECTOR_PROMPT = `You are an advanced AI content detector as strict as Turnitin and Originality.ai. Analyse every signal:

SIGNALS TO CHECK (check ALL of these):
1. PERPLEXITY — AI picks predictable words, humans are more surprising
2. BURSTINESS — humans vary sentence length wildly, AI is uniform
3. TRANSITION WORDS — AI overuses: furthermore, additionally, moreover, in conclusion, it is worth noting
4. PERFECT STRUCTURE — AI always writes intro/body/conclusion with balanced paragraphs
5. HEDGING — AI constantly hedges with "it is important to note", "it should be noted"
6. PASSIVE VOICE — AI overuses passive constructions
7. TOPIC SENTENCES — AI always starts paragraphs with clear topic sentences
8. VOCABULARY — AI uses formal vocabulary uniformly, humans mix casual and formal
9. PERSONALITY — AI lacks personal voice, opinion, humour, or individual quirks
10. ERRORS — humans make small natural mistakes, AI is flawless
11. REPETITIVE PATTERNS — AI repeats the same sentence structures
12. FILLER PHRASES — AI uses "delve into", "it is crucial", "in today's world", "multifaceted"

BE VERY STRICT. If ANY of these signals appear, increase the AI probability. When in doubt, score higher.

Return ONLY raw JSON, no markdown:
{"aiProbability":<0-100 BE STRICT>,"verdict":"Human-Written|Likely Human|Mixed|Likely AI|AI-Generated","confidence":"Low|Medium|High|Very High","perplexity":"Low|Medium|High","burstiness":"Low|Medium|High","signals":[{"label":"<name>","detail":"<specific evidence from the text>","severity":"low|medium|high"}],"humanSignals":[{"label":"<name>","detail":"<evidence>"}],"summary":"<3 sentence professional verdict like Originality.ai>","action":"<what the user should do>"}`;

// ── Stripe Payment Links — REPLACE WITH YOUR REAL STRIPE LINKS ───────────────
const STRIPE = {
  weekly:  "https://buy.stripe.com/REPLACE_WEEKLY",
  monthly: "https://buy.stripe.com/REPLACE_MONTHLY",
  yearly:  "https://buy.stripe.com/REPLACE_YEARLY",
};

// ── Theme ─────────────────────────────────────────────────────────────────────
const P = "#7c3aed", P2 = "#a855f7", BLUE = "#3b82f6";
const G = "#10b981", R = "#ef4444", Y = "#f59e0b";

function th(dark) {
  return {
    bg:     dark ? "#080812" : "#f8f7ff",
    card:   dark ? "#12112a" : "#ffffff",
    card2:  dark ? "#1a1830" : "#f3f2ff",
    border: dark ? "#252440" : "#e5e2ff",
    text:   dark ? "#ede9ff" : "#1a1040",
    muted:  dark ? "#7b72aa" : "#6b63a8",
    input:  dark ? "#0e0d1f" : "#ffffff",
  };
}

// ── API Key Screen ────────────────────────────────────────────────────────────
function KeyScreen({ onSave }) {
  const [k, setK] = useState("");
  const [e, setE] = useState("");
  function save() {
    if (!k.trim().startsWith("sk-ant-")) { setE("Key must start with sk-ant-"); return; }
    localStorage.setItem("tfy_key", k.trim());
    onSave(k.trim());
  }
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#080812 0%,#12082a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#12112a", border: "1px solid #252440", borderRadius: 24, padding: "2.5rem", boxShadow: "0 25px 80px rgba(124,58,237,0.2)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: "1.25rem" }}>✨</div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#ede9ff", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Welcome to TextifyAI</h1>
        <p style={{ color: "#7b72aa", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>Enter your API key to unlock all tools. Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#a855f7" }}>console.anthropic.com</a></p>
        <input type="password" placeholder="sk-ant-api03-..." value={k} onChange={ev => { setK(ev.target.value); setE(""); }} onKeyDown={ev => ev.key === "Enter" && save()}
          style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: 12, border: `1.5px solid ${e ? R : "#252440"}`, background: "#0e0d1f", color: "#ede9ff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "monospace", marginBottom: "0.5rem" }} />
        {e && <p style={{ color: R, fontSize: "0.8rem", marginBottom: "0.75rem" }}>⚠️ {e}</p>}
        <button onClick={save} disabled={!k.trim()} style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", cursor: k.trim() ? "pointer" : "not-allowed", background: k.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#333", color: "#fff", fontWeight: 800, fontSize: "1rem", marginTop: "0.5rem", boxShadow: k.trim() ? "0 4px 20px rgba(124,58,237,0.4)" : "none" }}>
          Start Using TextifyAI →
        </button>
        <p style={{ textAlign: "center", color: "#4a4570", fontSize: "0.75rem", marginTop: "1rem" }}>🔒 Key stored only in your browser. Never shared.</p>
      </div>
    </div>
  );
}

// ── Result Components ─────────────────────────────────────────────────────────
function HumanizerResult({ text, dark }) {
  const t = th(dark);
  return (
    <div style={{ padding: "1.25rem", borderRadius: 16, background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)", border: `1px solid ${dark ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.2)"}`, lineHeight: 1.8, whiteSpace: "pre-wrap", fontSize: "1rem", color: t.text }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: P2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>✨ Humanized Result</div>
      {text}
    </div>
  );
}

function GrammarResult({ d, dark }) {
  const t = th(dark);
  if (!d) return null;
  const sc = d.score >= 80 ? G : d.score >= 60 ? Y : R;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ padding: "0.5rem 1.1rem", borderRadius: 10, background: `${sc}20`, border: `1px solid ${sc}50`, color: sc, fontWeight: 900, fontSize: "1.1rem" }}>
          {d.score}/100
        </div>
        <div style={{ color: t.muted, fontSize: "0.85rem" }}>{d.issues?.length || 0} issues · {d.summary}</div>
      </div>
      {d.corrected && (
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: 14, background: dark ? "rgba(16,185,129,0.07)" : "rgba(16,185,129,0.05)", border: `1px solid ${G}30`, marginBottom: "1rem", lineHeight: 1.8, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: G, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>✓ Corrected Version</div>
          {d.corrected}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(d.issues || []).map((iss, i) => {
          const c = iss.severity === "critical" ? R : iss.severity === "major" ? Y : BLUE;
          return (
            <div key={i} style={{ padding: "0.75rem 1rem", borderRadius: 12, background: t.card2, borderLeft: `3px solid ${c}` }}>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: 6, background: `${c}20`, color: c, textTransform: "uppercase" }}>{iss.severity}</span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: 6, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: t.muted, textTransform: "uppercase" }}>{iss.type}</span>
                <span style={{ fontSize: "0.83rem", color: dark ? "#ccc" : "#555", fontStyle: "italic" }}>"{iss.original}"</span>
                <span style={{ color: t.muted }}>→</span>
                <span style={{ fontSize: "0.83rem", fontWeight: 700, color: G }}>"{iss.suggestion}"</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: t.muted }}>{iss.explanation}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetectorResult({ d, dark }) {
  const t = th(dark);
  if (!d) return null;
  const p = d.aiProbability ?? 0;
  const col = p >= 70 ? R : p >= 40 ? Y : G;
  const label = p >= 70 ? "High Risk" : p >= 40 ? "Medium Risk" : "Low Risk";
  return (
    <div>
      {/* Big score */}
      <div style={{ borderRadius: 20, background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `2px solid ${col}35`, padding: "2rem", textAlign: "center", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "5rem", fontWeight: 900, color: col, lineHeight: 1, marginBottom: "0.25rem" }}>{p}%</div>
        <div style={{ fontSize: "0.8rem", color: t.muted, marginBottom: "0.75rem" }}>AI Probability Score</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1.2rem", borderRadius: 999, background: `${col}18`, border: `1px solid ${col}40` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, display: "inline-block" }} />
          <span style={{ color: col, fontWeight: 800, fontSize: "0.9rem" }}>{d.verdict}</span>
          <span style={{ color: t.muted, fontSize: "0.8rem" }}>· {d.confidence} confidence</span>
        </div>
        {/* Bar */}
        <div style={{ marginTop: "1.25rem", height: 10, borderRadius: 999, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${p}%`, borderRadius: 999, background: `linear-gradient(90deg,${G},${col})`, transition: "width 1s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.35rem" }}>
          <span style={{ fontSize: "0.7rem", color: G }}>0% Human</span>
          <span style={{ fontSize: "0.7rem", color: R }}>100% AI</span>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[["Perplexity", d.perplexity, "Low = AI-like"], ["Burstiness", d.burstiness, "Low = AI-like"]].map(([name, val, hint]) => {
          const vc = val === "Low" ? R : val === "Medium" ? Y : G;
          return (
            <div key={name} style={{ padding: "1rem", borderRadius: 14, background: t.card2, border: `1px solid ${t.border}`, textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: vc }}>{val || "—"}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: t.text, margin: "0.1rem 0" }}>{name}</div>
              <div style={{ fontSize: "0.68rem", color: t.muted }}>{hint}</div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {d.summary && (
        <div style={{ padding: "1rem 1.1rem", borderRadius: 14, background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.2)", marginBottom: "1rem", fontSize: "0.92rem", lineHeight: 1.7, color: t.text }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: P2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>Analysis</div>
          {d.summary}
        </div>
      )}

      {/* AI Signals */}
      {d.signals?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>⚠️ AI Signals Detected ({d.signals.length})</div>
          {d.signals.map((s, i) => {
            const sc = s.severity === "high" ? R : s.severity === "medium" ? Y : BLUE;
            return (
              <div key={i} style={{ padding: "0.65rem 0.9rem", borderRadius: 10, marginBottom: "0.4rem", background: t.card2, borderLeft: `3px solid ${sc}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.18rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.84rem", color: t.text }}>{s.label}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: 6, background: `${sc}20`, color: sc, textTransform: "uppercase" }}>{s.severity}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: t.muted }}>{s.detail}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Human Signals */}
      {d.humanSignals?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>✅ Human Signals Found ({d.humanSignals.length})</div>
          {d.humanSignals.map((s, i) => (
            <div key={i} style={{ padding: "0.65rem 0.9rem", borderRadius: 10, marginBottom: "0.4rem", background: dark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)", borderLeft: `3px solid ${G}` }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: t.text, marginBottom: "0.15rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.78rem", color: t.muted }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      {d.action && (
        <div style={{ padding: "0.9rem 1.1rem", borderRadius: 12, background: `${col}12`, border: `1px solid ${col}30`, color: col, fontSize: "0.88rem", fontWeight: 600 }}>
          💡 {d.action}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState("home");
  const [tool, setTool] = useState("humanizer");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("tfy_key") || "");
  const taRef = useRef();

  if (!apiKey) return <KeyScreen onSave={setApiKey} />;

  const t = th(dark);

  const TOOLS = [
    { id: "humanizer", icon: "✨", label: "AI Humanizer", color: P, desc: "Bypass Turnitin & Originality.ai" },
    { id: "detector",  icon: "🔍", label: "AI Detector",  color: P2, desc: "Strict detection like Turnitin" },
    { id: "grammar",   icon: "📝", label: "Grammar Check", color: BLUE, desc: "Professional grammar & style" },
  ];

  const PROMPTS = { humanizer: HUMANIZER_PROMPT, grammar: GRAMMAR_PROMPT, detector: DETECTOR_PROMPT };
  const PLACEHOLDERS = {
    humanizer: "Paste your AI-generated text here. We'll rewrite it to be completely undetectable…",
    detector:  "Paste any text here to check if it was written by AI…",
    grammar:   "Paste your text here to check grammar, spelling and style…",
  };

  const active = TOOLS.find(x => x.id === tool);

  async function run() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const raw = await callAI(PROMPTS[tool], input);
      if (tool === "humanizer") {
        setOutput({ type: "text", value: raw });
      } else {
        try {
          setOutput({ type: tool, value: JSON.parse(raw.replace(/```json|```/g, "").trim()) });
        } catch {
          setOutput({ type: "text", value: raw });
        }
      }
    } catch (e) {
      setError(e.message?.includes("401") ? "Invalid API key — click 'Key' in the menu to update it." : e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  function copyOut() {
    const txt = output?.type === "text" ? output.value : JSON.stringify(output?.value, null, 2);
    navigator.clipboard.writeText(txt);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const wc = input.trim() ? input.trim().split(/\s+/).length : 0;

  const PLANS = [
    {
      id: "weekly", name: "Weekly", price: "£7", period: "/week", popular: false, savings: "",
      features: ["All 3 AI tools", "100 uses per day", "Standard speed", "Email support"],
    },
    {
      id: "monthly", name: "Monthly", price: "£20", period: "/month", popular: true, savings: "",
      features: ["All 3 AI tools", "Unlimited uses", "Priority speed", "Advanced detection", "Priority support", "API access"],
    },
    {
      id: "yearly", name: "Yearly", price: "£135", period: "/year", popular: false, savings: "Save £105",
      features: ["Everything in Monthly", "Fastest speed", "Dedicated support", "Early access to new tools", "Commercial licence"],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Segoe UI',system-ui,sans-serif", transition: "all 0.25s" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(8,8,18,0.95)" : "rgba(248,247,255,0.95)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${t.border}`, height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", gap: "0.5rem" }}>
        <div onClick={() => setPage("home")} style={{ fontWeight: 900, fontSize: "1.35rem", background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "pointer", letterSpacing: "-0.02em" }}>TextifyAI</div>
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
          <button onClick={() => setPage("home")} style={{ padding: "0.32rem 0.85rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: page === "home" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", color: page === "home" ? "#fff" : t.muted }}>Tools</button>
          <button onClick={() => setPage("pricing")} style={{ padding: "0.32rem 0.85rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: page === "pricing" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", color: page === "pricing" ? "#fff" : t.muted }}>Pricing</button>
          <button onClick={() => setDark(!dark)} style={{ padding: "0.32rem 0.6rem", borderRadius: 8, border: "none", cursor: "pointer", background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", fontSize: "0.95rem" }}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => { localStorage.removeItem("tfy_key"); setApiKey(""); }} style={{ padding: "0.32rem 0.8rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: "0.75rem", fontWeight: 600 }}>Key</button>
          <button onClick={() => setPage("pricing")} style={{ padding: "0.4rem 1.1rem", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, fontSize: "0.82rem", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>Get Pro</button>
        </div>
      </nav>

      {/* ── HOME PAGE ── */}
      {page === "home" && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", padding: "0.28rem 1rem", borderRadius: 999, background: dark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.1)", border: `1px solid ${dark ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.25)"}`, color: P2, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
              ✦ Professional AI Writing Tools
            </div>
            <h1 style={{ fontSize: "clamp(2.2rem,5vw,3.75rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
              The #1 AI Writing<br />
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Toolkit Online</span>
            </h1>
            <p style={{ fontSize: "1.05rem", color: t.muted, maxWidth: 480, margin: "0 auto 2rem", lineHeight: 1.68 }}>
              Humanize AI text, detect AI content, and fix grammar — all with professional accuracy that rivals Turnitin and Originality.ai.
            </p>
          </div>

          {/* Tool Selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {TOOLS.map(tk => (
              <button key={tk.id} onClick={() => { setTool(tk.id); setOutput(null); setError(""); }}
                style={{ padding: "1.1rem 0.75rem", borderRadius: 16, border: `2px solid ${tool === tk.id ? tk.color : t.border}`, background: tool === tk.id ? (dark ? `${tk.color}18` : `${tk.color}0d`) : t.card, cursor: "pointer", color: t.text, textAlign: "center", transition: "all 0.15s", boxShadow: tool === tk.id ? `0 0 0 1px ${tk.color}30, 0 8px 30px ${tk.color}20` : "none" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{tk.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: "0.2rem" }}>{tk.label}</div>
                <div style={{ fontSize: "0.72rem", color: t.muted }}>{tk.desc}</div>
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ background: t.card, border: `1.5px solid ${tool === "humanizer" ? P : tool === "detector" ? P2 : BLUE}30`, borderRadius: 20, overflow: "hidden", boxShadow: dark ? "0 20px 60px rgba(0,0,0,0.4)" : "0 20px 60px rgba(124,58,237,0.08)", marginBottom: "1rem" }}>
            <div style={{ padding: "0.6rem 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>{active.icon}</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: active.color }}>{active.label}</span>
            </div>
            <textarea ref={taRef}
              style={{ width: "100%", minHeight: 190, padding: "0.75rem 1rem 1rem", background: "transparent", border: "none", color: t.text, fontSize: "1rem", lineHeight: 1.72, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              placeholder={PLACEHOLDERS[tool]}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <div style={{ padding: "0.6rem 1rem", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: t.muted }}>{wc} words · {input.length} characters</span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {input && (
                  <button onClick={() => { setInput(""); setOutput(null); setError(""); }}
                    style={{ padding: "0.4rem 0.85rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: "0.8rem" }}>
                    Clear
                  </button>
                )}
                <button onClick={run} disabled={loading || !input.trim()}
                  style={{ padding: "0.45rem 1.4rem", borderRadius: 9, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: loading || !input.trim() ? "#333" : `linear-gradient(135deg,${active.color},${P2})`, color: "#fff", opacity: loading || !input.trim() ? 0.55 : 1, boxShadow: loading || !input.trim() ? "none" : `0 4px 16px ${active.color}45` }}>
                  {loading
                    ? <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
                        Analysing…
                      </span>
                    : `Run ${active.label} →`}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: `${R}12`, border: `1px solid ${R}35`, color: R, fontSize: "0.88rem", marginBottom: "1rem" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Output */}
          {output && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Result</span>
                <button onClick={copyOut} style={{ padding: "0.25rem 0.75rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: copied ? `${G}18` : "transparent", color: copied ? G : t.muted, fontSize: "0.76rem", fontWeight: 600 }}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              {output.type === "text" && <HumanizerResult text={output.value} dark={dark} />}
              {output.type === "grammar" && <GrammarResult d={output.value} dark={dark} />}
              {output.type === "detector" && <DetectorResult d={output.value} dark={dark} />}
            </div>
          )}

          {/* Feature Pills */}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center", marginTop: "3rem" }}>
            {[["🎯","Turnitin-level detection"],["✍️","Bypass Originality.ai"],["⚡","Results in seconds"],["🔒","100% private"]].map(([icon, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", borderRadius: 999, background: t.card, border: `1px solid ${t.border}`, fontSize: "0.8rem", fontWeight: 600 }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRICING PAGE ── */}
      {page === "pricing" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "4rem 1.25rem 6rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h1 style={{ fontSize: "clamp(1.9rem,5vw,3rem)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
              Simple, <span style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Honest Pricing</span>
            </h1>
            <p style={{ color: t.muted, fontSize: "1rem", lineHeight: 1.65 }}>No hidden fees. Cancel anytime. All plans include every tool.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(265px,1fr))", gap: "1.25rem", marginBottom: "4rem" }}>
            {PLANS.map(plan => (
              <div key={plan.id} style={{ padding: "2rem", borderRadius: 22, position: "relative", border: `2px solid ${plan.popular ? P : t.border}`, background: plan.popular ? (dark ? "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(168,85,247,0.08))" : "linear-gradient(135deg,rgba(124,58,237,0.07),rgba(168,85,247,0.04))") : t.card, boxShadow: plan.popular ? `0 8px 40px rgba(124,58,237,0.2)` : "none" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: "0.72rem", fontWeight: 800, padding: "0.25rem 1rem", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
                    ⭐ MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: t.muted, marginBottom: "0.5rem" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: plan.savings ? "0.25rem" : "1.25rem" }}>
                  <span style={{ fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.03em", color: plan.popular ? P : t.text }}>{plan.price}</span>
                  <span style={{ color: t.muted, fontSize: "0.9rem" }}>{plan.period}</span>
                </div>
                {plan.savings && <div style={{ fontSize: "0.78rem", fontWeight: 700, color: G, marginBottom: "1.25rem" }}>🎉 {plan.savings}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1.75rem" }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
                      <span style={{ color: G, fontWeight: 800, flexShrink: 0, fontSize: "0.9rem" }}>✓</span>
                      <span style={{ fontSize: "0.88rem" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={STRIPE[plan.id]} target="_blank" rel="noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: "0.95rem", background: plan.popular ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", border: plan.popular ? "none" : `1.5px solid ${t.border}`, color: plan.popular ? "#fff" : t.text, boxShadow: plan.popular ? "0 4px 20px rgba(124,58,237,0.35)" : "none", transition: "opacity 0.15s" }}>
                  Get {plan.name} Plan →
                </a>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "1.6rem", fontWeight: 800, marginBottom: "1.5rem" }}>Frequently Asked Questions</h2>
            {[
              ["Does the humanizer really bypass Turnitin?", "Yes. Our humanizer applies 10+ rewriting techniques specifically designed to change perplexity, burstiness, and sentence patterns that Turnitin and Originality.ai flag."],
              ["How accurate is the AI detector?", "Very accurate. We check 12 linguistic signals including perplexity, burstiness, transition word overuse, passive voice, and more — the same signals used by Turnitin."],
              ["Can I cancel anytime?", "Yes, cancel instantly with no fees. Your plan stays active until the end of the billing period."],
              ["What payment methods are accepted?", "All major credit and debit cards, PayPal, Apple Pay and Google Pay via Stripe."],
              ["Is my text stored?", "Never. Your text is processed in real time and never stored, logged, or shared."],
            ].map(([q, a]) => (
              <div key={q} style={{ padding: "1.1rem 1.25rem", borderRadius: 14, background: t.card, border: `1px solid ${t.border}`, marginBottom: "0.65rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.35rem", fontSize: "0.95rem" }}>{q}</div>
                <div style={{ fontSize: "0.87rem", color: t.muted, lineHeight: 1.6 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${t.border}`, padding: "2rem 1.5rem", textAlign: "center", color: t.muted, fontSize: "0.8rem" }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.4rem" }}>TextifyAI</div>
        © 2025 TextifyAI. All rights reserved.
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <a href="#" style={{ color: t.muted, textDecoration: "none" }}>Privacy Policy</a>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <a href="#" style={{ color: t.muted, textDecoration: "none" }}>Terms of Service</a>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  );
}
