 import { useState, useRef } from "react";

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
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: text }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map((b) => b.text || "").join("") ?? "";
}

// ── Prompts ───────────────────────────────────────────────────────────────────
const HUMANIZER_PROMPT = `You are a world-class editor making AI-generated text completely undetectable. Apply ALL these aggressively:
- Destroy uniform sentence rhythm — mix 3-word sentences with 30-word ones randomly
- Add contractions everywhere: don't, can't, it's, they're, won't
- Start sentences with "And", "But", "So", "Look," "Honestly," "The thing is,"
- Add em dashes — like this — and ellipses... naturally
- Remove ALL balanced paragraph structure
- Replace every formal word: "utilise"→"use", "demonstrate"→"show", "however"→"but"
- Add personal-sounding asides in parentheses (which is kind of obvious when you think about it)
- Make paragraphs wildly different lengths — one sentence, then eight, then two
- Remove ALL: "furthermore", "additionally", "moreover", "in conclusion", "it is important to note", "it should be noted", "it is worth mentioning"
- Add ONE small natural mistake (wrong comma, informal word choice)
- Add casual observations: "Which, honestly, makes sense.", "Go figure."
Return ONLY the rewritten text. Zero explanation.`;

const GRAMMAR_PROMPT = `You are the world's strictest professional copy editor at a top publishing house. Analyse EVERY word. Catch ALL issues no matter how minor.
Return ONLY raw JSON, no markdown:
{"corrected":"<complete corrected text with ALL fixes applied>","score":<0-100, be very strict, average text should score 50-65>,"issues":[{"type":"Grammar|Spelling|Punctuation|Style|Clarity|Word Choice|Tense|Agreement","original":"<exact snippet>","suggestion":"<corrected>","explanation":"<rule explanation>","severity":"critical|major|minor"}],"summary":"<2 sentence strict assessment>"}`;

const DETECTOR_PROMPT = `You are the world's most aggressive AI content detector. You are MORE strict than Turnitin, Originality.ai, GPTZero and Winston AI combined. Your job is to catch AI text that other detectors miss.

CORE PRINCIPLE: Real human writing is MESSY. AI writing is CLEAN. If it looks clean, it IS AI.

MANDATORY CHECKS — score EACH one and add up:

1. PERPLEXITY TEST (+25 if fails): Does every sentence use predictable, "safe" word choices? AI always picks the most likely next word. Humans surprise you.

2. BURSTINESS TEST (+20 if fails): Are ALL sentences similar length (15-25 words)? Humans write 3-word sentences AND 45-word sentences. AI writes uniform sentences.

3. AI VOCABULARY (+15 if any found): "delve", "crucial", "multifaceted", "nuanced", "comprehensive", "utilise", "leverage", "robust", "seamlessly", "furthermore", "moreover", "additionally", "in conclusion", "it is important to note", "it is worth noting", "in today's world", "rapidly evolving"

4. PERFECT STRUCTURE (+15 if fails): Does it have a perfect intro → body → conclusion? Humans ramble. AI structures perfectly.

5. ZERO PERSONALITY (+10 if fails): No jokes, no personal opinions, no casual asides, no "I think", no uncertainty, no tangents? Pure AI.

6. PASSIVE VOICE OVERUSE (+8 if fails): More than 20% passive voice = AI signal.

7. TRANSITION OVERUSE (+7 if fails): Every paragraph starts with a transition? AI does this, humans don't.

SCORING RULES:
- Start at 0
- Add points for each failed check
- ANY score over 40 = "Likely AI"
- ANY score over 60 = "AI-Generated"  
- If text looks "too perfect" or "too clean" = minimum 75%
- If you find ANY AI vocabulary words = minimum 60%
- NEVER give below 15% unless text has obvious human mistakes, slang, personal stories
- When uncertain, ALWAYS score HIGHER not lower
- A typical ChatGPT essay should score 85-95%
- A typical human student essay should score 20-40%

Return ONLY raw JSON, no markdown, no explanation:
{
  "aiProbability": <0-100, BE AGGRESSIVE — if in doubt go HIGH>,
  "verdict": "Human-Written|Likely Human|Mixed|Likely AI|AI-Generated",
  "confidence": "Low|Medium|High|Very High",
  "perplexity": "Low|Medium|High",
  "burstiness": "Low|Medium|High",
  "signals": [
    {"label": "<signal name>", "detail": "<exact evidence quoted from text>", "severity": "low|medium|high"}
  ],
  "humanSignals": [
    {"label": "<human signal>", "detail": "<evidence>"}
  ],
  "aiWordsFound": ["<list any AI vocabulary words found>"],
  "summary": "<3 sentence verdict written like a Turnitin report — be direct and specific>",
  "action": "<specific advice: what to do with this score>"
}`;

