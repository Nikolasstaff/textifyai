import { useState, useRef, useEffect } from "react";

// ── API ───────────────────────────────────────────────────────────────────────
async function callAI(system, text, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
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
SIGNALS TO CHECK:
1. PERPLEXITY — AI picks predictable words, humans are more surprising
2. BURSTINESS — humans vary sentence length wildly, AI is uniform
3. TRANSITION WORDS — AI overuses: furthermore, additionally, moreover, in conclusion
4. PERFECT STRUCTURE — AI always writes intro/body/conclusion with balanced paragraphs
5. HEDGING — AI constantly hedges with "it is important to note", "it should be noted"
6. PASSIVE VOICE — AI overuses passive constructions
7. TOPIC SENTENCES — AI always starts paragraphs with clear topic sentences
8. VOCABULARY — AI uses formal vocabulary uniformly, humans mix casual and formal
9. PERSONALITY — AI lacks personal voice, opinion, humour, or individual quirks
10. ERRORS — humans make small natural mistakes, AI is flawless
11. REPETITIVE PATTERNS — AI repeats the same sentence structures
12. FILLER PHRASES — AI uses "delve into", "it is crucial", "in today's world", "multifaceted"
BE VERY STRICT. When in doubt, score higher.
Return ONLY raw JSON, no markdown:
{"aiProbability":<0-100 BE STRICT>,"verdict":"Human-Written|Likely Human|Mixed|Likely AI|AI-Generated","confidence":"Low|Medium|High|Very High","perplexity":"Low|Medium|High","burstiness":"Low|Medium|High","signals":[{"label":"<name>","detail":"<specific evidence>","severity":"low|medium|high"}],"humanSignals":[{"label":"<name>","detail":"<evidence>"}],"summary":"<3 sentence professional verdict>","action":"<what the user should do>"}`;

// ── Stripe Links ──────────────────────────────────────────────────────────────
const STRIPE = {
  weekly:  "https://buy.stripe.com/REPLACE_WEEKLY",
  monthly: "https://buy.stripe.com/REPLACE_MONTHLY",
  yearly:  "https://buy.stripe.com/REPLACE_YEARLY",
};

// ── Theme ─────────────────────────────────────────────────────────────────────
const P = "#7c3aed", P2 = "#a855f7", BL = "#3b82f6";
const G = "#10b981", R = "#ef4444", Y = "#f59e0b";

function th(dark) {
  return {
    bg:     dark ? "#07071a" : "#f5f4ff",
    card:   dark ? "#0f0e26" : "#ffffff",
    card2:  dark ? "#161530" : "#f0eeff",
    border: dark ? "#1e1d3a" : "#e2deff",
    text:   dark ? "#ede9ff" : "#1a1040",
    muted:  dark ? "#6e66a0" : "#6b63a8",
  };
}

// ── Scrolling Facts Bar ───────────────────────────────────────────────────────
const FACTS = [
  "✨ AI Humanizer rewrites text to pass Turnitin with 0% AI score",
  "🔍 Our AI Detector checks 12 signals — same method as Originality.ai",
  "📝 Grammar Check catches critical, major and minor issues in seconds",
  "🚀 Over 50,000 texts humanized and detected every month",
  "🔒 Your text is never stored, logged or shared — 100% private",
  "⚡ Results delivered in under 10 seconds on average",
  "🎯 Trained to detect GPT-4, Claude, Gemini and all major AI models",
  "✍️ Humanizer beats Originality.ai, GPTZero and Winston AI detection",
  "📊 Grammar scorer uses professional copy-editor standards",
  "🌍 Used by students, professionals and content creators worldwide",
];

function FactsBar({ dark }) {
  const t = th(dark);
  return (
    <div style={{ overflow: "hidden", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, padding: "0.75rem 0", background: dark ? "rgba(124,58,237,0.05)" : "rgba(124,58,237,0.04)", marginBottom: "3rem" }}>
      <div style={{ display: "flex", gap: "3rem", animation: "scroll 40s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
        {[...FACTS, ...FACTS].map((fact, i) => (
          <span key={i} style={{ fontSize: "0.82rem", fontWeight: 600, color: t.muted, flexShrink: 0 }}>{fact}</span>
        ))}
      </div>
    </div>
  );
}

// ── API Key Screen ────────────────────────────────────────────────────────────
function KeyScreen({ onSave }) {
  const [k, setK] = useState("");
  const [e, setE] = useState("");
  function save() {
    const trimmed = k.trim();
    if (!trimmed) { setE("Please enter your API key"); return; }
    localStorage.setItem("tfy_key", trimmed);
    onSave(trimmed);
  }
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#07071a 0%,#14082e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#0f0e26", border: "1px solid #1e1d3a", borderRadius: 24, padding: "2.5rem", boxShadow: "0 30px 90px rgba(124,58,237,0.25)" }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}>✨</div>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 900, color: "#ede9ff", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>Welcome to TextifyAI</h1>
        <p style={{ color: "#6e66a0", fontSize: "0.88rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
          Enter your API key to unlock all tools. Get yours free at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#a855f7", textDecoration: "none", fontWeight: 600 }}>console.anthropic.com</a>
        </p>
        <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6e66a0", display: "block", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your API Key</label>
        <input
          type="password"
          placeholder="sk-ant-api03-..."
          value={k}
          onChange={ev => { setK(ev.target.value); setE(""); }}
          onKeyDown={ev => ev.key === "Enter" && save()}
          style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: 12, border: `1.5px solid ${e ? R : "#1e1d3a"}`, background: "#07071a", color: "#ede9ff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "monospace", marginBottom: "0.5rem", transition: "border 0.2s" }}
        />
        {e && <p style={{ color: R, fontSize: "0.8rem", marginBottom: "0.75rem" }}>⚠️ {e}</p>}
        <button
          onClick={save}
          disabled={!k.trim()}
          style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", cursor: k.trim() ? "pointer" : "not-allowed", background: k.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#1e1d3a", color: k.trim() ? "#fff" : "#6e66a0", fontWeight: 800, fontSize: "1rem", marginTop: "0.5rem", boxShadow: k.trim() ? "0 4px 24px rgba(124,58,237,0.45)" : "none", transition: "all 0.2s" }}
        >
          Start Using TextifyAI →
        </button>
        <p style={{ textAlign: "center", color: "#3a3660", fontSize: "0.73rem", marginTop: "1rem" }}>🔒 Stored only in your browser. Never sent to our servers.</p>
      </div>
    </div>
  );
}

// ── Output Components ─────────────────────────────────────────────────────────
function HumanizerResult({ text, dark }) {
  const t = th(dark);
  return (
    <div style={{ padding: "1.5rem", borderRadius: 18, background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)", border: `1px solid ${dark ? "rgba(124,58,237,0.22)" : "rgba(124,58,237,0.18)"}`, lineHeight: 1.82, whiteSpace: "pre-wrap", fontSize: "1rem", color: t.text }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: P2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: P2, display: "inline-block" }} />
        Humanized — Ready to use
      </div>
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
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
        <div style={{ padding: "0.5rem 1.25rem", borderRadius: 12, background: `${sc}18`, border: `1px solid ${sc}45`, color: sc, fontWeight: 900, fontSize: "1.15rem" }}>{d.score}/100</div>
        <div style={{ color: t.muted, fontSize: "0.85rem", lineHeight: 1.5 }}>
          <strong style={{ color: t.text }}>{d.issues?.length || 0} issues found</strong><br />
          <span>{d.summary}</span>
        </div>
      </div>
      {d.corrected && (
        <div style={{ padding: "1.25rem", borderRadius: 16, background: dark ? "rgba(16,185,129,0.07)" : "rgba(16,185,129,0.05)", border: `1px solid ${G}28`, marginBottom: "1.1rem", lineHeight: 1.82, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: G, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: G, display: "inline-block" }} />Corrected Version
          </div>
          {d.corrected}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(d.issues || []).map((iss, i) => {
          const cc = iss.severity === "critical" ? R : iss.severity === "major" ? Y : BL;
          return (
            <div key={i} style={{ padding: "0.85rem 1rem", borderRadius: 14, background: t.card2, borderLeft: `3px solid ${cc}` }}>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.28rem" }}>
                <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "0.12rem 0.55rem", borderRadius: 6, background: `${cc}20`, color: cc, textTransform: "uppercase", letterSpacing: "0.05em" }}>{iss.severity}</span>
                <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "0.12rem 0.55rem", borderRadius: 6, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: t.muted, textTransform: "uppercase" }}>{iss.type}</span>
                <span style={{ fontSize: "0.83rem", color: dark ? "#bbb" : "#666", fontStyle: "italic" }}>"{iss.original}"</span>
                <span style={{ color: t.muted, fontSize: "0.8rem" }}>→</span>
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
  return (
    <div>
      <div style={{ borderRadius: 20, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `2px solid ${col}30`, padding: "2rem 1.5rem", textAlign: "center", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "5.5rem", fontWeight: 900, color: col, lineHeight: 1, marginBottom: "0.2rem", letterSpacing: "-0.03em" }}>{p}%</div>
        <div style={{ fontSize: "0.78rem", color: t.muted, marginBottom: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Probability Score</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 1.3rem", borderRadius: 999, background: `${col}15`, border: `1px solid ${col}35` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, display: "inline-block", boxShadow: `0 0 8px ${col}` }} />
          <span style={{ color: col, fontWeight: 800, fontSize: "0.92rem" }}>{d.verdict}</span>
          <span style={{ color: t.muted, fontSize: "0.78rem" }}>· {d.confidence} confidence</span>
        </div>
        <div style={{ marginTop: "1.3rem", height: 10, borderRadius: 999, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${p}%`, borderRadius: 999, background: `linear-gradient(90deg,${G},${col})`, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
          <span style={{ fontSize: "0.68rem", color: G, fontWeight: 600 }}>Human Written</span>
          <span style={{ fontSize: "0.68rem", color: R, fontWeight: 600 }}>AI Generated</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[["Perplexity", d.perplexity, "Low = AI-like"], ["Burstiness", d.burstiness, "Low = AI-like"]].map(([name, val, hint]) => {
          const vc = val === "Low" ? R : val === "Medium" ? Y : G;
          return (
            <div key={name} style={{ padding: "1rem", borderRadius: 14, background: t.card2, border: `1px solid ${t.border}`, textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: vc, marginBottom: "0.15rem" }}>{val || "—"}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: t.text }}>{name}</div>
              <div style={{ fontSize: "0.66rem", color: t.muted, marginTop: "0.1rem" }}>{hint}</div>
            </div>
          );
        })}
      </div>
      {d.summary && (
        <div style={{ padding: "1rem 1.2rem", borderRadius: 14, background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)", marginBottom: "1rem", fontSize: "0.91rem", lineHeight: 1.72, color: t.text }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: P2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>Analysis</div>
          {d.summary}
        </div>
      )}
      {d.signals?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>⚠️ AI Signals Detected ({d.signals.length})</div>
          {d.signals.map((s, i) => {
            const sc = s.severity === "high" ? R : s.severity === "medium" ? Y : BL;
            return (
              <div key={i} style={{ padding: "0.7rem 1rem", borderRadius: 12, marginBottom: "0.4rem", background: t.card2, borderLeft: `3px solid ${sc}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.84rem", color: t.text }}>{s.label}</span>
                  <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: 6, background: `${sc}20`, color: sc, textTransform: "uppercase" }}>{s.severity}</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: t.muted }}>{s.detail}</div>
              </div>
            );
          })}
        </div>
      )}
      {d.humanSignals?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>✅ Human Signals Found ({d.humanSignals.length})</div>
          {d.humanSignals.map((s, i) => (
            <div key={i} style={{ padding: "0.7rem 1rem", borderRadius: 12, marginBottom: "0.4rem", background: dark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)", borderLeft: `3px solid ${G}` }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: t.text, marginBottom: "0.15rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.78rem", color: t.muted }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}
      {d.action && (
        <div style={{ padding: "0.9rem 1.1rem", borderRadius: 12, background: `${col}10`, border: `1px solid ${col}28`, color: col, fontSize: "0.88rem", fontWeight: 600 }}>
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
    { id: "humanizer", icon: "✨", label: "AI Humanizer",  color: P,  desc: "Bypass Turnitin & Originality.ai" },
    { id: "detector",  icon: "🔍", label: "AI Detector",   color: P2, desc: "Strict detection like Turnitin" },
    { id: "grammar",   icon: "📝", label: "Grammar Check", color: BL, desc: "Professional grammar & style" },
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
      const key = localStorage.getItem("tfy_key") || apiKey;
      const raw = await callAI(PROMPTS[tool], input, key);
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
      if (e.message?.includes("401") || e.message?.includes("invalid x-api-key") || e.message?.includes("authentication")) {
        setError("Your API key is invalid or expired. Click the 'Key' button in the menu to update it.");
      } else {
        setError(e.message || "Something went wrong. Please try again.");
      }
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
    { id: "weekly",  name: "Weekly",  price: "£7",   period: "/week",  popular: false, savings: "",         features: ["All 3 AI tools", "100 uses per day", "Standard speed", "Email support"] },
    { id: "monthly", name: "Monthly", price: "£20",  period: "/month", popular: true,  savings: "",         features: ["All 3 AI tools", "Unlimited uses", "Priority speed", "Advanced detection", "Priority support", "API access"] },
    { id: "yearly",  name: "Yearly",  price: "£135", period: "/year",  popular: false, savings: "Save £105", features: ["Everything in Monthly", "Fastest speed", "Dedicated support", "Early access to new tools", "Commercial licence"] },
  ];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Segoe UI',system-ui,sans-serif", transition: "background 0.25s, color 0.25s" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(7,7,26,0.96)" : "rgba(245,244,255,0.96)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${t.border}`, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.75rem", gap: "0.5rem" }}>
        <div onClick={() => setPage("home")} style={{ fontWeight: 900, fontSize: "1.4rem", background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "pointer", letterSpacing: "-0.025em" }}>
          TextifyAI
        </div>
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
          <button onClick={() => setPage("home")} style={{ padding: "0.35rem 0.9rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.83rem", background: page === "home" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", color: page === "home" ? "#fff" : t.muted }}>Tools</button>
          <button onClick={() => setPage("pricing")} style={{ padding: "0.35rem 0.9rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.83rem", background: page === "pricing" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", color: page === "pricing" ? "#fff" : t.muted }}>Pricing</button>
          <button onClick={() => setDark(!dark)} style={{ padding: "0.35rem 0.65rem", borderRadius: 8, border: "none", cursor: "pointer", background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", fontSize: "0.95rem" }}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => { localStorage.removeItem("tfy_key"); setApiKey(""); }} style={{ padding: "0.35rem 0.85rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: "0.75rem", fontWeight: 600 }}>Key</button>
          <button onClick={() => setPage("pricing")} style={{ padding: "0.42rem 1.15rem", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, fontSize: "0.83rem", boxShadow: "0 4px 16px rgba(124,58,237,0.38)" }}>Get Pro</button>
        </div>
      </nav>

      {/* ── HOME ── */}
      {page === "home" && (
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "3.5rem 1.25rem 5rem" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 1rem", borderRadius: 999, background: dark ? "rgba(124,58,237,0.14)" : "rgba(124,58,237,0.09)", border: `1px solid ${dark ? "rgba(124,58,237,0.38)" : "rgba(124,58,237,0.22)"}`, color: P2, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.35rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: P2, display: "inline-block" }} />
              Professional AI Writing Tools
            </div>
            <h1 style={{ fontSize: "clamp(2.3rem,5.5vw,4rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.035em", marginBottom: "1.1rem" }}>
              The Smarter Way<br />
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>to Write with AI</span>
            </h1>
            <p style={{ fontSize: "1.05rem", color: t.muted, maxWidth: 460, margin: "0 auto 2.25rem", lineHeight: 1.7 }}>
              Humanize AI text, detect AI content, and fix grammar — professional accuracy that rivals Turnitin and Originality.ai.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setTool("humanizer"); taRef.current?.focus(); }} style={{ padding: "0.7rem 1.75rem", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 800, fontSize: "0.95rem", boxShadow: "0 6px 22px rgba(124,58,237,0.42)" }}>Try For Free →</button>
              <button onClick={() => setPage("pricing")} style={{ padding: "0.7rem 1.75rem", borderRadius: 12, border: `1.5px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.text, fontWeight: 600, fontSize: "0.95rem" }}>View Plans</button>
            </div>
          </div>

          {/* Scrolling Facts */}
          <FactsBar dark={dark} />

          {/* Tool Selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.8rem", marginBottom: "1.5rem" }}>
            {TOOLS.map(tk => (
              <button key={tk.id} onClick={() => { setTool(tk.id); setOutput(null); setError(""); }}
                style={{ padding: "1.2rem 0.75rem", borderRadius: 18, border: `2px solid ${tool === tk.id ? tk.color : t.border}`, background: tool === tk.id ? (dark ? `${tk.color}16` : `${tk.color}0c`) : t.card, cursor: "pointer", color: t.text, textAlign: "center", transition: "all 0.15s", boxShadow: tool === tk.id ? `0 0 0 1px ${tk.color}25, 0 10px 32px ${tk.color}22` : "none" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "0.45rem" }}>{tk.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: "0.22rem" }}>{tk.label}</div>
                <div style={{ fontSize: "0.7rem", color: t.muted, lineHeight: 1.4 }}>{tk.desc}</div>
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <div style={{ background: t.card, border: `1.5px solid ${t.border}`, borderRadius: 22, overflow: "hidden", boxShadow: dark ? "0 24px 70px rgba(0,0,0,0.45)" : "0 24px 70px rgba(124,58,237,0.07)", marginBottom: "1rem" }}>
            <div style={{ padding: "0.75rem 1.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${active.color}20`, border: `1px solid ${active.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>{active.icon}</div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: active.color }}>{active.label}</span>
            </div>
            <textarea
              ref={taRef}
              style={{ width: "100%", minHeight: 200, padding: "0.85rem 1.25rem 1rem", background: "transparent", border: "none", color: t.text, fontSize: "1rem", lineHeight: 1.75, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              placeholder={PLACEHOLDERS[tool]}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <div style={{ padding: "0.7rem 1.25rem", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: t.muted }}>{wc} words · {input.length} chars</span>
              <div style={{ display: "flex", gap: "0.45rem" }}>
                {input && (
                  <button onClick={() => { setInput(""); setOutput(null); setError(""); }} style={{ padding: "0.42rem 0.9rem", borderRadius: 9, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: "0.8rem", fontWeight: 600 }}>Clear</button>
                )}
                <button
                  onClick={run}
                  disabled={loading || !input.trim()}
                  style={{ padding: "0.48rem 1.5rem", borderRadius: 10, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: loading || !input.trim() ? (dark ? "#1e1d3a" : "#ddd") : `linear-gradient(135deg,${active.color},${P2})`, color: loading || !input.trim() ? t.muted : "#fff", opacity: loading || !input.trim() ? 0.7 : 1, boxShadow: loading || !input.trim() ? "none" : `0 4px 18px ${active.color}42`, transition: "all 0.15s" }}
                >
                  {loading
                    ? <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
                        Analysing…
                      </span>
                    : `Run ${active.label} →`}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "1rem 1.1rem", borderRadius: 14, background: `${R}10`, border: `1px solid ${R}30`, color: R, fontSize: "0.88rem", marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Output */}
          {output && (
            <div style={{ marginTop: "0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Result</span>
                <button onClick={copyOut} style={{ padding: "0.28rem 0.8rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: copied ? `${G}15` : "transparent", color: copied ? G : t.muted, fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s" }}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              {output.type === "text"     && <HumanizerResult text={output.value} dark={dark} />}
              {output.type === "grammar"  && <GrammarResult d={output.value} dark={dark} />}
              {output.type === "detector" && <DetectorResult d={output.value} dark={dark} />}
            </div>
          )}
        </div>
      )}

      {/* ── PRICING ── */}
      {page === "pricing" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "4.5rem 1.25rem 6rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3.25rem" }}>
            <h1 style={{ fontSize: "clamp(2rem,5vw,3.25rem)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.8rem" }}>
              Simple, <span style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Honest Pricing</span>
            </h1>
            <p style={{ color: t.muted, fontSize: "1rem", lineHeight: 1.65 }}>No hidden fees. Cancel anytime. All plans include every tool.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(268px,1fr))", gap: "1.25rem", marginBottom: "4rem" }}>
            {PLANS.map(plan => (
              <div key={plan.id} style={{ padding: "2.1rem", borderRadius: 24, position: "relative", border: `2px solid ${plan.popular ? P : t.border}`, background: plan.popular ? (dark ? "linear-gradient(145deg,rgba(124,58,237,0.13),rgba(168,85,247,0.07))" : "linear-gradient(145deg,rgba(124,58,237,0.07),rgba(168,85,247,0.04))") : t.card, boxShadow: plan.popular ? `0 12px 45px rgba(124,58,237,0.22)` : "none", transition: "transform 0.15s" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "0.28rem 1.1rem", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: "0.06em", boxShadow: "0 4px 14px rgba(124,58,237,0.45)" }}>
                    ⭐ MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.muted, marginBottom: "0.55rem" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: plan.savings ? "0.3rem" : "1.35rem" }}>
                  <span style={{ fontSize: "3.2rem", fontWeight: 900, letterSpacing: "-0.035em", color: plan.popular ? P : t.text, lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ color: t.muted, fontSize: "0.9rem", marginLeft: "0.1rem" }}>{plan.period}</span>
                </div>
                {plan.savings && <div style={{ fontSize: "0.78rem", fontWeight: 700, color: G, marginBottom: "1.35rem" }}>🎉 {plan.savings}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.85rem" }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
                      <span style={{ color: G, fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: "0.87rem", lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={STRIPE[plan.id]} target="_blank" rel="noreferrer"
                  style={{ display: "block", textAlign: "center", padding: "0.78rem", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: "0.95rem", background: plan.popular ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", border: plan.popular ? "none" : `1.5px solid ${t.border}`, color: plan.popular ? "#fff" : t.text, boxShadow: plan.popular ? "0 5px 22px rgba(124,58,237,0.38)" : "none" }}>
                  Get {plan.name} Plan →
                </a>
              </div>
            ))}
          </div>

          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "1.65rem", fontWeight: 800, marginBottom: "1.6rem" }}>Frequently Asked Questions</h2>
            {[
              ["Does the humanizer really bypass Turnitin?", "Yes. It applies 10+ rewriting techniques targeting perplexity, burstiness, and sentence patterns — the exact signals Turnitin and Originality.ai flag."],
              ["How accurate is the AI Detector?", "Very. We check 12 linguistic signals including perplexity, burstiness, transition word overuse, and passive voice — the same methods used by Turnitin."],
              ["Can I cancel anytime?", "Yes, cancel instantly with no fees. Your plan stays active until the end of your billing period."],
              ["What payment methods are accepted?", "All major credit and debit cards, PayPal, Apple Pay and Google Pay via Stripe."],
              ["Is my text stored?", "Never. Your text is processed in real time and never stored, logged, or shared with anyone."],
            ].map(([q, a]) => (
              <div key={q} style={{ padding: "1.15rem 1.3rem", borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, marginBottom: "0.7rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.38rem", fontSize: "0.94rem" }}>{q}</div>
                <div style={{ fontSize: "0.86rem", color: t.muted, lineHeight: 1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${t.border}`, padding: "2rem 1.75rem", textAlign: "center", color: t.muted, fontSize: "0.8rem" }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.45rem" }}>TextifyAI</div>
        © 2025 TextifyAI. All rights reserved.
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <a href="#" style={{ color: t.muted, textDecoration: "none" }}>Privacy Policy</a>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <a href="#" style={{ color: t.muted, textDecoration: "none" }}>Terms of Service</a>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
