import { useState, useRef } from "react";

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

const PROMPTS = {
  humanizer: `You are an expert editor who rewrites AI-generated text to be completely undetectable as AI. Apply these techniques aggressively:
- Break predictable sentence rhythm — mix very short sentences with longer ones randomly
- Add imperfections: minor repetitions, informal asides, personal-sounding observations
- Use contractions, colloquialisms, and slightly informal phrasing
- Vary paragraph lengths dramatically — one sentence then five sentences
- Add occasional filler transitions like "Anyway," "The thing is," "Look," "Honestly,"
- Remove all perfectly balanced structure — AI loves symmetry, humans don't
- Introduce slight tangents or personal opinions where natural
- Use em dashes, ellipses, and parenthetical remarks naturally
- Replace formal vocabulary with simpler, more direct word choices
- Make some sentences start with "And" or "But" — humans do this, AI avoids it
The goal is to make this pass Turnitin, Originality.ai, and GPTZero with 0% AI detection.
Return ONLY the rewritten text. No explanations, no preamble.`,

  grammar: `You are a senior copy editor with 20 years of experience. Perform a thorough grammar, spelling, punctuation, clarity, and style check. Be strict and thorough.

Return raw JSON only, no markdown fences:
{
  "corrected": "<fully corrected text>",
  "score": <0-100 quality score, be strict>,
  "issues": [
    {
      "type": "Grammar|Spelling|Punctuation|Style|Clarity|Word Choice",
      "original": "<exact text from input>",
      "suggestion": "<corrected version>",
      "explanation": "<clear explanation>",
      "severity": "critical|major|minor"
    }
  ],
  "summary": "<2 sentence overall assessment>"
}`,

  detector: `You are an advanced AI content detection system with the precision of Turnitin and Originality.ai. Analyze every linguistic signal strictly:

SIGNALS TO CHECK:
1. Perplexity — AI text has unnaturally low perplexity (too predictable)
2. Burstiness — Human text has varied sentence lengths, AI is uniform
3. Overuse of logical connectors (furthermore, additionally, moreover, in conclusion)
4. Hedging language (it is important to note, it is worth mentioning)
5. Perfect intro/body/conclusion structure with balanced paragraphs
6. Uniform formal vocabulary — humans mix registers
7. Absence of personality, opinion, or individual perspective
8. Mechanical transitions between every paragraph
9. Passive voice overuse
10. Absence of errors — humans make small natural mistakes
11. Always starting paragraphs with clear topic sentences
12. Repetitive sentence structure patterns

Be VERY STRICT. Score conservatively — when in doubt, flag as AI.

Return raw JSON only, no markdown:
{
  "aiProbability": <0-100, be strict>,
  "verdict": "Human-Written|Likely Human|Mixed|Likely AI|AI-Generated",
  "confidence": "Low|Medium|High|Very High",
  "perplexityScore": "<Low/Medium/High>",
  "burstitnessScore": "<Low/Medium/High>",
  "signals": [
    {
      "label": "<signal name>",
      "description": "<specific evidence from the text>",
      "severity": "low|medium|high"
    }
  ],
  "humanSignals": [
    {
      "label": "<human signal>",
      "description": "<evidence>"
    }
  ],
  "summary": "<3 sentence professional assessment>",
  "recommendation": "<what action to take>"
}`,

  summarizer: `You are an expert summarizer. Create a comprehensive yet concise summary.

Return raw JSON only, no markdown:
{
  "summary": "<comprehensive 4-5 sentence summary>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>", "<point 4>"],
  "sentiment": "Positive|Negative|Neutral|Mixed",
  "readingLevel": "<Elementary|Middle School|High School|College|Graduate>",
  "wordCount": { "original": <n>, "summary": <n>, "reduction": "<percent>" },
  "topics": ["<topic 1>", "<topic 2>", "<topic 3>"]
}`
};

const STRIPE_LINKS = {
  weekly:  "https://buy.stripe.com/your_weekly_link",
  monthly: "https://buy.stripe.com/your_monthly_link",
  yearly:  "https://buy.stripe.com/your_yearly_link",
};