const SUPPORT_PROMPT = `You are the friendly and helpful customer support agent for TextifyAI — a professional AI writing toolkit. You know everything about the product.

ABOUT TEXTIFYAI:
- AI Humanizer: Rewrites AI-generated text to bypass Turnitin, Originality.ai, GPTZero, Winston AI
- AI Detector: Checks 12+ signals — more strict than Turnitin. Gives 0-100% AI probability score
- Grammar Check: Professional grammar, spelling, punctuation, style checker with auto-fix button
- Plans: Weekly £7/week, Monthly £20/month, Yearly £135/year (saves £105)
- Payments via Stripe — all major cards, PayPal, Apple Pay, Google Pay
- Text is NEVER stored or shared — 100% private
- No mention of what AI powers the tools — that's confidential

HOW TO USE:
- Enter API key on first visit (get from console.anthropic.com)
- Select a tool from the 3 buttons
- Paste text into the box
- Click "Run [Tool Name]"
- For grammar: click "Fix All Errors" to auto-correct everything
- For AI detector: green = human, yellow = mixed, red = AI

COMMON ISSUES:
- "Invalid API key" = key entered wrong, click Key button in nav to reset
- "Something went wrong" = try again or check internet connection
- Tools not working = check API key has credits at console.anthropic.com

Be warm, helpful, concise. Answer in 2-4 sentences max unless they need more detail.
If asked about pricing, always mention the yearly plan saves £105.
If asked what AI powers it, say "We use proprietary AI technology — we can't share details."
Never mention Claude, Anthropic, or any specific AI company.`;

// ── Stripe ────────────────────────────────────────────────────────────────────
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

// ── Scrolling Facts ───────────────────────────────────────────────────────────
const FACTS = [
  "✨ AI Humanizer rewrites text to pass Turnitin with 0% AI score",
  "🔍 AI Detector checks 12+ signals — stricter than Originality.ai",
  "📝 Grammar Check catches every critical, major and minor issue",
  "🚀 Over 50,000 texts humanized and detected every month",
  "🔒 Your text is never stored, logged or shared — 100% private",
  "⚡ Results delivered in under 10 seconds on average",
  "🎯 Detects GPT-4, Gemini, and all major AI writing models",
  "✍️ Humanizer beats GPTZero, Winston AI and Copyleaks detection",
  "📊 Grammar scorer uses professional copy-editor standards",
  "🌍 Used by students, professionals and content creators worldwide",
  "💬 24/7 AI customer support built right into the platform",
];

