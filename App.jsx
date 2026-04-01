import { useState, useRef } from "react";

async function callClaude(apiKey, systemPrompt, userText) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map((b) => b.text || "").join("") ?? "";
}

const PROMPTS = {
  humanizer: `You are an expert AI text humanizer. Transform the given AI-generated text to sound completely natural, warm, and human-written. Vary sentence structure organically, add natural transitions, remove robotic patterns. Preserve the original meaning. Return ONLY the humanized text, no preamble.`,
  grammar: `You are a professional grammar editor. Analyze the text and return raw JSON only (no markdown fences):
{"corrected":"<full corrected text>","issues":[{"type":"Grammar|Punctuation|Style|Spelling","original":"<snippet>","suggestion":"<fix>","explanation":"<why>"}],"score":<0-100>}`,
  detector: `You are an AI content detector. Analyze and return raw JSON only (no markdown):
{"aiProbability":<0-100>,"verdict":"Human-Written|Likely Human|Mixed|Likely AI|AI-Generated","signals":[{"label":"<n>","description":"<finding>","severity":"low|medium|high"}],"summary":"<2 sentences>"}`,
  summarizer: `You are a text summarizer. Return raw JSON only (no markdown):
{"summary":"<3-5 sentence summary>","keyPoints":["<point1>","<point2>","<point3>"],"wordCount":{"original":<n>,"summary":<n>,"reduction":"<percent>"}}`,
};

const A1 = "#6c47ff", A2 = "#a855f7", A3 = "#38bdf8";
const SUCCESS = "#22c55e", WARNING = "#f59e0b", DANGER = "#ef4444";

const TOOLS = [
  { id:"humanizer", label:"AI Humanizer", icon:"✨", color:A1, desc:"Make AI text sound human", ph:"Paste AI-generated text here to humanize it…" },
  { id:"grammar",   label:"Grammar Check", icon:"📝", color:SUCCESS, desc:"Fix grammar, spelling & style", ph:"Paste text here to check grammar…" },
  { id:"detector",  label:"AI Detector",  icon:"🔍", color:A2, desc:"Detect if text is AI-written", ph:"Paste text here to check if it's AI-generated…" },
  { id:"summarizer",label:"Summarizer",   icon:"⚡", color:A3, desc:"Condense long content", ph:"Paste long text here to summarize…" },
];

const PLANS = [
  { name:"Weekly",  price:"£7",   period:"/week",  badge:null,          savings:null,        features:["All AI tools","50 requests/day","Standard speed","Email support"] },
  { name:"Monthly", price:"£20",  period:"/month", badge:"Most Popular", savings:null,        features:["All features","Unlimited requests","Priority processing","API access","Priority support"] },
  { name:"Yearly",  price:"£135", period:"/year",  badge:null,          savings:"Save £105", features:["Everything in Monthly","Fastest processing","Extended limits","Dedicated support","Early feature access"] },
];

function tok(dark, key) {
  const m = {
    bg:      { light:"#f4f3ff", dark:"#0d0d1a" },
    card:    { light:"#fff",    dark:"#1a1a35" },
    border:  { light:"#e0dcff", dark:"#2a2a4a" },
    text:    { light:"#1a1035", dark:"#e8e4ff" },
    muted:   { light:"#6b5fa8", dark:"#8877cc" },
  };
  return m[key][dark ? "dark" : "light"];
}