const A1 = "#6c47ff", A2 = "#a855f7", A3 = "#38bdf8";
const SUCCESS = "#22c55e", WARNING = "#f59e0b", DANGER = "#ef4444";

function cl(dark, key) {
  return {
    bg:     { light: "#f4f3ff", dark: "#0d0d1a" },
    card:   { light: "#ffffff", dark: "#1a1a35" },
    border: { light: "#e0dcff", dark: "#2a2a4a" },
    text:   { light: "#1a1035", dark: "#e8e4ff" },
    muted:  { light: "#6b5fa8", dark: "#8877cc" },
  }[key][dark ? "dark" : "light"];
}

const TOOLS = [
  { id: "humanizer",  label: "AI Humanizer",  icon: "✨", color: A1,      desc: "Bypass Turnitin & Originality.ai",   ph: "Paste AI-generated text to humanize…" },
  { id: "grammar",    label: "Grammar Check", icon: "📝", color: SUCCESS, desc: "Professional grammar & style check",  ph: "Paste text to check grammar…" },
  { id: "detector",   label: "AI Detector",   icon: "🔍", color: A2,      desc: "Strict AI detection like Turnitin",   ph: "Paste text to check if AI wrote it…" },
  { id: "summarizer", label: "Summarizer",    icon: "⚡", color: A3,      desc: "Smart summaries with key insights",   ph: "Paste long text to summarize…" },
];

const PLANS = [
  { id: "weekly",  name: "Weekly",  price: "£7",   period: "/week",  badge: null,          savings: null,               features: ["All 4 AI tools", "100 requests/day", "Standard speed", "Email support", "Basic AI detection"] },
  { id: "monthly", name: "Monthly", price: "£20",  period: "/month", badge: "Most Popular", savings: null,               features: ["All 4 AI tools", "Unlimited requests", "Priority speed", "Advanced AI detection", "Priority support", "API access"] },
  { id: "yearly",  name: "Yearly",  price: "£135", period: "/year",  badge: null,          savings: "Save £105 vs monthly", features: ["Everything in Monthly", "Fastest speed", "Extended limits", "Dedicated support", "Early access", "Commercial licence"] },
];

function ApiKeySetup({ dark, onSave }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  function save() {
    if (!key.trim().startsWith("sk-ant-")) { setErr("Key must start with sk-ant-"); return; }
    localStorage.setItem("tfy_key", key.trim());
    onSave(key.trim());
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "radial-gradient(ellipse at 20% 10%, #1a0f4a 0%, #0d0d1a 55%)" }}>
      <div style={{ maxWidth: 460, width: "100%", padding: "2.5rem", borderRadius: 24, background: "#1a1a35", border: "1px solid #2a2a4a", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✨</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.5rem", color: "#e8e4ff" }}>Welcome to TextifyAI</h1>
        <p style={{ color: "#8877cc", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "1.75rem" }}>
          Enter your API key to get started. Get one at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: A1 }}>console.anthropic.com</a>
        </p>
        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#8877cc", display: "block", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>API KEY</label>
        <input type="password" placeholder="sk-ant-..." value={key} onChange={e => { setKey(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && save()}
          style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: 10, border: `1.5px solid ${err ? DANGER : "#2a2a4a"}`, background: "rgba(255,255,255,0.05)", color: "#e8e4ff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "monospace", marginBottom: "0.5rem" }} />
        {err && <div style={{ color: DANGER, fontSize: "0.8rem", marginBottom: "0.75rem" }}>⚠️ {err}</div>}
        <button onClick={save} disabled={!key.trim()} style={{ width: "100%", padding: "0.78rem", borderRadius: 10, border: "none", cursor: key.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "1rem", background: key.trim() ? `linear-gradient(135deg,${A1},${A2})` : "#333", color: "#fff", marginTop: "0.5rem", marginBottom: "1rem" }}>
          Enter TextifyAI →
        </button>
        <p style={{ fontSize: "0.73rem", color: "#8877cc", textAlign: "center" }}>🔒 Stored only in your browser. Never sent to our servers.</p>
      </div>
    </div>
  );
}