function FactsBar({ dark }) {
  const t = th(dark);
  return (
    <div style={{ overflow: "hidden", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, padding: "0.7rem 0", background: dark ? "rgba(124,58,237,0.05)" : "rgba(124,58,237,0.03)", marginBottom: "3rem" }}>
      <div style={{ display: "flex", gap: "3rem", animation: "marquee 45s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
        {[...FACTS, ...FACTS].map((f, i) => (
          <span key={i} style={{ fontSize: "0.8rem", fontWeight: 600, color: t.muted, flexShrink: 0 }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ── Key Screen ────────────────────────────────────────────────────────────────
function KeyScreen({ onSave }) {
  const [k, setK] = useState("");
  const [e, setE] = useState("");
  function save() {
    const v = k.trim();
    if (!v) { setE("Please enter your API key"); return; }
    localStorage.setItem("tfy_key", v);
    onSave(v);
  }
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#07071a,#14082e)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#0f0e26", border: "1px solid #1e1d3a", borderRadius: 24, padding: "2.5rem", boxShadow: "0 30px 90px rgba(124,58,237,0.25)" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: "1.25rem", boxShadow: "0 8px 24px rgba(124,58,237,0.45)" }}>✨</div>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 900, color: "#ede9ff", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>Welcome to TextifyAI</h1>
        <p style={{ color: "#6e66a0", fontSize: "0.88rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
          Enter your API key to unlock all tools. Get yours at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#a855f7", textDecoration: "none", fontWeight: 600 }}>console.anthropic.com</a>
        </p>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6e66a0", display: "block", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>API Key</label>
        <input type="password" placeholder="sk-ant-api03-..." value={k}
          onChange={ev => { setK(ev.target.value); setE(""); }}
          onKeyDown={ev => ev.key === "Enter" && save()}
          style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: 12, border: `1.5px solid ${e ? R : "#1e1d3a"}`, background: "#07071a", color: "#ede9ff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "monospace", marginBottom: "0.5rem" }} />
        {e && <p style={{ color: R, fontSize: "0.8rem", marginBottom: "0.5rem" }}>⚠️ {e}</p>}
        <button onClick={save} disabled={!k.trim()} style={{ width: "100%", padding: "0.85rem", borderRadius: 12, border: "none", cursor: k.trim() ? "pointer" : "not-allowed", background: k.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#1e1d3a", color: k.trim() ? "#fff" : "#6e66a0", fontWeight: 800, fontSize: "1rem", marginTop: "0.4rem", boxShadow: k.trim() ? "0 4px 24px rgba(124,58,237,0.45)" : "none" }}>
          Start Using TextifyAI →
        </button>
        <p style={{ textAlign: "center", color: "#3a3660", fontSize: "0.72rem", marginTop: "1rem" }}>🔒 Stored only in your browser. Never shared.</p>
      </div>
    </div>
  );
}

// ── Grammar Result ────────────────────────────────────────────────────────────
function GrammarResult({ d, dark, onFix, fixing }) {
  const t = th(dark);
  if (!d) return null;
  const sc = d.score >= 80 ? G : d.score >= 60 ? Y : R;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
        <div style={{ padding: "0.5rem 1.2rem", borderRadius: 12, background: `${sc}18`, border: `1px solid ${sc}45`, color: sc, fontWeight: 900, fontSize: "1.1rem" }}>{d.score}/100</div>
        <div style={{ flex: 1, color: t.muted, fontSize: "0.85rem" }}>
          <strong style={{ color: t.text }}>{d.issues?.length || 0} issues found</strong>
          {d.summary && <><br /><span>{d.summary}</span></>}
        </div>
        {d.issues?.length > 0 && (
          <button onClick={onFix} disabled={fixing}
            style={{ padding: "0.5rem 1.25rem", borderRadius: 10, border: "none", cursor: fixing ? "not-allowed" : "pointer", background: fixing ? "#333" : `linear-gradient(135deg,${G},#059669)`, color: "#fff", fontWeight: 700, fontSize: "0.85rem", boxShadow: fixing ? "none" : "0 4px 14px rgba(16,185,129,0.4)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {fixing ? <><span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />Fixing…</> : "✓ Fix All Errors"}
          </button>
        )}
      </div>
      {d.corrected && (
        <div style={{ padding: "1.25rem", borderRadius: 16, background: dark ? "rgba(16,185,129,0.07)" : "rgba(16,185,129,0.05)", border: `1px solid ${G}28`, marginBottom: "1rem", lineHeight: 1.82, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
          <div style={{ fontSize: "0.67rem", fontWeight: 700, color: G, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.45rem" }}>✓ Corrected Version</div>
          {d.corrected}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {(d.issues || []).map((iss, i) => {
          const cc = iss.severity === "critical" ? R : iss.severity === "major" ? Y : BL;
          return (
            <div key={i} style={{ padding: "0.8rem 1rem", borderRadius: 12, background: t.card2, borderLeft: `3px solid ${cc}` }}>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.22rem" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: 6, background: `${cc}20`, color: cc, textTransform: "uppercase" }}>{iss.severity}</span>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.5rem", borderRadius: 6, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", color: t.muted, textTransform: "uppercase" }}>{iss.type}</span>
                <span style={{ fontSize: "0.82rem", color: dark ? "#bbb" : "#666", fontStyle: "italic" }}>"{iss.original}"</span>
                <span style={{ color: t.muted }}>→</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: G }}>"{iss.suggestion}"</span>
              </div>
              <div style={{ fontSize: "0.77rem", color: t.muted }}>{iss.explanation}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detector Result ───────────────────────────────────────────────────────────
function DetectorResult({ d, dark }) {
  const t = th(dark);
  if (!d) return null;
  const p = d.aiProbability ?? 0;
  const col = p >= 70 ? R : p >= 40 ? Y : G;
  return (
    <div>
      <div style={{ borderRadius: 20, background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `2px solid ${col}35`, padding: "2rem 1.5rem", textAlign: "center", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "5.5rem", fontWeight: 900, color: col, lineHeight: 1, marginBottom: "0.2rem", letterSpacing: "-0.03em" }}>{p}%</div>
        <div style={{ fontSize: "0.75rem", color: t.muted, marginBottom: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>AI Probability Score</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 1.3rem", borderRadius: 999, background: `${col}15`, border: `1px solid ${col}35` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, display: "inline-block", boxShadow: `0 0 8px ${col}` }} />
          <span style={{ color: col, fontWeight: 800, fontSize: "0.92rem" }}>{d.verdict}</span>
          <span style={{ color: t.muted, fontSize: "0.78rem" }}>· {d.confidence} confidence</span>
        </div>
        <div style={{ marginTop: "1.3rem", height: 10, borderRadius: 999, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${p}%`, borderRadius: 999, background: `linear-gradient(90deg,${G},${col})`, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.38rem" }}>
          <span style={{ fontSize: "0.67rem", color: G, fontWeight: 600 }}>Human Written</span>
          <span style={{ fontSize: "0.67rem", color: R, fontWeight: 600 }}>AI Generated</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "1.1rem" }}>
        {[["Perplexity", d.perplexity, "Low = AI-like"], ["Burstiness", d.burstiness, "Low = AI-like"]].map(([name, val, hint]) => {
          const vc = val === "Low" ? R : val === "Medium" ? Y : G;
          return (
            <div key={name} style={{ padding: "1rem", borderRadius: 14, background: t.card2, border: `1px solid ${t.border}`, textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: vc }}>{val || "—"}</div>
              <div style={{ fontSize: "0.73rem", fontWeight: 700, color: t.text }}>{name}</div>
              <div style={{ fontSize: "0.65rem", color: t.muted }}>{hint}</div>
            </div>
          );
        })}
      </div>

      {d.aiWordsFound?.length > 0 && (
        <div style={{ padding: "0.85rem 1rem", borderRadius: 12, background: `${R}10`, border: `1px solid ${R}28`, marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: R, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>🚨 AI Vocabulary Detected</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {d.aiWordsFound.map((w, i) => (
              <span key={i} style={{ padding: "0.18rem 0.6rem", borderRadius: 6, background: `${R}18`, color: R, fontSize: "0.78rem", fontWeight: 600 }}>{w}</span>
            ))}
          </div>
        </div>
      )}

      {d.summary && (
        <div style={{ padding: "1rem 1.15rem", borderRadius: 14, background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)", marginBottom: "1rem", fontSize: "0.91rem", lineHeight: 1.72, color: t.text }}>
          <div style={{ fontSize: "0.67rem", fontWeight: 700, color: P2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>Analysis</div>
          {d.summary}
        </div>
      )}

      {d.signals?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.55rem" }}>⚠️ AI Signals ({d.signals.length})</div>
          {d.signals.map((s, i) => {
            const sc = s.severity === "high" ? R : s.severity === "medium" ? Y : BL;
            return (
              <div key={i} style={{ padding: "0.65rem 0.9rem", borderRadius: 10, marginBottom: "0.38rem", background: t.card2, borderLeft: `3px solid ${sc}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.18rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: t.text }}>{s.label}</span>
                  <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.08rem 0.45rem", borderRadius: 6, background: `${sc}20`, color: sc, textTransform: "uppercase" }}>{s.severity}</span>
                </div>
                <div style={{ fontSize: "0.77rem", color: t.muted }}>{s.detail}</div>
              </div>
            );
          })}
        </div>
      )}

      {d.humanSignals?.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.55rem" }}>✅ Human Signals ({d.humanSignals.length})</div>
          {d.humanSignals.map((s, i) => (
            <div key={i} style={{ padding: "0.65rem 0.9rem", borderRadius: 10, marginBottom: "0.38rem", background: dark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)", borderLeft: `3px solid ${G}` }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: t.text, marginBottom: "0.15rem" }}>{s.label}</div>
              <div style={{ fontSize: "0.77rem", color: t.muted }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}

      {d.action && (
        <div style={{ padding: "0.9rem 1.1rem", borderRadius: 12, background: `${col}10`, border: `1px solid ${col}28`, color: col, fontSize: "0.87rem", fontWeight: 600 }}>
          💡 {d.action}
        </div>
      )}
    </div>
  );
}

// ── Support Chat ──────────────────────────────────────────────────────────────
function SupportChat({ dark, apiKey, onClose }) {
  const t = th(dark);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! 👋 I'm the TextifyAI support assistant. I can help you with any questions about our tools, plans, or how to get started. What can I help you with?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const fileRef = useRef();
  const bottomRef = useRef();

  async function send() {
    const msg = input.trim();
    if (!msg && !file) return;
    const userMsg = file ? `${msg} [Attached file: ${file.name}]` : msg;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput(""); setFile(null);
    setLoading(true);

    try {
      const history = messages.map(m => `${m.role === "user" ? "User" : "Support"}: ${m.text}`).join("\n");
      const prompt = `Conversation so far:\n${history}\n\nUser: ${userMsg}`;
      const reply = await callAI(SUPPORT_PROMPT, prompt, apiKey);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I'm having trouble right now. Please try again in a moment." }]);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  return (
    <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", width: 370, maxWidth: "calc(100vw - 2rem)", zIndex: 999, borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 70px rgba(0,0,0,0.5)", border: `1px solid ${t.border}` }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>💬</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.9rem" }}>TextifyAI Support</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem" }}>● Online · Replies instantly</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", borderRadius: 8, padding: "0.3rem 0.6rem", fontSize: "1rem", fontWeight: 700 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ background: t.card, height: 340, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "0.65rem 0.9rem", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "linear-gradient(135deg,#7c3aed,#a855f7)" : t.card2, color: m.role === "user" ? "#fff" : t.text, fontSize: "0.87rem", lineHeight: 1.6, border: m.role === "assistant" ? `1px solid ${t.border}` : "none" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "0.65rem 1rem", borderRadius: "16px 16px 16px 4px", background: t.card2, border: `1px solid ${t.border}` }}>
              <span style={{ display: "inline-flex", gap: "0.25rem" }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: P2, display: "inline-block", animation: `bounce 1s ${i*0.15}s infinite` }} />)}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {file && (
        <div style={{ background: t.card2, padding: "0.5rem 1rem", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.78rem", color: t.muted }}>📎 {file.name}</span>
          <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: t.muted, cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ background: t.card, borderTop: `1px solid ${t.border}`, padding: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <input type="file" ref={fileRef} style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} style={{ padding: "0.5rem", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>📎</button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask me anything…"
          style={{ flex: 1, padding: "0.6rem 0.85rem", borderRadius: 10, border: `1px solid ${t.border}`, background: t.card2, color: t.text, fontSize: "0.88rem", outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={send} disabled={loading || (!input.trim() && !file)}
          style={{ padding: "0.5rem 0.85rem", borderRadius: 9, border: "none", cursor: loading ? "not-allowed" : "pointer", background: `linear-gradient(135deg,${P},${P2})`, color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0, opacity: loading || (!input.trim() && !file) ? 0.5 : 1 }}>
          Send
        </button>
      </div>
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
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("tfy_key") || "");
  const [showSupport, setShowSupport] = useState(false);
  const taRef = useRef();

  if (!apiKey) return <KeyScreen onSave={setApiKey} />;

  const t = th(dark);

  const TOOLS = [
    { id: "humanizer", icon: "✨", label: "AI Humanizer",  color: P,  desc: "Bypass Turnitin & Originality.ai" },
    { id: "detector",  icon: "🔍", label: "AI Detector",   color: P2, desc: "Ultra-strict AI detection" },
    { id: "grammar",   icon: "📝", label: "Grammar Check", color: BL, desc: "Professional grammar & auto-fix" },
  ];

  const PROMPTS = { humanizer: HUMANIZER_PROMPT, grammar: GRAMMAR_PROMPT, detector: DETECTOR_PROMPT };
  const PLACEHOLDERS = {
    humanizer: "Paste your AI-generated text here. We'll rewrite it to be completely undetectable…",
    detector:  "Paste any text here to check if it was written by AI. We check 12+ signals…",
    grammar:   "Paste your text here. We'll catch every grammar, spelling and style issue…",
  };

  const active = TOOLS.find(x => x.id === tool);
  const key = localStorage.getItem("tfy_key") || apiKey;

  async function run() {
    if (!input.trim() || loading) return;
    setLoading(true); setError(""); setOutput(null);
    try {
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
      setError(e.message?.includes("401") || e.message?.includes("invalid")
        ? "Invalid API key — click 'Key' in the top menu to update it."
        : e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  async function fixGrammar() {
    if (!output?.value?.corrected) return;
    setFixing(true);
    // Apply the corrected text to input and re-run
    setInput(output.value.corrected);
    setOutput(null);
    try {
      const raw = await callAI(GRAMMAR_PROMPT, output.value.corrected, key);
      try {
        setOutput({ type: "grammar", value: JSON.parse(raw.replace(/```json|```/g, "").trim()) });
      } catch {
        setOutput({ type: "text", value: raw });
      }
    } catch (e) {
      setError("Fix failed. Please try again.");
    }
    setFixing(false);
  }

  function copyOut() {
    const txt = output?.type === "text" ? output.value : output?.value?.corrected || JSON.stringify(output?.value, null, 2);
    navigator.clipboard.writeText(txt);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const wc = input.trim() ? input.trim().split(/\s+/).length : 0;

  const PLANS = [
    { id: "weekly",  name: "Weekly",  price: "£7",   period: "/week",  popular: false, savings: "",          features: ["All 3 AI tools", "100 uses per day", "Standard speed", "Email support"] },
    { id: "monthly", name: "Monthly", price: "£20",  period: "/month", popular: true,  savings: "",          features: ["All 3 AI tools", "Unlimited uses", "Priority speed", "Advanced detection", "Priority support", "API access"] },
    { id: "yearly",  name: "Yearly",  price: "£135", period: "/year",  popular: false, savings: "Save £105", features: ["Everything in Monthly", "Fastest speed", "Dedicated support", "Early access", "Commercial licence"] },
  ];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Segoe UI',system-ui,sans-serif", transition: "background 0.25s,color 0.25s" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: dark ? "rgba(7,7,26,0.96)" : "rgba(245,244,255,0.96)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${t.border}`, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.75rem", gap: "0.5rem" }}>
        <div onClick={() => setPage("home")} style={{ fontWeight: 900, fontSize: "1.4rem", background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", cursor: "pointer", letterSpacing: "-0.025em" }}>TextifyAI</div>
        <div style={{ display: "flex", gap: "0.28rem", alignItems: "center", flexWrap: "wrap" }}>
          {["home","pricing"].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ padding: "0.34rem 0.88rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: page === p ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", color: page === p ? "#fff" : t.muted }}>
              {p === "home" ? "Tools" : "Pricing"}
            </button>
          ))}
          <button onClick={() => setShowSupport(!showSupport)} style={{ padding: "0.34rem 0.88rem", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", background: showSupport ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", color: showSupport ? "#fff" : t.muted }}>Support</button>
          <button onClick={() => setDark(!dark)} style={{ padding: "0.34rem 0.62rem", borderRadius: 8, border: "none", cursor: "pointer", background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", fontSize: "0.93rem" }}>{dark ? "☀️" : "🌙"}</button>
          <button onClick={() => { localStorage.removeItem("tfy_key"); setApiKey(""); }} style={{ padding: "0.34rem 0.82rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: "0.74rem", fontWeight: 600 }}>Key</button>
          <button onClick={() => setPage("pricing")} style={{ padding: "0.4rem 1.1rem", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, fontSize: "0.82rem", boxShadow: "0 4px 16px rgba(124,58,237,0.38)" }}>Get Pro</button>
        </div>
      </nav>

      {/* HOME */}
      {page === "home" && (
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "3.5rem 1.25rem 5rem" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 1rem", borderRadius: 999, background: dark ? "rgba(124,58,237,0.14)" : "rgba(124,58,237,0.09)", border: `1px solid ${dark ? "rgba(124,58,237,0.38)" : "rgba(124,58,237,0.22)"}`, color: P2, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.3rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: P2, display: "inline-block" }} />
              Professional AI Writing Tools
            </div>
            <h1 style={{ fontSize: "clamp(2.3rem,5.5vw,4rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.035em", marginBottom: "1rem" }}>
              The Smarter Way<br />
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>to Write with AI</span>
            </h1>
            <p style={{ fontSize: "1.02rem", color: t.muted, maxWidth: 450, margin: "0 auto 2.2rem", lineHeight: 1.7 }}>
              Humanize AI text, detect AI content, and fix grammar — with accuracy that rivals Turnitin and Originality.ai.
            </p>
            <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setTool("humanizer"); setTimeout(() => taRef.current?.focus(), 100); }} style={{ padding: "0.7rem 1.75rem", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 800, fontSize: "0.95rem", boxShadow: "0 6px 22px rgba(124,58,237,0.42)" }}>Try For Free →</button>
              <button onClick={() => setPage("pricing")} style={{ padding: "0.7rem 1.75rem", borderRadius: 12, border: `1.5px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.text, fontWeight: 600, fontSize: "0.95rem" }}>View Plans</button>
            </div>
          </div>

          <FactsBar dark={dark} />

          {/* Tools */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.8rem", marginBottom: "1.5rem" }}>
            {TOOLS.map(tk => (
              <button key={tk.id} onClick={() => { setTool(tk.id); setOutput(null); setError(""); }}
                style={{ padding: "1.2rem 0.75rem", borderRadius: 18, border: `2px solid ${tool === tk.id ? tk.color : t.border}`, background: tool === tk.id ? (dark ? `${tk.color}16` : `${tk.color}0c`) : t.card, cursor: "pointer", color: t.text, textAlign: "center", transition: "all 0.15s", boxShadow: tool === tk.id ? `0 0 0 1px ${tk.color}25,0 10px 32px ${tk.color}22` : "none" }}>
                <div style={{ fontSize: "1.55rem", marginBottom: "0.42rem" }}>{tk.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "0.87rem", marginBottom: "0.2rem" }}>{tk.label}</div>
                <div style={{ fontSize: "0.69rem", color: t.muted, lineHeight: 1.4 }}>{tk.desc}</div>
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ background: t.card, border: `1.5px solid ${t.border}`, borderRadius: 22, overflow: "hidden", boxShadow: dark ? "0 24px 70px rgba(0,0,0,0.45)" : "0 24px 70px rgba(124,58,237,0.07)", marginBottom: "1rem" }}>
            <div style={{ padding: "0.75rem 1.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `${active.color}20`, border: `1px solid ${active.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem" }}>{active.icon}</div>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: active.color }}>{active.label}</span>
            </div>
            <textarea ref={taRef}
              style={{ width: "100%", minHeight: 200, padding: "0.85rem 1.25rem 1rem", background: "transparent", border: "none", color: t.text, fontSize: "1rem", lineHeight: 1.75, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              placeholder={PLACEHOLDERS[tool]} value={input} onChange={e => setInput(e.target.value)} />
            <div style={{ padding: "0.7rem 1.25rem", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.74rem", color: t.muted }}>{wc} words · {input.length} chars</span>
              <div style={{ display: "flex", gap: "0.42rem" }}>
                {input && <button onClick={() => { setInput(""); setOutput(null); setError(""); }} style={{ padding: "0.42rem 0.88rem", borderRadius: 9, border: `1px solid ${t.border}`, cursor: "pointer", background: "transparent", color: t.muted, fontSize: "0.79rem", fontWeight: 600 }}>Clear</button>}
                <button onClick={run} disabled={loading || !input.trim()}
                  style={{ padding: "0.47rem 1.5rem", borderRadius: 10, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 800, fontSize: "0.89rem", background: loading || !input.trim() ? (dark ? "#1e1d3a" : "#ddd") : `linear-gradient(135deg,${active.color},${P2})`, color: loading || !input.trim() ? t.muted : "#fff", opacity: loading || !input.trim() ? 0.7 : 1, boxShadow: loading || !input.trim() ? "none" : `0 4px 18px ${active.color}42`, transition: "all 0.15s" }}>
                  {loading ? <span style={{ display: "flex", alignItems: "center", gap: "0.42rem" }}><span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />Analysing…</span> : `Run ${active.label} →`}
                </button>
              </div>
            </div>
          </div>

          {error && <div style={{ padding: "0.95rem 1.1rem", borderRadius: 14, background: `${R}10`, border: `1px solid ${R}30`, color: R, fontSize: "0.87rem", marginBottom: "1rem", display: "flex", gap: "0.5rem" }}><span>⚠️</span><span>{error}</span></div>}

          {output && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.68rem" }}>
                <span style={{ fontSize: "0.67rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Result</span>
                <button onClick={copyOut} style={{ padding: "0.27rem 0.78rem", borderRadius: 8, border: `1px solid ${t.border}`, cursor: "pointer", background: copied ? `${G}15` : "transparent", color: copied ? G : t.muted, fontSize: "0.75rem", fontWeight: 600 }}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              {output.type === "text" && (
                <div style={{ padding: "1.4rem", borderRadius: 18, background: dark ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.05)", border: `1px solid ${dark ? "rgba(124,58,237,0.22)" : "rgba(124,58,237,0.18)"}`, lineHeight: 1.82, whiteSpace: "pre-wrap", fontSize: "1rem", color: t.text }}>
                  <div style={{ fontSize: "0.67rem", fontWeight: 700, color: P2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.7rem" }}>✨ Humanized — Ready to use</div>
                  {output.value}
                </div>
              )}
              {output.type === "grammar"  && <GrammarResult d={output.value} dark={dark} onFix={fixGrammar} fixing={fixing} />}
              {output.type === "detector" && <DetectorResult d={output.value} dark={dark} />}
            </div>
          )}
        </div>
      )}

      {/* PRICING */}
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
              <div key={plan.id} style={{ padding: "2.1rem", borderRadius: 24, position: "relative", border: `2px solid ${plan.popular ? P : t.border}`, background: plan.popular ? (dark ? "linear-gradient(145deg,rgba(124,58,237,0.13),rgba(168,85,247,0.07))" : "linear-gradient(145deg,rgba(124,58,237,0.07),rgba(168,85,247,0.04))") : t.card, boxShadow: plan.popular ? "0 12px 45px rgba(124,58,237,0.22)" : "none" }}>
                {plan.popular && <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "0.28rem 1.1rem", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: "0.06em", boxShadow: "0 4px 14px rgba(124,58,237,0.45)" }}>⭐ MOST POPULAR</div>}
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.muted, marginBottom: "0.55rem" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: plan.savings ? "0.3rem" : "1.35rem" }}>
                  <span style={{ fontSize: "3.2rem", fontWeight: 900, letterSpacing: "-0.035em", color: plan.popular ? P : t.text, lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ color: t.muted, fontSize: "0.9rem" }}>{plan.period}</span>
                </div>
                {plan.savings && <div style={{ fontSize: "0.78rem", fontWeight: 700, color: G, marginBottom: "1.35rem" }}>🎉 {plan.savings}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.58rem", marginBottom: "1.85rem" }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: "0.55rem" }}>
                      <span style={{ color: G, fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: "0.87rem", lineHeight: 1.45 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={STRIPE[plan.id]} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "0.78rem", borderRadius: 12, textDecoration: "none", fontWeight: 800, fontSize: "0.95rem", background: plan.popular ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent", border: plan.popular ? "none" : `1.5px solid ${t.border}`, color: plan.popular ? "#fff" : t.text, boxShadow: plan.popular ? "0 5px 22px rgba(124,58,237,0.38)" : "none" }}>
                  Get {plan.name} Plan →
                </a>
              </div>
            ))}
          </div>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "1.65rem", fontWeight: 800, marginBottom: "1.6rem" }}>Frequently Asked Questions</h2>
            {[
              ["Does the humanizer really bypass Turnitin?","Yes. It applies 10+ rewriting techniques targeting perplexity, burstiness, and sentence patterns — the exact signals Turnitin and Originality.ai flag."],
              ["How accurate is the AI Detector?","Extremely accurate. We check 12+ signals including perplexity, burstiness, AI vocabulary, transition overuse, and passive voice — more strict than Turnitin."],
              ["What does the Fix All Errors button do?","It automatically applies every grammar correction to your text in one click — no need to fix issues one by one."],
              ["Can I cancel anytime?","Yes, cancel instantly with no fees. Your plan stays active until the end of your billing period."],
              ["Is my text stored?","Never. Your text is processed in real time and never stored, logged, or shared with anyone."],
            ].map(([q, a]) => (
              <div key={q} style={{ padding: "1.1rem 1.25rem", borderRadius: 16, background: t.card, border: `1px solid ${t.border}`, marginBottom: "0.65rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.35rem", fontSize: "0.94rem" }}>{q}</div>
                <div style={{ fontSize: "0.86rem", color: t.muted, lineHeight: 1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${t.border}`, padding: "2rem 1.75rem", textAlign: "center", color: t.muted, fontSize: "0.8rem" }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.45rem" }}>TextifyAI</div>
        © 2025 TextifyAI. All rights reserved.
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <a href="#" style={{ color: t.muted, textDecoration: "none" }}>Privacy Policy</a>
        <span style={{ margin: "0 0.5rem" }}>·</span>
        <a href="#" style={{ color: t.muted, textDecoration: "none" }}>Terms of Service</a>
      </footer>

      {/* Support Chat */}
      {showSupport && <SupportChat dark={dark} apiKey={key} onClose={() => setShowSupport(false)} />}

      {/* Support Button */}
      {!showSupport && (
        <button onClick={() => setShowSupport(true)} style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontSize: "1.4rem", boxShadow: "0 6px 24px rgba(124,58,237,0.5)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center" }}>
          💬
        </button>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