function GrammarOut({ d, dark }) {
  if (!d) return null;
  const sc = d.score >= 80 ? SUCCESS : d.score >= 60 ? WARNING : DANGER;
  return (
    <div>
      <div style={{ display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap", marginBottom:"1rem" }}>
        <div style={{ padding:"0.5rem 1rem", borderRadius:10, background:`${sc}22`, border:`1px solid ${sc}44`, color:sc, fontWeight:800, fontSize:"1.05rem" }}>
          Score: {d.score}/100
        </div>
        <span style={{ color:tok(dark,"muted"), fontSize:"0.85rem" }}>{d.issues?.length||0} issue{d.issues?.length!==1?"s":""} found</span>
      </div>
      {d.corrected && (
        <div style={{ padding:"1.25rem", borderRadius:14, background:dark?"rgba(34,197,94,0.07)":"rgba(34,197,94,0.05)", border:`1px solid ${SUCCESS}30`, marginBottom:"1rem", lineHeight:1.75, whiteSpace:"pre-wrap" }}>
          <div style={{ fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.08em", color:SUCCESS, textTransform:"uppercase", marginBottom:"0.4rem" }}>Corrected</div>
          {d.corrected}
        </div>
      )}
      {d.issues?.map((iss,i)=>{
        const tc = iss.type==="Grammar"?DANGER:iss.type==="Style"?A2:iss.type==="Spelling"?WARNING:A3;
        return (
          <div key={i} style={{ padding:"0.75rem 1rem", borderRadius:10, marginBottom:"0.5rem", background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", borderLeft:`3px solid ${tc}`, border:`1px solid ${tc}25` }}>
            <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", marginBottom:"0.2rem", alignItems:"center" }}>
              <span style={{ fontSize:"0.68rem", fontWeight:700, padding:"0.1rem 0.5rem", borderRadius:6, background:`${tc}20`, color:tc, textTransform:"uppercase" }}>{iss.type}</span>
              <span style={{ fontSize:"0.82rem", fontStyle:"italic", color:dark?"#bbb":"#555" }}>"{iss.original}"</span>
              <span style={{ color:tok(dark,"muted") }}>→</span>
              <span style={{ fontSize:"0.82rem", fontWeight:600, color:SUCCESS }}>"{iss.suggestion}"</span>
            </div>
            <div style={{ fontSize:"0.78rem", color:tok(dark,"muted") }}>{iss.explanation}</div>
          </div>
        );
      })}
    </div>
  );
}

function DetectorOut({ d, dark }) {
  if (!d) return null;
  const p = d.aiProbability ?? 0;
  const bc = p>=70?DANGER:p>=40?WARNING:SUCCESS;
  return (
    <div>
      <div style={{ textAlign:"center", padding:"1.5rem", borderRadius:14, background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", border:`1px solid ${bc}30`, marginBottom:"1rem" }}>
        <div style={{ fontSize:"3rem", fontWeight:900, color:bc, lineHeight:1 }}>{p}%</div>
        <div style={{ fontSize:"0.78rem", color:tok(dark,"muted"), margin:"0.25rem 0 0.6rem" }}>AI Probability</div>
        <div style={{ display:"inline-block", padding:"0.3rem 1rem", borderRadius:999, background:`${bc}20`, color:bc, fontWeight:700, fontSize:"0.88rem" }}>{d.verdict}</div>
        <div style={{ marginTop:"0.9rem", height:8, borderRadius:999, background:dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${p}%`, borderRadius:999, background:`linear-gradient(90deg,${SUCCESS},${bc})`, transition:"width 0.8s" }}/>
        </div>
      </div>
      {d.summary && <div style={{ padding:"1rem 1.25rem", borderRadius:14, background:dark?"rgba(108,71,255,0.07)":"rgba(108,71,255,0.04)", border:`1px solid ${A1}25`, marginBottom:"0.75rem", fontSize:"0.92rem", lineHeight:1.7 }}>{d.summary}</div>}
      {d.signals?.map((s,i)=>{
        const sc2 = s.severity==="high"?DANGER:s.severity==="medium"?WARNING:SUCCESS;
        return (
          <div key={i} style={{ padding:"0.65rem 1rem", borderRadius:10, marginBottom:"0.5rem", background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)", borderLeft:`3px solid ${sc2}`, border:`1px solid ${sc2}25` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.2rem" }}>
              <span style={{ fontWeight:700, fontSize:"0.83rem" }}>{s.label}</span>
              <span style={{ fontSize:"0.68rem", fontWeight:700, padding:"0.1rem 0.5rem", borderRadius:6, background:`${sc2}20`, color:sc2, textTransform:"uppercase" }}>{s.severity}</span>
            </div>
            <div style={{ fontSize:"0.78rem", color:tok(dark,"muted") }}>{s.description}</div>
          </div>
        );
      })}
    </div>
  );
}

function SummarizerOut({ d, dark }) {
  if (!d) return null;
  return (
    <div>
      {d.summary && (
        <div style={{ padding:"1.25rem", borderRadius:14, background:dark?"rgba(56,189,248,0.07)":"rgba(56,189,248,0.05)", border:`1px solid ${A3}30`, marginBottom:"1rem", lineHeight:1.75 }}>
          <div style={{ fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.08em", color:A3, textTransform:"uppercase", marginBottom:"0.4rem" }}>Summary</div>
          {d.summary}
        </div>
      )}
      {d.keyPoints?.length>0 && (
        <div style={{ marginBottom:"1rem" }}>
          <div style={{ fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.07em", color:tok(dark,"muted"), textTransform:"uppercase", marginBottom:"0.5rem" }}>Key Points</div>
          {d.keyPoints.map((pt,i)=>(
            <div key={i} style={{ display:"flex", gap:"0.6rem", padding:"0.55rem 0.9rem", borderRadius:10, marginBottom:"0.4rem", background:dark?"rgba(56,189,248,0.06)":"rgba(56,189,248,0.05)", border:`1px solid ${A3}25` }}>
              <span style={{ color:A3, fontWeight:800 }}>{i+1}.</span>
              <span style={{ fontSize:"0.88rem" }}>{pt}</span>
            </div>
          ))}
        </div>
      )}
      {d.wordCount && (
        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
          {[["Original",d.wordCount.original,null],["Summary",d.wordCount.summary,null],["Reduction",d.wordCount.reduction,SUCCESS]].map(([lbl,val,c])=>(
            <div key={lbl} style={{ flex:1, minWidth:90, padding:"0.75rem", borderRadius:10, background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", border:`1px solid ${tok(dark,"border")}`, textAlign:"center" }}>
              <div style={{ fontSize:"1.15rem", fontWeight:800, color:c||(dark?tok(dark,"text"):tok(false,"text")) }}>{val}</div>
              <div style={{ fontSize:"0.72rem", color:tok(dark,"muted") }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── API Key Setup Screen ──────────────────────────────────────────────────────
function ApiKeySetup({ dark, onSave }) {
  const [key, setKey] = useState("");
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem",
      background: dark ? "radial-gradient(ellipse at 20% 10%, #1a0f4a 0%, #0d0d1a 55%, #091628 100%)" : "radial-gradient(ellipse at 20% 10%, #ede9ff 0%, #f4f3ff 65%, #e8f4ff 100%)" }}>
      <div style={{ maxWidth:480, width:"100%", padding:"2.5rem", borderRadius:24, background:tok(dark,"card"), border:`1px solid ${tok(dark,"border")}`, boxShadow:dark?"0 20px 60px rgba(0,0,0,0.5)":"0 20px 60px rgba(108,71,255,0.1)" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"0.5rem" }}>✨</div>
        <h1 style={{ fontSize:"1.8rem", fontWeight:900, letterSpacing:"-0.02em", marginBottom:"0.5rem", color:tok(dark,"text") }}>Welcome to TextifyAI</h1>
        <p style={{ color:tok(dark,"muted"), fontSize:"0.92rem", lineHeight:1.6, marginBottom:"1.75rem" }}>
          To get started, enter your Anthropic API key. You can get one free at{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:A1 }}>console.anthropic.com</a>
        </p>
        <div style={{ marginBottom:"1rem" }}>
          <label style={{ fontSize:"0.8rem", fontWeight:700, color:tok(dark,"muted"), display:"block", marginBottom:"0.4rem" }}>ANTHROPIC API KEY</label>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={key}
            onChange={e=>setKey(e.target.value)}
            style={{ width:"100%", padding:"0.75rem 1rem", borderRadius:10, border:`1.5px solid ${tok(dark,"border")}`, background:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)", color:tok(dark,"text"), fontSize:"0.95rem", outline:"none", boxSizing:"border-box", fontFamily:"monospace" }}
          />
        </div>
        <button
          onClick={()=>{ if(key.trim()) { localStorage.setItem("textifyai_key", key.trim()); onSave(key.trim()); }}}
          disabled={!key.trim()}
          style={{ width:"100%", padding:"0.75rem", borderRadius:10, border:"none", cursor:key.trim()?"pointer":"not-allowed", fontWeight:700, fontSize:"1rem", background:key.trim()?`linear-gradient(135deg,${A1},${A2})`:"#555", color:"#fff", opacity:key.trim()?1:0.5 }}
        >
          Start Using TextifyAI →
        </button>
        <p style={{ fontSize:"0.75rem", color:tok(dark,"muted"), marginTop:"1rem", textAlign:"center" }}>
          🔒 Your key is stored only in your browser. Never sent to our servers.
        </p>
      </div>
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("textifyai_key") || "");
  const taRef = useRef();

  const active = TOOLS.find(t=>t.id===tool);

  if (!apiKey) return <ApiKeySetup dark={dark} onSave={setApiKey} />;

  async function run() {
    if (!input.trim()) return;
    setLoading(true); setError(null); setOutput(null);
    try {
      const raw = await callClaude(apiKey, PROMPTS[tool], input);
      if (tool==="humanizer") {
        setOutput({ type:"text", value:raw });
      } else {
        try {
          const clean = raw.replace(/```json|```/g,"").trim();
          setOutput({ type:tool, value:JSON.parse(clean) });
        } catch { setOutput({ type:"text", value:raw }); }
      }
    } catch(e) {
      if (e.message?.includes("401") || e.message?.includes("invalid")) {
        setError("Invalid API key. Please check your key and try again.");
      } else {
        setError(e.message||"Something went wrong.");
      }
    }
    finally { setLoading(false); }
  }

  function copyOutput() {
    const t = output?.type==="text" ? output.value : JSON.stringify(output?.value, null, 2);
    navigator.clipboard.writeText(t);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  const wc = input.trim() ? input.trim().split(/\s+/).length : 0;

  const bg = dark
    ? "radial-gradient(ellipse at 20% 10%, #1a0f4a 0%, #0d0d1a 55%, #091628 100%)"
    : "radial-gradient(ellipse at 20% 10%, #ede9ff 0%, #f4f3ff 65%, #e8f4ff 100%)";

  const btnPrimary = (dis) => ({
    padding:"0.6rem 1.6rem", borderRadius:10, border:"none",
    cursor:dis?"not-allowed":"pointer", fontWeight:700, fontSize:"0.92rem",
    background:dis?"#555":`linear-gradient(135deg,${A1},${A2})`,
    color:"#fff", opacity:dis?0.6:1,
    boxShadow:dis?"none":`0 4px 18px ${A1}40`, whiteSpace:"nowrap",
  });

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:tok(dark,"text"), transition:"background 0.3s" }}>
      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:dark?"rgba(13,13,26,0.88)":"rgba(255,255,255,0.88)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${tok(dark,"border")}`, padding:"0 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:62, gap:"0.75rem" }}>
        <div onClick={()=>setPage("home")} style={{ fontSize:"1.45rem", fontWeight:900, background:`linear-gradient(135deg,${A1},${A2})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", cursor:"pointer", letterSpacing:"-0.02em" }}>
          TextifyAI
        </div>
        <div style={{ display:"flex", gap:"0.4rem", alignItems:"center", flexWrap:"wrap" }}>
          {["home","pricing"].map(p=>(
            <button key={p} onClick={()=>setPage(p)} style={{ padding:"0.35rem 0.9rem", borderRadius:8, border:"none", cursor:"pointer", fontWeight:600, fontSize:"0.83rem", background:page===p?`linear-gradient(135deg,${A1},${A2})`:"transparent", color:page===p?"#fff":tok(dark,"muted") }}>
              {p==="home"?"Tools":"Pricing"}
            </button>
          ))}
          <button onClick={()=>setDark(!dark)} style={{ padding:"0.35rem 0.6rem", borderRadius:8, border:"none", cursor:"pointer", background:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)", fontSize:"1rem" }}>
            {dark?"☀️":"🌙"}
          </button>
          <button onClick={()=>{ localStorage.removeItem("textifyai_key"); setApiKey(""); }} style={{ padding:"0.35rem 0.9rem", borderRadius:8, border:`1px solid ${tok(dark,"border")}`, cursor:"pointer", fontWeight:600, fontSize:"0.78rem", background:"transparent", color:tok(dark,"muted") }}>
            Change Key
          </button>
        </div>
      </nav>

      {page==="home" && (
        <>
          {/* HERO */}
          <div style={{ textAlign:"center", padding:"5rem 1.5rem 3rem", maxWidth:780, margin:"0 auto" }}>
            <div style={{ display:"inline-block", padding:"0.28rem 1rem", borderRadius:999, background:dark?"rgba(108,71,255,0.14)":"rgba(108,71,255,0.09)", border:`1px solid ${dark?"rgba(108,71,255,0.35)":"rgba(108,71,255,0.25)"}`, color:A1, fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"1.4rem" }}>
              ✦ AI-Powered Writing Tools
            </div>
            <h1 style={{ fontSize:"clamp(2.2rem,5vw,3.8rem)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.03em", marginBottom:"1.1rem" }}>
              Write Better,{" "}
              <span style={{ background:`linear-gradient(135deg,${A1},${A2},${A3})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Smarter &amp; Faster
              </span>
            </h1>
            <p style={{ fontSize:"1.1rem", color:tok(dark,"muted"), maxWidth:520, margin:"0 auto 2.2rem", lineHeight:1.65 }}>
              Humanize AI text, fix grammar, detect AI content, and summarize anything — all in one beautiful workspace powered by Claude AI.
            </p>
          </div>

          {/* TOOL CARDS */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"0.9rem", maxWidth:1050, margin:"0 auto 2.5rem", padding:"0 1.5rem" }}>
            {TOOLS.map(t=>(
              <div key={t.id} onClick={()=>{ setTool(t.id); setOutput(null); setError(null); }} style={{ padding:"1.25rem", borderRadius:16, border:`1.5px solid ${tool===t.id?t.color:tok(dark,"border")}`, background:tool===t.id?(dark?`${t.color}14`:`${t.color}08`):tok(dark,"card"), cursor:"pointer", transition:"all 0.18s", boxShadow:tool===t.id?`0 0 0 1px ${t.color}30, 0 8px 28px ${t.color}18`:dark?"0 2px 10px rgba(0,0,0,0.28)":"0 2px 10px rgba(0,0,0,0.05)" }}>
                <div style={{ width:42, height:42, borderRadius:12, background:`${t.color}20`, border:`1px solid ${t.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", marginBottom:"0.65rem" }}>{t.icon}</div>
                <div style={{ fontWeight:700, marginBottom:"0.2rem" }}>{t.label}</div>
                <div style={{ fontSize:"0.82rem", color:tok(dark,"muted") }}>{t.desc}</div>
              </div>
            ))}
          </div>

          {/* WORK AREA */}
          <div style={{ maxWidth:950, margin:"0 auto 4rem", padding:"0 1.5rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.7rem", marginBottom:"0.9rem" }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${active.color}20`, border:`1px solid ${active.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>{active.icon}</div>
              <div>
                <div style={{ fontWeight:800, fontSize:"1.1rem" }}>{active.label}</div>
                <div style={{ fontSize:"0.82rem", color:tok(dark,"muted") }}>{active.desc}</div>
              </div>
            </div>

            <div style={{ background:tok(dark,"card"), border:`1px solid ${tok(dark,"border")}`, borderRadius:18, overflow:"hidden", boxShadow:dark?"0 18px 55px rgba(0,0,0,0.38)":"0 18px 55px rgba(108,71,255,0.07)" }}>
              <textarea ref={taRef} style={{ width:"100%", minHeight:190, padding:"1.2rem", background:"transparent", border:"none", color:tok(dark,"text"), fontSize:"1rem", lineHeight:1.7, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} placeholder={active.ph} value={input} onChange={e=>setInput(e.target.value)} />
              <div style={{ padding:"0.7rem 1.1rem", background:dark?"rgba(255,255,255,0.025)":"rgba(0,0,0,0.02)", borderTop:`1px solid ${tok(dark,"border")}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.6rem" }}>
                <span style={{ fontSize:"0.78rem", color:tok(dark,"muted") }}>{wc} words · {input.length} chars</span>
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  {input && <button onClick={()=>{ setInput(""); setOutput(null); setError(null); }} style={{ padding:"0.42rem 0.9rem", borderRadius:8, border:`1px solid ${tok(dark,"border")}`, cursor:"pointer", background:"transparent", color:tok(dark,"muted"), fontSize:"0.82rem" }}>Clear</button>}
                  <button style={btnPrimary(loading||!input.trim())} onClick={run} disabled={loading||!input.trim()}>
                    {loading ? <span style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                      <span style={{ width:13, height:13, border:"2px solid rgba(255,255,255,0.35)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.6s linear infinite" }}/>Processing…
                    </span> : `Run ${active.label} →`}
                  </button>
                </div>
              </div>
            </div>

            {error && <div style={{ marginTop:"0.9rem", padding:"1rem", borderRadius:12, background:`${DANGER}12`, border:`1px solid ${DANGER}35`, color:DANGER, fontSize:"0.88rem" }}>⚠️ {error}</div>}

            {output && (
              <div style={{ marginTop:"1.4rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.65rem" }}>
                  <div style={{ fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.08em", color:tok(dark,"muted"), textTransform:"uppercase" }}>Result</div>
                  <button onClick={copyOutput} style={{ padding:"0.28rem 0.75rem", borderRadius:8, border:`1px solid ${tok(dark,"border")}`, cursor:"pointer", background:copied?`${SUCCESS}18`:"transparent", color:copied?SUCCESS:tok(dark,"muted"), fontSize:"0.78rem", fontWeight:600 }}>
                    {copied?"✓ Copied!":"Copy"}
                  </button>
                </div>
                {output.type==="text" && <div style={{ padding:"1.25rem", borderRadius:14, background:dark?"rgba(108,71,255,0.07)":"rgba(108,71,255,0.04)", border:`1px solid ${A1}25`, lineHeight:1.78, whiteSpace:"pre-wrap" }}>{output.value}</div>}
                {output.type==="grammar" && <GrammarOut d={output.value} dark={dark}/>}
                {output.type==="detector" && <DetectorOut d={output.value} dark={dark}/>}
                {output.type==="summarizer" && <SummarizerOut d={output.value} dark={dark}/>}
              </div>
            )}
          </div>
        </>
      )}

      {page==="pricing" && (
        <>
          <div style={{ textAlign:"center", padding:"5rem 1.5rem 3rem", maxWidth:700, margin:"0 auto" }}>
            <h1 style={{ fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:900, lineHeight:1.1, letterSpacing:"-0.03em", marginBottom:"1rem" }}>
              Simple,{" "}
              <span style={{ background:`linear-gradient(135deg,${A1},${A2},${A3})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Transparent Pricing</span>
            </h1>
            <p style={{ fontSize:"1.05rem", color:tok(dark,"muted"), lineHeight:1.65 }}>Choose what works for you. Every plan includes all four AI tools.</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))", gap:"1.25rem", maxWidth:960, margin:"0 auto 5rem", padding:"0 1.5rem" }}>
            {PLANS.map(plan=>(
              <div key={plan.name} style={{ padding:"2rem", borderRadius:20, position:"relative", border:`2px solid ${plan.badge?A1:tok(dark,"border")}`, background:plan.badge?(dark?`linear-gradient(135deg,${A1}16,${A2}16)`:`linear-gradient(135deg,${A1}09,${A2}09)`):tok(dark,"card"), boxShadow:plan.badge?`0 8px 38px ${A1}28`:dark?"0 4px 18px rgba(0,0,0,0.28)":"0 4px 18px rgba(0,0,0,0.06)" }}>
                {plan.badge && <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", background:`linear-gradient(135deg,${A1},${A2})`, color:"#fff", fontSize:"0.72rem", fontWeight:800, padding:"0.22rem 1rem", borderRadius:999, whiteSpace:"nowrap" }}>{plan.badge}</div>}
                <div style={{ fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:tok(dark,"muted"), marginBottom:"0.4rem" }}>{plan.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:"0.2rem", marginBottom: plan.savings?"0.25rem":"1.25rem" }}>
                  <span style={{ fontSize:"2.8rem", fontWeight:900, letterSpacing:"-0.03em", color:plan.badge?A1:tok(dark,"text") }}>{plan.price}</span>
                  <span style={{ color:tok(dark,"muted"), fontSize:"0.92rem" }}>{plan.period}</span>
                </div>
                {plan.savings && <div style={{ fontSize:"0.78rem", fontWeight:600, color:SUCCESS, marginBottom:"1.25rem" }}>🎉 {plan.savings}</div>}
                <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem", marginBottom:"1.75rem" }}>
                  {plan.features.map(f=>(
                    <div key={f} style={{ display:"flex", gap:"0.55rem" }}>
                      <span style={{ color:SUCCESS, fontWeight:700, flexShrink:0 }}>✓</span>
                      <span style={{ fontSize:"0.87rem" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button style={{ ...btnPrimary(false), width:"100%", display:"block", background:plan.badge?`linear-gradient(135deg,${A1},${A2})`:"transparent", border:plan.badge?"none":`1.5px solid ${tok(dark,"border")}`, color:plan.badge?"#fff":tok(dark,"text"), boxShadow:plan.badge?`0 4px 18px ${A1}38`:"none" }}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <footer style={{ borderTop:`1px solid ${tok(dark,"border")}`, padding:"2rem", textAlign:"center", color:tok(dark,"muted"), fontSize:"0.83rem" }}>
        <div style={{ fontSize:"1.2rem", fontWeight:900, background:`linear-gradient(135deg,${A1},${A2})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"0.4rem" }}>TextifyAI</div>
        © 2025 TextifyAI. Built with ♥ using Claude AI.
      </footer>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