function GrammarOut({ d, dark }) {
  if (!d) return null;
  const sc = d.score >= 80 ? SUCCESS : d.score >= 60 ? WARNING : DANGER;
  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ padding: "0.45rem 1rem", borderRadius: 10, background: `${sc}22`, border: `1px solid ${sc}55`, color: sc, fontWeight: 800 }}>Score: {d.score}/100</div>
        <span style={{ color: cl(dark, "muted"), fontSize: "0.85rem" }}>{d.issues?.length || 0} issues found</span>
      </div>
      {d.summary && <div style={{ color: cl(dark, "muted"), fontSize: "0.85rem", fontStyle: "italic", marginBottom: "0.75rem" }}>{d.summary}</div>}
      {d.corrected && (
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: 14, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", marginBottom: "1rem", lineHeight: 1.78, whiteSpace: "pre-wrap", fontSize: "0.93rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: SUCCESS, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>✓ Corrected Text</div>
          {d.corrected}
        </div>
      )}
      {d.issues?.map((iss, i) => {
        const tc = iss.severity === "critical" ? DANGER : iss.severity === "major" ? WARNING : A3;
        return (
          <div key={i} style={{ padding: "0.7rem 1rem", borderRadius: 10, marginBottom: "0.45rem", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderLeft: `3px solid ${tc}` }}>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.2rem" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: 6, background: `${tc}20`, color: tc, textTransform: "uppercase" }}>{iss.type}</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: cl(dark, "muted"), textTransform: "uppercase" }}>{iss.severity}</span>
              <span style={{ fontSize: "0.82rem", fontStyle: "italic", color: dark ? "#bbb" : "#555" }}>"{iss.original}"</span>
              <span style={{ color: cl(dark, "muted") }}>→</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: SUCCESS }}>"{iss.suggestion}"</span>
            </div>
            <div style={{ fontSize: "0.76rem", color: cl(dark, "muted") }}>{iss.explanation}</div>
          </div>
        );
      })}
    </div>
  );
}

function DetectorOut({ d, dark }) {
  if (!d) return null;
  const p = d.aiProbability ?? 0;
  const bc = p >= 70 ? DANGER : p >= 40 ? WARNING : SUCCESS;
  return (
    <div>
      <div style={{ textAlign: "center", padding: "1.75rem", borderRadius: 16, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `2px solid ${bc}40`, marginBottom: "1rem" }}>
        <div style={{ fontSize: "4rem", fontWeight: 900, color: bc, lineHeight: 1 }}>{p}%</div>
        <div style={{ fontSize: "0.78rem", color: cl(dark, "muted"), margin: "0.3rem 0 0.6rem" }}>AI Probability</div>
        <div style={{ display: "inline-block", padding: "0.3rem 1.2rem", borderRadius: 999, background: `${bc}22`, color: bc, fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.75rem" }}>{d.verdict}</div>
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: cl(dark, "muted") }}>Confidence: </span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: bc }}>{d.confidence}</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${p}%`, borderRadius: 999, background: `linear-gradient(90deg,${SUCCESS},${bc})`, transition: "width 0.8s" }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
        {[["Perplexity", d.perplexityScore, "Low = AI-like"], ["Burstiness", d.burstitnessScore, "Low = AI-like"]].map(([label, val, hint]) => {
          const vc = val === "Low" ? DANGER : val === "Medium" ? WARNING : SUCCESS;
          return (
            <div key={label} style={{ padding: "0.85rem", borderRadius: 12, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${cl(dark, "border")}`, textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: vc }}>{val}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: cl(dark, "muted") }}>{label}</div>
              <div style={{ fontSize: "0.65rem", color: cl(dark, "muted") }}>{hint}</div>
            </div>
          );
        })}
      </div>
      {d.summary && <div style={{ padding: "1rem 1.1rem", borderRadius: 12, background: dark ? "rgba(108,71,255,0.08)" : "rgba(108,71,255,0.05)", border: "1px solid rgba(108,71,255,0.22)", marginBottom: "0.9rem", fontSize: "0.9rem", lineHeight: 1.7 }}>{d.summary}</div>}
      {d.signals?.length > 0 && (
        <div style={{ marginBottom: "0.9rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: cl(dark, "muted"), textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>⚠️ AI Signals</div>
          {d.signals.map((s, i) => {
            const sc2 = s.severity === "high" ? DANGER : s.severity === "medium" ? WARNING : A3;
            return (
              <div key={i} style={{ padding: "0.6rem 0.9rem", borderRadius: 10, marginBottom: "0.4rem", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderLeft: `3px solid ${sc2}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.18rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{s.label}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 6, background: `${sc2}20`, color: sc2, textTransform: "uppercase" }}>{s.severity}</span>
                </div>
                <div style={{ fontSize: "0.76rem", color: cl(dark, "muted") }}>{s.description}</div>
              </div>
            );
          })}
        </div>
      )}
      {d.humanSignals?.length > 0 && (
        <div style={{ marginBottom: "0.9rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: cl(dark, "muted"), textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>✅ Human Signals</div>
          {d.humanSignals.map((s, i) => (
            <div key={i} style={{ padding: "0.6rem 0.9rem", borderRadius: 10, marginBottom: "0.4rem", background: dark ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.04)", borderLeft: `3px solid ${SUCCESS}` }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.15rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.76rem", color: cl(dark, "muted") }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
      {d.recommendation && <div style={{ padding: "0.9rem 1rem", borderRadius: 12, background: `${bc}10`, border: `1px solid ${bc}30`, fontSize: "0.88rem", color: bc, fontWeight: 600 }}>💡 {d.recommendation}</div>}
    </div>
  );
}

function SummarizerOut({ d, dark }) {
  if (!d) return null;
  return (
    <div>
      {d.summary && (
        <div style={{ padding: "1.1rem 1.25rem", borderRadius: 14, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)", marginBottom: "1rem", lineHeight: 1.78 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: A3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>Summary</div>
          {d.summary}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: "0.6rem", marginBottom: "1rem" }}>
        {[["Sentiment", d.sentiment], ["Reading Level", d.readingLevel], ["Reduction", d.wordCount?.reduction]].map(([lbl, val]) => val && (
          <div key={lbl} style={{ padding: "0.75rem", borderRadius: 10, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${cl(dark, "border")}`, textAlign: "center" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: A3 }}>{val}</div>
            <div style={{ fontSize: "0.68rem", color: cl(dark, "muted") }}>{lbl}</div>
          </div>
        ))}
      </div>
      {d.keyPoints?.length > 0 && (
        <div style={{ marginBottom: "0.9rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: cl(dark, "muted"), textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Key Points</div>
          {d.keyPoints.map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: "0.55rem", padding: "0.55rem 0.9rem", borderRadius: 10, marginBottom: "0.4rem", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}>
              <span style={{ color: A3, fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
              <span style={{ fontSize: "0.88rem" }}>{pt}</span>
            </div>
          ))}
        </div>
      )}
      {d.topics?.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {d.topics.map((t, i) => (
            <span key={i} style={{ padding: "0.25rem 0.75rem", borderRadius: 999, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", color: A3, fontSize: "0.78rem", fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TextifyAI() {
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState("home");
  const [tool, setTool] = useState("humanizer");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("tfy_key") || "");
  const taRef = useRef();

  const active = TOOLS.find(t => t.id === tool);

  if (!apiKey) return <ApiKeySetup dark={dark} onSave={setApiKey} />;

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setError(null); setOutput(null);
    try {
      const raw = await callAI(PROMPTS[tool], input);
      if (tool === "humanizer") {
        setOutput({ type: "text", value: raw });
      } else {
        try { setOutput({ type: tool, value: JSON.parse(raw.replace(/```json|```/g, "").trim()) }); }
        catch { setOutput({ type: "text", value: raw }); }
      }
    } catch (e) {
      setError(e.message?.includes("401") ? "Invalid API key. Click 'Key' to update it." : e.message || "Something went wrong.");
    }
    setLoading(false);
  }

  function copy() {
    const t = output?.type === "text" ? output.value : JSON.stringify(output?.value, null, 2);
    navigator.clipboard.writeText(t);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const wc = input.trim() ? input.trim().split(/\s+/).length : 0;
  const bg = dark
    ? "radial-gradient(ellipse at 20% 10%, #1a0f4a 0%, #0d0d1a 55%, #091628 100%)"
    : "radial-gradient(ellipse at 20% 10%, #ede9ff 0%, #f4f3ff 65%, #e8f4ff 100%)";
  const btn = (dis) => ({
    padding: "0.6rem 1.6rem", borderRadius: 10, border: "none",
    cursor: dis ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.92rem",
    background: dis ? "#444" : `linear-gradient(135deg,${A1},${A2})`,
    color: "#fff", opacity: dis ? 0.55 : 1,
    boxShadow: dis ? "none" : `0 4px 18px ${A1}40`, whiteSpace: "nowrap",
  });

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'Segoe UI',sans-serif", color: cl(dark, "text"), transition: "background 0.3s" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(13,13,26,0.92)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${cl(dark, "border")}`, padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, gap: "0.5rem" }}>
        <div onClick={() => setPage("home")} style={{ fontSize: "1.4rem", fontWeight: 900, background: `linear-gradient(135deg,${A1},${A2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "pointer", letterSpacing: "-0.02em" }}>TextifyAI</div>
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
          {["home", "pricing"].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ padding: "0.32rem 0.85rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: page === p ? `linear-gradient(135deg,${A1},${A2})` : "transparent", color: page === p ? "#fff" : cl(dark, "muted") }}>
              {p === "home" ? "Tools" : "Pricing"}
            </button>
          ))}
          <button onClick={() => setDark(!dark)} style={{ padding: "0.32rem 0.6rem", borderRadius: 8, border: "none", cursor: "pointer", background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", fontSize: "0.95rem" }}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => { localStorage.removeItem("tfy_key"); setApiKey(""); }} style={{ padding: "0.32rem 0.8rem", borderRadius: 8, border: `1px solid ${cl(dark, "border")}`, cursor: "pointer", background: "transparent", color: cl(dark, "muted"), fontSize: "0.75rem", fontWeight: 600 }}>Key</button>
          <button style={btn(false)} onClick={() => setPage("pricing")}>Get Pro →</button>
        </div>
      </nav>

      {page === "home" && <>
        <div style={{ textAlign: "center", padding: "4.5rem 1.25rem 2.5rem", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "inline-block", padding: "0.25rem 0.9rem", borderRadius: 999, background: dark ? "rgba(108,71,255,0.14)" : "rgba(108,71,255,0.09)", border: `1px solid ${dark ? "rgba(108,71,255,0.35)" : "rgba(108,71,255,0.25)"}`, color: A1, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "1.25rem" }}>✦ Professional AI Writing Tools</div>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3.6rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            Write Better, <span style={{ background: `linear-gradient(135deg,${A1},${A2},${A3})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Smarter & Faster</span>
          </h1>
          <p style={{ fontSize: "1.05rem", color: cl(dark, "muted"), maxWidth: 500, margin: "0 auto 2rem", lineHeight: 1.65 }}>Bypass AI detectors, fix grammar, detect AI content, and summarize — professional-grade accuracy.</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button style={btn(false)} onClick={() => taRef.current?.focus()}>Try For Free →</button>
            <button onClick={() => setPage("pricing")} style={{ padding: "0.6rem 1.6rem", borderRadius: 10, border: `1.5px solid ${cl(dark, "border")}`, cursor: "pointer", fontWeight: 600, fontSize: "0.92rem", background: "transparent", color: cl(dark, "text") }}>View Plans</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: "0.8rem", maxWidth: 1000, margin: "0 auto 2rem", padding: "0 1.25rem" }}>
          {TOOLS.map(tk => (
            <div key={tk.id} onClick={() => { setTool(tk.id); setOutput(null); setError(null); }} style={{ padding: "1.2rem", borderRadius: 16, border: `1.5px solid ${tool === tk.id ? tk.color : cl(dark, "border")}`, background: tool === tk.id ? (dark ? `${tk.color}14` : `${tk.color}08`) : cl(dark, "card"), cursor: "pointer", transition: "all 0.15s", boxShadow: tool === tk.id ? `0 0 0 1px ${tk.color}30,0 8px 28px ${tk.color}18` : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${tk.color}20`, border: `1px solid ${tk.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", marginBottom: "0.6rem" }}>{tk.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.18rem" }}>{tk.label}</div>
              <div style={{ fontSize: "0.78rem", color: cl(dark, "muted") }}>{tk.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 920, margin: "0 auto 4rem", padding: "0 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.8rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${active.color}20`, border: `1px solid ${active.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{active.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem" }}>{active.label}</div>
              <div style={{ fontSize: "0.78rem", color: cl(dark, "muted") }}>{active.desc}</div>
            </div>
          </div>
          <div style={{ background: cl(dark, "card"), border: `1px solid ${cl(dark, "border")}`, borderRadius: 18, overflow: "hidden", boxShadow: dark ? "0 18px 55px rgba(0,0,0,0.38)" : "0 18px 55px rgba(108,71,255,0.07)" }}>
            <textarea ref={taRef} style={{ width: "100%", minHeight: 185, padding: "1.1rem", background: "transparent", border: "none", color: cl(dark, "text"), fontSize: "1rem", lineHeight: 1.7, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} placeholder={active.ph} value={input} onChange={e => setInput(e.target.value)} />
            <div style={{ padding: "0.65rem 1rem", background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)", borderTop: `1px solid ${cl(dark, "border")}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: cl(dark, "muted") }}>{wc} words · {input.length} chars</span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {input && <button onClick={() => { setInput(""); setOutput(null); setError(null); }} style={{ padding: "0.4rem 0.85rem", borderRadius: 8, border: `1px solid ${cl(dark, "border")}`, cursor: "pointer", background: "transparent", color: cl(dark, "muted"), fontSize: "0.8rem" }}>Clear</button>}
                <button style={btn(loading || !input.trim())} onClick={run} disabled={loading || !input.trim()}>
                  {loading ? <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />Processing…</span> : `Run ${active.label} →`}
                </button>
              </div>
            </div>
          </div>
          {error && <div style={{ marginTop: "0.8rem", padding: "0.9rem 1rem", borderRadius: 12, background: `${DANGER}12`, border: `1px solid ${DANGER}35`, color: DANGER, fontSize: "0.88rem" }}>⚠️ {error}</div>}
          {output && (
            <div style={{ marginTop: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: cl(dark, "muted"), textTransform: "uppercase", letterSpacing: "0.08em" }}>Result</div>
                <button onClick={copy} style={{ padding: "0.25rem 0.7rem", borderRadius: 8, border: `1px solid ${cl(dark, "border")}`, cursor: "pointer", background: copied ? `${SUCCESS}18` : "transparent", color: copied ? SUCCESS : cl(dark, "muted"), fontSize: "0.76rem", fontWeight: 600 }}>{copied ? "✓ Copied!" : "Copy"}</button>
              </div>
              {output.type === "text" && <div style={{ padding: "1.2rem", borderRadius: 14, background: dark ? "rgba(108,71,255,0.07)" : "rgba(108,71,255,0.04)", border: `1px solid ${A1}25`, lineHeight: 1.78, whiteSpace: "pre-wrap" }}>{output.value}</div>}
              {output.type === "grammar" && <GrammarOut d={output.value} dark={dark} />}
              {output.type === "detector" && <DetectorOut d={output.value} dark={dark} />}
              {output.type === "summarizer" && <SummarizerOut d={output.value} dark={dark} />}
            </div>
          )}
        </div>

        <div style={{ maxWidth: 920, margin: "0 auto 5rem", padding: "0 1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "0.8rem" }}>
          {[["🎯","Strict Detection","Turnitin-level accuracy"],["✍️","Human Bypass","Pass Originality.ai & GPTZero"],["⚡","Instant Results","Professional results in seconds"],["🔒","100% Private","Your text is never stored"]].map(([icon, label, desc]) => (
            <div key={label} style={{ padding: "1rem", borderRadius: 13, background: cl(dark, "card"), border: `1px solid ${cl(dark, "border")}`, display: "flex", gap: "0.65rem" }}>
              <span style={{ fontSize: "1.3rem" }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.86rem" }}>{label}</div>
                <div style={{ fontSize: "0.76rem", color: cl(dark, "muted") }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {page === "pricing" && <>
        <div style={{ textAlign: "center", padding: "4.5rem 1.25rem 2.5rem", maxWidth: 660, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,3.2rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "0.9rem" }}>
            Simple, <span style={{ background: `linear-gradient(135deg,${A1},${A2},${A3})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Transparent Pricing</span>
          </h1>
          <p style={{ fontSize: "1rem", color: cl(dark, "muted"), lineHeight: 1.65 }}>Professional AI writing tools. Cancel anytime. No hidden fees.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(265px,1fr))", gap: "1.1rem", maxWidth: 960, margin: "0 auto 4rem", padding: "0 1.25rem" }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ padding: "2rem", borderRadius: 20, position: "relative", border: `2px solid ${plan.badge ? A1 : cl(dark, "border")}`, background: plan.badge ? (dark ? `linear-gradient(135deg,${A1}16,${A2}16)` : `linear-gradient(135deg,${A1}09,${A2}09)`) : cl(dark, "card"), boxShadow: plan.badge ? `0 8px 38px ${A1}28` : "none" }}>
              {plan.badge && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg,${A1},${A2})`, color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "0.2rem 0.9rem", borderRadius: 999, whiteSpace: "nowrap" }}>{plan.badge}</div>}
              <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: cl(dark, "muted"), marginBottom: "0.35rem" }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: plan.savings ? "0.2rem" : "1.1rem" }}>
                <span style={{ fontSize: "2.8rem", fontWeight: 900, letterSpacing: "-0.03em", color: plan.badge ? A1 : cl(dark, "text") }}>{plan.price}</span>
                <span style={{ color: cl(dark, "muted"), fontSize: "0.9rem" }}>{plan.period}</span>
              </div>
              {plan.savings && <div style={{ fontSize: "0.76rem", fontWeight: 600, color: SUCCESS, marginBottom: "1.1rem" }}>🎉 {plan.savings}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.6rem" }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: "0.5rem" }}>
                    <span style={{ color: SUCCESS, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: "0.86rem" }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href={STRIPE_LINKS[plan.id]} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "0.7rem", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", background: plan.badge ? `linear-gradient(135deg,${A1},${A2})` : "transparent", border: plan.badge ? "none" : `1.5px solid ${cl(dark, "border")}`, color: plan.badge ? "#fff" : cl(dark, "text"), boxShadow: plan.badge ? `0 4px 18px ${A1}38` : "none" }}>
                Get Started →
              </a>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 640, margin: "0 auto 5rem", padding: "0 1.25rem" }}>
          <h2 style={{ textAlign: "center", fontSize: "1.55rem", fontWeight: 800, marginBottom: "1.5rem" }}>Common Questions</h2>
          {[
            ["Can I cancel anytime?", "Yes — cancel instantly with no fees or penalties from your account dashboard."],
            ["How accurate is the AI detector?", "Our detector checks perplexity, burstiness, and 10+ linguistic signals to match Turnitin and Originality.ai standards."],
            ["Does the humanizer bypass AI detectors?", "Yes. It applies advanced rewriting techniques specifically designed to pass Turnitin, Originality.ai, and GPTZero."],
            ["What payment methods do you accept?", "All major credit/debit cards, PayPal, Apple Pay and Google Pay via Stripe."],
            ["Is my text private?", "100%. Your text is never stored, logged, or used for training. All processing is encrypted."],
          ].map(([q, a]) => (
            <div key={q} style={{ padding: "1.1rem 1.25rem", borderRadius: 13, background: cl(dark, "card"), border: `1px solid ${cl(dark, "border")}`, marginBottom: "0.65rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>{q}</div>
              <div style={{ fontSize: "0.87rem", color: cl(dark, "muted") }}>{a}</div>
            </div>
          ))}
        </div>
      </>}

      <footer style={{ borderTop: `1px solid ${cl(dark, "border")}`, padding: "1.75rem", textAlign: "center", color: cl(dark, "muted"), fontSize: "0.8rem" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 900, background: `linear-gradient(135deg,${A1},${A2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.35rem" }}>TextifyAI</div>
        <div>© 2025 TextifyAI. All rights reserved. · <a href="#" style={{ color: cl(dark, "muted") }}>Privacy Policy</a> · <a href="#" style={{ color: cl(dark, "muted") }}>Terms of Service</a></div>
      </footer>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
