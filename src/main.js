const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { exec } = require("child_process");
const pptxgen = require("pptxgenjs");

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".tsv",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".xml",
  ".yml",
  ".yaml",
  ".log"
]);

const MAX_BINARY_WRITE_BYTES = 10 * 1024 * 1024;
const MAX_SKILLS = 30;
const MAX_SKILL_CHARS = 6000;
const MAX_PPTX_SLIDES = 30;
const MAX_SEARCH_ROUNDS = 3;
const MAX_SEARCH_RESULTS = 6;
const MAX_FETCH_CHARS = 8000;

let mainWindow;
let workspaceRoot = null;
let appConfig = {
  workspaceRoot: null,
  approvalMode: "on-request"
};

function getConfigPath() {
  return path.join(app.getPath("userData"), "config.json");
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    appConfig = {
      workspaceRoot: parsed.workspaceRoot || null,
      approvalMode: parsed.approvalMode || "on-request"
    };

    if (appConfig.workspaceRoot && (await exists(appConfig.workspaceRoot))) {
      workspaceRoot = appConfig.workspaceRoot;
    }
  } catch {
    appConfig = { workspaceRoot: null, approvalMode: "on-request" };
  }
}

async function saveConfig() {
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(appConfig, null, 2), "utf8");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#f7f4ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(async () => {
  await loadConfig();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function ensureWorkspace() {
  if (!workspaceRoot) {
    throw new Error("Please choose a workspace folder first.");
  }
}

function resolveInsideWorkspace(relativePath) {
  ensureWorkspace();
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("Path cannot be empty.");
  }

  const normalized = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.resolve(workspaceRoot, normalized);
  const relative = path.relative(workspaceRoot, absolutePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escaped workspace and was blocked: ${relativePath}`);
  }

  return absolutePath;
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function makeBackup(targetPath) {
  if (!(await exists(targetPath))) return null;

  const backupRoot = path.join(workspaceRoot, ".agent-backups");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relative = path.relative(workspaceRoot, targetPath);
  const backupPath = path.join(backupRoot, stamp, relative);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.copyFile(targetPath, backupPath);
  return path.relative(workspaceRoot, backupPath);
}

async function walkFiles(root, dir = "", depth = 0, output = []) {
  if (depth > 4 || output.length >= 300) return output;

  const current = path.join(root, dir);
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".agent-backups") continue;

    const relative = path.join(dir, entry.name);
    const absolute = path.join(root, relative);

    if (entry.isDirectory()) {
      output.push({ type: "folder", path: relative });
      await walkFiles(root, relative, depth + 1, output);
    } else if (entry.isFile()) {
      const stat = await fs.stat(absolute);
      output.push({
        type: "file",
        path: relative,
        size: stat.size,
        ext: path.extname(entry.name).toLowerCase()
      });
    }
  }

  return output;
}

async function readTextSample(relativePath, limit = 4000) {
  const absolutePath = resolveInsideWorkspace(relativePath);
  const ext = path.extname(absolutePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) return "";

  const content = await fs.readFile(absolutePath, "utf8");
  return content.slice(0, limit);
}

function getConversationsDir() {
  ensureWorkspace();
  const hash = crypto.createHash("md5").update(workspaceRoot).digest("hex").slice(0, 12);
  return path.join(app.getPath("userData"), "conversations", hash);
}

function getGlobalSkillsDir() {
  return path.join(app.getPath("userData"), "skills");
}

function getWorkspaceSkillsDir() {
  ensureWorkspace();
  return path.join(workspaceRoot, ".agent-skills");
}

function sanitizeSkillName(name) {
  return String(name || "new-skill")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "new-skill";
}

async function readSkillsFromDir(dir, scope) {
  try {
    await fs.mkdir(dir, { recursive: true });
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const skills = [];

    for (const entry of entries) {
      if (skills.length >= MAX_SKILLS) break;

      let filePath = null;
      let name = null;

      if (entry.isDirectory()) {
        const skillPath = path.join(dir, entry.name, "SKILL.md");
        if (await exists(skillPath)) {
          filePath = skillPath;
          name = entry.name;
        }
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
        filePath = path.join(dir, entry.name);
        name = path.basename(entry.name, ".md");
      }

      if (!filePath) continue;
      const content = (await fs.readFile(filePath, "utf8")).slice(0, MAX_SKILL_CHARS);
      skills.push({
        name,
        scope,
        path: filePath,
        content
      });
    }

    return skills;
  } catch {
    return [];
  }
}

async function loadSkills() {
  const globalSkills = await readSkillsFromDir(getGlobalSkillsDir(), "global");
  const workspaceSkills = workspaceRoot ? await readSkillsFromDir(getWorkspaceSkillsDir(), "workspace") : [];
  return [...globalSkills, ...workspaceSkills].slice(0, MAX_SKILLS);
}

function formatSkillsForPrompt(skills) {
  if (!skills.length) return "No extra skills are installed.";

  return skills
    .map((skill) => {
      return `# Skill: ${skill.name}\nScope: ${skill.scope}\n\n${skill.content}`;
    })
    .join("\n\n---\n\n");
}

function buildSystemPrompt(skills) {
  return `You are a capable local file agent with web search access. Always respond with valid JSON only.

## Response Format
Return exactly one JSON object:
{
  "reply": "<Chinese explanation for the user>",
  "searches": [{"query": "<search query>", "reason": "<why>"}],
  "fetch_urls": [{"url": "<https://...>", "reason": "<why>"}],
  "operations": [<file operation objects>]
}

- If you need web info first: fill search fields and leave "operations" empty. Results arrive next round.
- If you have enough info: produce "operations" directly.
- Maximum ${MAX_SEARCH_ROUNDS} search rounds total.
- Always write "reply" in Chinese, matching user's language.

## Search Types
Use "searches" for quick web lookups (returns snippets, auto-reranked).
Use "agent_searches" for deep research — AI returns a synthesized answer with sources. Best for PPT content, reports, analysis.

## When to Search
- PPT / 演示文稿 / 幻灯片: ALWAYS use "agent_searches" first — returns richer, pre-summarized content per topic
- 报告 / 研究 / 总结: use "agent_searches" for key topics, "searches" for quick facts
- 技术文档 / 教程: "searches" for best practices
- Simple tasks (rename, copy, write given text): no search needed

## Installed Skills
${formatSkillsForPrompt(skills)}

When a user's request matches a skill, follow that skill's workflow exactly and state which skill you are applying in your reply.

## File Operations
mkdir: {"type":"mkdir","path":"<relative>"}
write_file: {"type":"write_file","path":"...","content":"<UTF-8 text>"}
write_binary_file: {"type":"write_binary_file","path":"...","contentBase64":"<base64>"}
rename_file: {"type":"rename_file","from":"...","to":"..."}
move_file: {"type":"move_file","from":"...","to":"..."}
copy_file: {"type":"copy_file","from":"...","to":"..."}
create_pptx: {"type":"create_pptx","path":"...","title":"...","slides":[...]}
run_indesign: {"type":"run_indesign","description":"<what the script does>","jsxCode":"<ExtendScript JSX>"}
Do not generate delete or shell commands.

## Adobe InDesign Automation (run_indesign)
Use run_indesign to control Adobe InDesign via ExtendScript (JSX). InDesign must be installed and ideally open.
Key JSX APIs:
- New doc: var doc = app.documents.add();
- Open: var doc = app.open(new File("/abs/path/file.indd"));
- Active doc: var doc = app.activeDocument;
- Add text frame: var tf = page.textFrames.add(); tf.geometricBounds=[top,left,bottom,right]; tf.contents="Hello";
- Place image: var rf = page.rectangles.add(); rf.geometricBounds=[t,l,b,r]; rf.place(new File("/abs/path/img.jpg"));
- Save: doc.save(new File("/abs/path/out.indd"));
- Export PDF: doc.exportFile(ExportFormat.PDF_TYPE, new File("/abs/path/out.pdf"), false);
- Close: doc.close(SaveOptions.NO);
- Set units: doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.MILLIMETERS;
Always use absolute paths. Wrap risky code in try/catch.

## PPT Themes
Add "theme" field to create_pptx to set the visual style. Choose based on topic:
- "ocean"    — teal/green, warm background — environment, health, education, calm topics
- "midnight" — dark navy blue — finance, corporate, government, serious topics
- "flame"    — red/orange — energy, marketing, food, urgency, sports
- "violet"   — purple — creativity, luxury, art, fashion, technology innovation
- "slate"    — dark gray-blue, minimal — SaaS, modern tech, startup, design
- "rose"     — pink/magenta — healthcare, beauty, lifestyle, social
- "forest"   — deep green — sustainability, agriculture, travel, environment
- "gold"     — amber/gold — luxury brand, awards, finance, tradition, history
If unsure, pick one that fits the mood. Never reuse the same theme twice in a session.

## PPT Best Practices
1. Research first — request searches to get current facts and statistics before generating slides
2. Structure — Title slide → Section dividers → Content slides → Summary/Conclusion
3. Layout variety — mix bullets, two-column, table, chart; never use all-bullets decks
4. Data — use chart-bar/chart-line/chart-pie when presenting numbers or trends
5. Focus — one key point per slide; aim for 10-16 slides for typical presentations
6. Language — match the user's language for all text; use Chinese for Chinese topics

## PPT Layouts (each slide MUST include "layout" field)
"title":      {layout:"title",title,subtitle?,notes?}
"section":    {layout:"section",title,subtitle?,notes?}
"bullets":    {layout:"bullets",title,bullets:[],subtitle?,notes?}
"two-column": {layout:"two-column",title,left:{title,bullets[]},right:{title,bullets[]},notes?}
"quote":      {layout:"quote",quote,author?,notes?}
"chart-bar":  {layout:"chart-bar",title,chart:{title?,labels:[],series:[{name,values:[]}]},notes?}
"chart-line": {layout:"chart-line",title,chart:{title?,labels:[],series:[{name,values:[]}]},notes?}
"chart-pie":  {layout:"chart-pie",title,chart:{title?,labels:[],values:[]},notes?}
"table":      {layout:"table",title,headers:[],rows:[[]],notes?}
"image-text": {layout:"image-text",title,imagePath,imagePosition:"left"|"right",body,notes?}`;
}

async function performWebSearch(query, apiKey) {
  if (!apiKey) throw new Error("未配置搜索 API Key，请在设置中填写博查（Bocha）API Key。");

  const res = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      count: MAX_SEARCH_RESULTS + 2,
      freshness: "noLimit",
      summary: false
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`博查搜索 API 错误: ${res.status} ${detail.slice(0, 120)}`);
  }

  const data = await res.json();
  return (data.data?.webPages?.value || []).slice(0, MAX_SEARCH_RESULTS).map((item) => ({
    title: item.name || "",
    snippet: item.snippet || "",
    url: item.url || ""
  }));
}

async function performAgentSearch(query, apiKey) {
  if (!apiKey) throw new Error("未配置博查 API Key。");

  const res = await fetch("https://api.bochaai.com/v1/agent-search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ query, freshness: "noLimit", count: MAX_SEARCH_RESULTS })
  });

  if (!res.ok) throw new Error(`Agent Search API 错误: ${res.status}`);

  const data = await res.json();
  return {
    answer: data.data?.answer || "",
    sources: (data.data?.sources || []).slice(0, MAX_SEARCH_RESULTS).map((s) => ({
      title: s.name || "",
      snippet: s.snippet || "",
      url: s.url || ""
    }))
  };
}

async function performRerank(query, documents, apiKey) {
  if (!apiKey || documents.length < 2) return documents;
  try {
    const res = await fetch("https://api.bochaai.com/v1/reranker", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        query,
        documents: documents.map((d) => `${d.title} ${d.snippet}`),
        top_n: Math.min(documents.length, MAX_SEARCH_RESULTS)
      })
    });
    if (!res.ok) return documents;
    const data = await res.json();
    const ranked = (data.data?.results || []).map((r) => documents[r.index]).filter(Boolean);
    return ranked.length ? ranked : documents;
  } catch {
    return documents;
  }
}

async function fetchUrlContent(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ResearchAgent/1.0)" },
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FETCH_CHARS);
}

async function runInDesignScript(jsxCode) {
  const tmpJsx = path.join(os.tmpdir(), `indesign_${Date.now()}.jsx`);
  await fs.writeFile(tmpJsx, jsxCode, "utf8");

  try {
    return await new Promise((resolve, reject) => {
      let cmd;
      if (process.platform === "darwin") {
        const safe = tmpJsx.replace(/'/g, "'\\''");
        cmd = `osascript -e 'tell application "Adobe InDesign" to do script POSIX file "${safe}" language javascript'`;
      } else {
        const safe = tmpJsx.replace(/\\/g, "\\\\");
        cmd = `powershell -NoProfile -Command "$app=$null;try{$app=[Runtime.InteropServices.Marshal]::GetActiveObject('InDesign.Application')}catch{};if(-not $app){foreach($v in @('InDesign.Application.2026','InDesign.Application.2025','InDesign.Application.2024','InDesign.Application.2023')){try{$app=New-Object -ComObject $v;break}catch{}}};if(-not $app){Write-Error 'InDesign not found';exit 1};$app.DoScript('${safe}',1246973031);Write-Output 'OK'"`;
      }
      exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr.trim() || err.message));
        resolve(stdout.trim() || "OK");
      });
    });
  } finally {
    try { await fs.unlink(tmpJsx); } catch {}
  }
}

async function callAI({ apiKey, searchApiKey, aiProvider, model, userMessage, manifest, skills, history = [], textAttachments = [], imageAttachments = [], otherAttachments = [], searchContext = [] }) {
  const provider = aiProvider || "deepseek";

  const payload = { userMessage, workspaceManifest: manifest };
  if (textAttachments.length) payload.referencedTextFiles = textAttachments;
  if (otherAttachments.length) payload.referencedOtherFiles = otherAttachments.map((f) => `${f.name} (${f.category}, ${Math.round(f.size / 1024)}KB)`);
  if (searchContext.length) payload.webResearchResults = searchContext;

  const userTurn = imageAttachments.length
    ? { role: "user", content: [{ type: "text", text: JSON.stringify(payload) }, ...imageAttachments.map((img) => ({ type: "image_url", image_url: { url: img.dataUrl } }))] }
    : { role: "user", content: JSON.stringify(payload) };

  const messages = [
    { role: "system", content: buildSystemPrompt(skills) },
    ...history.slice(-20).map((msg) => ({ role: msg.role, content: msg.content })),
    userTurn
  ];

  let endpoint, headers, resolvedModel;
  if (provider === "bocha") {
    if (!searchApiKey) throw new Error("请填写博查 API Key。");
    endpoint = "https://api.bochaai.com/v1/chat/completions";
    headers = { "Content-Type": "application/json", "Authorization": `Bearer ${searchApiKey}` };
    resolvedModel = model || "deepseek-v4";
  } else {
    if (!apiKey) throw new Error("请填写 DeepSeek API Key。");
    endpoint = "https://api.deepseek.com/chat/completions";
    headers = { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` };
    resolvedModel = model || "deepseek-v4-flash";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: resolvedModel, response_format: { type: "json_object" }, messages, temperature: 0.2 })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI 请求失败 (${provider}): ${response.status} ${detail}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回内容为空。");

  try {
    const parsed = JSON.parse(content);
    return {
      reply: (parsed.reply || "").trim() || "已生成计划。",
      searches: Array.isArray(parsed.searches) ? parsed.searches : [],
      agent_searches: Array.isArray(parsed.agent_searches) ? parsed.agent_searches : [],
      fetch_urls: Array.isArray(parsed.fetch_urls) ? parsed.fetch_urls : [],
      operations: Array.isArray(parsed.operations) ? parsed.operations : []
    };
  } catch {
    return { reply: content.trim() || "已生成计划。", searches: [], agent_searches: [], fetch_urls: [], operations: [] };
  }
}

async function runAgentLoop({ apiKey, searchApiKey, aiProvider, model, userMessage, manifest, skills, history, textAttachments, imageAttachments, otherAttachments }) {
  let loopHistory = [...(history || [])];
  let searchContext = [];
  let firstRound = true;

  for (let round = 0; round < MAX_SEARCH_ROUNDS; round++) {
    const result = await callAI({
      apiKey, searchApiKey, aiProvider, model, userMessage, manifest, skills,
      history: loopHistory,
      textAttachments: firstRound ? textAttachments : [],
      imageAttachments: firstRound ? imageAttachments : [],
      otherAttachments: firstRound ? otherAttachments : [],
      searchContext
    });
    firstRound = false;

    const hasSearches = result.searches.length > 0;
    const hasAgentSearches = result.agent_searches.length > 0;
    const hasFetches = result.fetch_urls.length > 0;

    if (!hasSearches && !hasAgentSearches && !hasFetches) {
      return result;
    }

    const newContext = [];

    for (const s of result.searches) {
      if (mainWindow) mainWindow.webContents.send("agent:progress", { type: "search", query: s.query });
      try {
        let results = await performWebSearch(s.query, searchApiKey);
        results = await performRerank(s.query, results, searchApiKey);
        newContext.push({ type: "search_results", query: s.query, results });
      } catch (e) {
        newContext.push({ type: "search_results", query: s.query, error: e.message });
      }
    }

    for (const s of result.agent_searches) {
      if (mainWindow) mainWindow.webContents.send("agent:progress", { type: "agent_search", query: s.query });
      try {
        const res = await performAgentSearch(s.query, searchApiKey);
        newContext.push({ type: "agent_search_result", query: s.query, ...res });
      } catch (e) {
        newContext.push({ type: "agent_search_result", query: s.query, error: e.message });
      }
    }

    for (const f of result.fetch_urls) {
      if (mainWindow) mainWindow.webContents.send("agent:progress", { type: "fetch", url: f.url });
      try {
        const content = await fetchUrlContent(f.url);
        newContext.push({ type: "url_content", url: f.url, content });
      } catch (e) {
        newContext.push({ type: "url_content", url: f.url, error: e.message });
      }
    }

    searchContext = [...searchContext, ...newContext];
    loopHistory = [
      ...loopHistory,
      { role: "assistant", content: result.reply },
      { role: "user", content: `Web research results:\n${JSON.stringify(newContext, null, 2).slice(0, 12000)}` }
    ];

    if (mainWindow) mainWindow.webContents.send("agent:progress", { type: "round_done", round: round + 1, total: newContext.length });
  }

  return callAI({
    apiKey, searchApiKey, aiProvider, model, userMessage,
    manifest: { files: manifest.files, installedSkills: manifest.installedSkills },
    skills, history: loopHistory, searchContext
  });
}

function validateOperation(operation) {
  const allowed = new Set(["mkdir", "write_file", "write_binary_file", "create_pptx", "rename_file", "move_file", "copy_file", "run_indesign"]);
  if (!operation || !allowed.has(operation.type)) {
    throw new Error(`Unsupported operation: ${operation?.type || "unknown"}`);
  }

  if (operation.path) resolveInsideWorkspace(operation.path);
  if (operation.from) resolveInsideWorkspace(operation.from);
  if (operation.to) resolveInsideWorkspace(operation.to);

  if (operation.type === "write_file" && typeof operation.content !== "string") {
    throw new Error("write_file must include content.");
  }

  if (operation.type === "write_binary_file") {
    if (typeof operation.contentBase64 !== "string") {
      throw new Error("write_binary_file must include contentBase64.");
    }

    const compactBase64 = operation.contentBase64.replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compactBase64) || compactBase64.length % 4 !== 0) {
      throw new Error("write_binary_file contentBase64 is not valid base64.");
    }

    const estimatedBytes = Math.floor((compactBase64.length * 3) / 4);
    if (estimatedBytes > MAX_BINARY_WRITE_BYTES) {
      throw new Error(`Binary write is too large. Max: ${MAX_BINARY_WRITE_BYTES / 1024 / 1024} MB.`);
    }
  }

  if (operation.type === "create_pptx") {
    if (!Array.isArray(operation.slides) || operation.slides.length === 0) {
      throw new Error("create_pptx must include a non-empty slides array.");
    }

    if (operation.slides.length > MAX_PPTX_SLIDES) {
      throw new Error(`create_pptx supports at most ${MAX_PPTX_SLIDES} slides.`);
    }
  }
}

const PPTX_THEMES = {
  ocean:    { bg: "F7F4EF", ink: "24211D", accent: "116A66", accentDark: "0B4F4C", muted: "5F6B66", white: "FFFFFF", accentLight: "D4EBE9", altRow: "EDE9E3", chart: ["116A66","8A4B12","5F6B66","2C8B85","C4722E","3D6B68","A67C52","4A90B8"], hStyle: "bar" },
  midnight: { bg: "EEF1F8", ink: "0D1B3E", accent: "1A3A6E", accentDark: "0D2145", muted: "4A5A7A", white: "FFFFFF", accentLight: "C5D3F0", altRow: "DDE4F5", chart: ["1A3A6E","E53E3E","38A169","D69E2E","805AD5","DD6B20","0BC5EA","F687B3"], hStyle: "sidebar" },
  flame:    { bg: "FDF6F0", ink: "2C1810", accent: "C0392B", accentDark: "922B21", muted: "7B6560", white: "FFFFFF", accentLight: "FAD7D3", altRow: "F5E8E4", chart: ["C0392B","E67E22","F1C40F","2C3E50","8E44AD","27AE60","16A085","D35400"], hStyle: "diagonal" },
  violet:   { bg: "F8F4FF", ink: "1A0F2E", accent: "6B3FA0", accentDark: "4A2472", muted: "6B5E7A", white: "FFFFFF", accentLight: "DDD0F5", altRow: "EDE5FF", chart: ["6B3FA0","E91E8C","00BCD4","FF9800","4CAF50","F44336","2196F3","FF5722"], hStyle: "bar" },
  slate:    { bg: "F2F4F7", ink: "1A202C", accent: "2D4A6E", accentDark: "1A2F46", muted: "718096", white: "FFFFFF", accentLight: "BEE3F8", altRow: "E2E8F0", chart: ["2D4A6E","E53E3E","38A169","ECC94B","9F7AEA","ED8936","0BC5EA","FC8181"], hStyle: "line" },
  rose:     { bg: "FFF5F7", ink: "2D1520", accent: "C2185B", accentDark: "880E4F", muted: "7A5168", white: "FFFFFF", accentLight: "F8BBD9", altRow: "FCE4EC", chart: ["C2185B","7B1FA2","1565C0","00838F","2E7D32","E65100","6D4C41","455A64"], hStyle: "sidebar" },
  forest:   { bg: "F4F9F4", ink: "1B2E1B", accent: "2E7D32", accentDark: "1B5E20", muted: "546E54", white: "FFFFFF", accentLight: "C8E6C9", altRow: "E8F5E9", chart: ["2E7D32","558B2F","F57F17","01579B","6A1B9A","BF360C","00695C","E65100"], hStyle: "diagonal" },
  gold:     { bg: "FFFDF0", ink: "2C1E00", accent: "A0720A", accentDark: "7A5508", muted: "7A6A40", white: "FFFFFF", accentLight: "F5E6AC", altRow: "FFF8DC", chart: ["A0720A","8B0000","2E4A1E","1A237E","4A148C","006064","BF360C","37474F"], hStyle: "line" }
};
const THEME_NAMES = Object.keys(PPTX_THEMES);

function cleanText(value, limit = 1500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

async function createPptx(operation) {
  const target = resolveInsideWorkspace(operation.path);
  const backup = await makeBackup(target);
  await fs.mkdir(path.dirname(target), { recursive: true });

  const pptx = new pptxgen();
  pptx.author = "DeepSeek Local Agent";
  pptx.title = cleanText(operation.title || path.basename(operation.path, path.extname(operation.path)), 200);
  pptx.lang = "zh-CN";
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE";

  const themeName = THEME_NAMES.includes(operation.theme) ? operation.theme : THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)];
  const T = PPTX_THEMES[themeName];
  const hStyle = T.hStyle;
  const FF = "Microsoft YaHei";

  function pageNum(slide, n) {
    slide.addText(`${n}`, { x: 12.5, y: 6.95, w: 0.4, h: 0.2, fontFace: FF, fontSize: 9, color: T.muted, align: "right" });
  }

  function accentHeader(slide, titleText) {
    const txt = cleanText(titleText, 160);
    if (hStyle === "bar") {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 1.1, fill: { color: T.accent }, line: { color: T.accent } });
      slide.addText(txt, { x: 0.5, y: 0.17, w: 12.3, h: 0.76, fontFace: FF, fontSize: 24, bold: true, color: T.white });
    } else if (hStyle === "sidebar") {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: T.accent }, line: { color: T.accent } });
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.055, fill: { color: T.accent }, line: { color: T.accent } });
      slide.addText(txt, { x: 0.42, y: 0.14, w: 12.5, h: 0.72, fontFace: FF, fontSize: 24, bold: true, color: T.accent });
    } else if (hStyle === "diagonal") {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 5.2, h: 1.1, fill: { color: T.accent }, line: { color: T.accent } });
      slide.addShape(pptx.ShapeType.rect, { x: 5.2, y: 0, w: 8.133, h: 1.1, fill: { color: T.accentLight }, line: { color: T.accentLight } });
      slide.addText(txt, { x: 0.35, y: 0.17, w: 12.5, h: 0.76, fontFace: FF, fontSize: 24, bold: true, color: T.white });
    } else {
      slide.addText(txt, { x: 0.5, y: 0.1, w: 12.3, h: 0.78, fontFace: FF, fontSize: 26, bold: true, color: T.ink });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.92, w: 12.3, h: 0.05, fill: { color: T.accent }, line: { color: T.accent } });
    }
  }

  for (const [i, s] of operation.slides.entries()) {
    const layout = s.layout || (s.bullets ? "bullets" : "bullets");
    const slide = pptx.addSlide();
    slide.background = { color: T.bg };
    const notes = cleanText(s.notes || "", 1200);

    // ── title ──────────────────────────────────────────────────────────────
    if (layout === "title") {
      if (hStyle === "sidebar") {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 4.8, h: 7.5, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Title", 160), { x: 0.3, y: 1.8, w: 4.2, h: 3.0, fontFace: FF, fontSize: 34, bold: true, color: T.white, align: "center", valign: "middle" });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 0.3, y: 4.9, w: 4.2, h: 1.2, fontFace: FF, fontSize: 15, color: T.accentLight, align: "center" });
        slide.addShape(pptx.ShapeType.rect, { x: 5.2, y: 3.65, w: 7.7, h: 0.06, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Title", 160), { x: 5.3, y: 1.5, w: 7.5, h: 2.1, fontFace: FF, fontSize: 40, bold: true, color: T.ink, valign: "bottom" });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 5.3, y: 3.85, w: 7.5, h: 1.0, fontFace: FF, fontSize: 20, color: T.muted });
      } else if (hStyle === "diagonal") {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 5.3, w: 13.333, h: 2.2, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Title", 160), { x: 0.8, y: 1.0, w: 11.7, h: 3.0, fontFace: FF, fontSize: 48, bold: true, color: T.ink, valign: "middle" });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 0.8, y: 5.4, w: 11.7, h: 1.2, fontFace: FF, fontSize: 22, color: T.white });
      } else if (hStyle === "line") {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.1, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.4, w: 13.333, h: 0.1, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addShape(pptx.ShapeType.rect, { x: 3.5, y: 3.85, w: 6.333, h: 0.08, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Title", 160), { x: 0.8, y: 1.2, w: 11.7, h: 2.5, fontFace: FF, fontSize: 50, bold: true, color: T.ink, align: "center", valign: "bottom" });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 1.5, y: 4.05, w: 10.333, h: 1.2, fontFace: FF, fontSize: 22, color: T.muted, align: "center" });
      } else {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.38, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.12, w: 13.333, h: 0.38, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Title", 160), { x: 1.0, y: 1.9, w: 11.333, h: 1.9, fontFace: FF, fontSize: 44, bold: true, color: T.ink, align: "center" });
        slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.95, w: 4.333, h: 0.07, fill: { color: T.accent }, line: { color: T.accent } });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 1.5, y: 4.15, w: 10.333, h: 1.0, fontFace: FF, fontSize: 22, color: T.muted, align: "center" });
      }

    // ── section ────────────────────────────────────────────────────────────
    } else if (layout === "section") {
      if (hStyle === "sidebar") {
        slide.background = { color: T.accentLight };
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.55, h: 7.5, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Section", 160), { x: 1.0, y: 2.3, w: 11.8, h: 1.5, fontFace: FF, fontSize: 40, bold: true, color: T.accent, align: "center" });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 1.5, y: 4.0, w: 10.333, h: 0.8, fontFace: FF, fontSize: 20, color: T.muted, align: "center" });
      } else if (hStyle === "diagonal") {
        slide.background = { color: T.accentDark };
        slide.addShape(pptx.ShapeType.rect, { x: 8.5, y: 0, w: 4.833, h: 7.5, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Section", 160), { x: 0.6, y: 2.2, w: 7.5, h: 1.8, fontFace: FF, fontSize: 40, bold: true, color: T.white });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 0.6, y: 4.1, w: 7.5, h: 0.8, fontFace: FF, fontSize: 18, color: T.accentLight });
      } else if (hStyle === "line") {
        slide.addShape(pptx.ShapeType.rect, { x: 1.5, y: 3.65, w: 10.333, h: 0.1, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.1, fill: { color: T.accent }, line: { color: T.accent } });
        slide.addText(cleanText(s.title || "Section", 160), { x: 1.0, y: 1.8, w: 11.333, h: 1.7, fontFace: FF, fontSize: 44, bold: true, color: T.ink, align: "center" });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 1.5, y: 3.9, w: 10.333, h: 0.8, fontFace: FF, fontSize: 20, color: T.muted, align: "center" });
      } else {
        slide.background = { color: T.accent };
        slide.addText(cleanText(s.title || "Section", 160), { x: 1.0, y: 2.2, w: 11.333, h: 1.6, fontFace: FF, fontSize: 40, bold: true, color: T.white, align: "center" });
        slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 4.0, w: 4.333, h: 0.06, fill: { color: T.accentLight }, line: { color: T.accentLight } });
        if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 1.5, y: 4.2, w: 10.333, h: 0.8, fontFace: FF, fontSize: 20, color: T.accentLight, align: "center" });
      }

    // ── quote ──────────────────────────────────────────────────────────────
    } else if (layout === "quote") {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, fill: { color: T.accent }, line: { color: T.accent } });
      slide.addText("“", { x: 0.6, y: 0.3, w: 1.6, h: 1.6, fontFace: "Georgia", fontSize: 100, bold: true, color: T.accentLight });
      slide.addText(cleanText(s.quote || "", 600), { x: 1.2, y: 1.5, w: 10.9, h: 3.8, fontFace: FF, fontSize: 24, italic: true, color: T.ink, align: "center", valign: "middle" });
      if (s.author) slide.addText(`— ${cleanText(s.author, 100)}`, { x: 1.2, y: 5.5, w: 10.9, h: 0.5, fontFace: FF, fontSize: 16, color: T.muted, align: "right" });
      pageNum(slide, i + 1);

    // ── two-column ─────────────────────────────────────────────────────────
    } else if (layout === "two-column") {
      accentHeader(slide, s.title || `Slide ${i + 1}`);
      slide.addShape(pptx.ShapeType.rect, { x: 6.617, y: 1.2, w: 0.05, h: 5.8, fill: { color: T.muted }, line: { color: T.muted } });
      const renderCol = (col, x) => {
        if (!col) return;
        if (col.title) slide.addText(cleanText(col.title, 100), { x, y: 1.25, w: 5.9, h: 0.5, fontFace: FF, fontSize: 16, bold: true, color: T.accent });
        const bulls = Array.isArray(col.bullets) ? col.bullets.map(b => cleanText(b, 200)).filter(Boolean) : [];
        if (bulls.length) slide.addText(bulls.map(t => ({ text: t, options: { bullet: { indent: 12 }, breakLine: true } })), { x, y: col.title ? 1.85 : 1.3, w: 5.9, h: 5.0, fontFace: FF, fontSize: 16, color: T.ink, fit: "shrink", valign: "top", paraSpaceAfterPt: 8 });
      };
      renderCol(s.left, 0.5);
      renderCol(s.right, 6.9);
      pageNum(slide, i + 1);

    // ── chart-bar / chart-line ─────────────────────────────────────────────
    } else if (layout === "chart-bar" || layout === "chart-line") {
      accentHeader(slide, s.title || `Chart ${i + 1}`);
      const cd = s.chart || {};
      const labels = Array.isArray(cd.labels) ? cd.labels.map(String) : ["A", "B", "C"];
      const series = Array.isArray(cd.series) && cd.series.length
        ? cd.series.map(sr => ({ name: String(sr.name || ""), labels, values: Array.isArray(sr.values) ? sr.values.map(Number) : [] }))
        : [{ name: "Value", labels, values: labels.map(() => 0) }];
      const chartType = layout === "chart-line" ? pptx.ChartType.line : pptx.ChartType.bar;
      slide.addChart(chartType, series, {
        x: 0.6, y: 1.2, w: 12.1, h: 5.9,
        chartColors: T.chart, showLegend: series.length > 1, legendPos: "b", legendFontSize: 12,
        showValue: true, dataLabelFontSize: 11, valAxisLabelFontSize: 11, catAxisLabelFontSize: 11,
        ...(cd.title ? { title: cleanText(cd.title, 100), showTitle: true, titleFontSize: 14 } : {})
      });
      pageNum(slide, i + 1);

    // ── chart-pie ──────────────────────────────────────────────────────────
    } else if (layout === "chart-pie") {
      accentHeader(slide, s.title || `Chart ${i + 1}`);
      const cd = s.chart || {};
      const labels = Array.isArray(cd.labels) ? cd.labels.map(String) : ["A", "B"];
      const values = Array.isArray(cd.values) ? cd.values.map(Number) : [50, 50];
      slide.addChart(pptx.ChartType.pie, [{ name: "Data", labels, values }], {
        x: 1.5, y: 1.2, w: 10.333, h: 5.9,
        chartColors: T.chart, showLegend: true, legendPos: "b", legendFontSize: 13,
        showPercent: true, dataLabelFontSize: 13,
        ...(cd.title ? { title: cleanText(cd.title, 100), showTitle: true, titleFontSize: 14 } : {})
      });
      pageNum(slide, i + 1);

    // ── table ──────────────────────────────────────────────────────────────
    } else if (layout === "table") {
      accentHeader(slide, s.title || `Table ${i + 1}`);
      const headers = Array.isArray(s.headers) ? s.headers.map(String) : [];
      const rows = Array.isArray(s.rows) ? s.rows : [];
      const tableRows = [];
      if (headers.length) {
        tableRows.push(headers.map(h => ({ text: cleanText(h, 80), options: { bold: true, color: T.white, fill: { color: T.accent }, align: "center", fontSize: 13, fontFace: FF } })));
      }
      rows.forEach((row, ri) => {
        const cells = Array.isArray(row) ? row : [];
        tableRows.push(cells.map(cell => ({ text: cleanText(String(cell ?? ""), 160), options: { fontSize: 12, fontFace: FF, color: T.ink, fill: { color: ri % 2 === 0 ? T.bg : T.altRow }, align: "center" } })));
      });
      if (tableRows.length) {
        const cols = headers.length || (rows[0] ? rows[0].length : 1);
        const colW = Math.min(12.0 / cols, 3.5);
        const totalW = colW * cols;
        slide.addTable(tableRows, { x: (13.333 - totalW) / 2, y: 1.25, w: totalW, rowH: 0.48, border: { color: T.muted, pt: 0.5 } });
      }
      pageNum(slide, i + 1);

    // ── image-text ─────────────────────────────────────────────────────────
    } else if (layout === "image-text") {
      accentHeader(slide, s.title || `Slide ${i + 1}`);
      const onLeft = s.imagePosition !== "right";
      const imgX = onLeft ? 0.5 : 6.9;
      const txtX = onLeft ? 6.9 : 0.5;
      if (s.imagePath) {
        try {
          slide.addImage({ path: resolveInsideWorkspace(s.imagePath), x: imgX, y: 1.25, w: 5.8, h: 5.7 });
        } catch {
          slide.addText(`[Image: ${s.imagePath}]`, { x: imgX, y: 1.25, w: 5.8, h: 5.7, fontFace: FF, fontSize: 13, color: T.muted, align: "center", valign: "middle" });
        }
      }
      if (s.body) slide.addText(cleanText(s.body, 800), { x: txtX, y: 1.25, w: 5.9, h: 5.7, fontFace: FF, fontSize: 18, color: T.ink, fit: "shrink", valign: "middle", breakLine: true });
      pageNum(slide, i + 1);

    // ── bullets (default) ──────────────────────────────────────────────────
    } else {
      accentHeader(slide, s.title || `Slide ${i + 1}`);
      if (s.subtitle) slide.addText(cleanText(s.subtitle, 200), { x: 0.5, y: 1.12, w: 12.3, h: 0.38, fontFace: FF, fontSize: 13, italic: true, color: T.muted });
      const bulletY = s.subtitle ? 1.6 : 1.25;
      const bullets = Array.isArray(s.bullets) ? s.bullets.map(b => cleanText(b, 260)).filter(Boolean) : [];
      if (bullets.length) {
        slide.addText(bullets.map(text => ({ text, options: { bullet: { indent: 18 }, hanging: 5, breakLine: true } })), { x: 0.8, y: bulletY, w: 11.6, h: 7.4 - bulletY, fontFace: FF, fontSize: 18, color: T.ink, fit: "shrink", valign: "top", paraSpaceAfterPt: 12 });
      } else if (s.body) {
        slide.addText(cleanText(s.body, 1200), { x: 0.8, y: bulletY, w: 11.6, h: 7.4 - bulletY, fontFace: FF, fontSize: 18, color: T.ink, fit: "shrink", valign: "top", breakLine: true });
      }
      pageNum(slide, i + 1);
    }

    if (notes) slide.addNotes(notes);
  }

  await pptx.writeFile({ fileName: target });
  return { ok: true, message: `PPTX created: ${operation.path}`, backup };
}

async function executeOperation(operation) {
  if (appConfig.approvalMode === "read-only") {
    throw new Error("Current approval mode is read-only. File writes are blocked.");
  }

  validateOperation(operation);

  if (operation.type === "mkdir") {
    const target = resolveInsideWorkspace(operation.path);
    await fs.mkdir(target, { recursive: true });
    return { ok: true, message: `Folder created: ${operation.path}` };
  }

  if (operation.type === "write_file") {
    const target = resolveInsideWorkspace(operation.path);
    const backup = await makeBackup(target);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, operation.content, "utf8");
    return { ok: true, message: `File written: ${operation.path}`, backup };
  }

  if (operation.type === "write_binary_file") {
    const target = resolveInsideWorkspace(operation.path);
    const backup = await makeBackup(target);
    const buffer = Buffer.from(operation.contentBase64.replace(/\s/g, ""), "base64");
    if (buffer.byteLength > MAX_BINARY_WRITE_BYTES) {
      throw new Error(`Binary write is too large. Max: ${MAX_BINARY_WRITE_BYTES / 1024 / 1024} MB.`);
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { ok: true, message: `Binary file written: ${operation.path}`, backup };
  }

  if (operation.type === "create_pptx") {
    return createPptx(operation);
  }

  if (operation.type === "run_indesign") {
    if (typeof operation.jsxCode !== "string" || !operation.jsxCode.trim()) {
      throw new Error("run_indesign requires a non-empty jsxCode string.");
    }
    const result = await runInDesignScript(operation.jsxCode);
    return { ok: true, message: `InDesign script executed. ${result}` };
  }

  const from = resolveInsideWorkspace(operation.from);
  const to = resolveInsideWorkspace(operation.to);
  const backup = await makeBackup(to);
  await fs.mkdir(path.dirname(to), { recursive: true });

  if (operation.type === "copy_file") {
    await fs.copyFile(from, to);
    return { ok: true, message: `Copied: ${operation.from} -> ${operation.to}`, backup };
  }

  await fs.rename(from, to);
  return { ok: true, message: `Moved/renamed: ${operation.from} -> ${operation.to}`, backup };
}

ipcMain.handle("workspace:choose", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });

  if (result.canceled || !result.filePaths[0]) return null;
  workspaceRoot = result.filePaths[0];
  appConfig.workspaceRoot = workspaceRoot;
  await saveConfig();
  return workspaceRoot;
});

ipcMain.handle("workspace:get", async () => workspaceRoot);

ipcMain.handle("settings:get", async () => ({
  workspaceRoot,
  approvalMode: appConfig.approvalMode
}));

ipcMain.handle("settings:setApprovalMode", async (_event, approvalMode) => {
  const allowed = new Set(["on-request", "trusted-workspace", "read-only"]);
  if (!allowed.has(approvalMode)) {
    throw new Error(`Unsupported approval mode: ${approvalMode}`);
  }

  appConfig.approvalMode = approvalMode;
  await saveConfig();
  return appConfig;
});

ipcMain.handle("workspace:list", async () => {
  ensureWorkspace();
  return walkFiles(workspaceRoot);
});

ipcMain.handle("file:read", async (_event, relativePath) => {
  return readTextSample(relativePath, 20000);
});

ipcMain.handle("agent:plan", async (_event, input) => {
  ensureWorkspace();
  const files = await walkFiles(workspaceRoot);
  const textFiles = files
    .filter((item) => item.type === "file" && TEXT_EXTENSIONS.has(item.ext) && item.size <= 80_000)
    .slice(0, 20);

  const excerpts = [];
  for (const file of textFiles) {
    excerpts.push({ path: file.path, excerpt: await readTextSample(file.path, 2000) });
  }

  const skills = await loadSkills();

  return runAgentLoop({
    apiKey: input.apiKey,
    searchApiKey: input.searchApiKey,
    aiProvider: input.aiProvider,
    model: input.model,
    userMessage: input.message,
    skills,
    history: Array.isArray(input.history) ? input.history : [],
    textAttachments: Array.isArray(input.textAttachments) ? input.textAttachments : [],
    imageAttachments: Array.isArray(input.imageAttachments) ? input.imageAttachments : [],
    otherAttachments: Array.isArray(input.otherAttachments) ? input.otherAttachments : [],
    manifest: {
      files,
      installedSkills: skills.map((skill) => ({ name: skill.name, scope: skill.scope })),
      textExcerpts: excerpts
    }
  });
});

ipcMain.handle("agent:execute", async (_event, operations) => {
  ensureWorkspace();
  const id = crypto.randomUUID();
  const results = [];
  for (const operation of operations || []) {
    results.push(await executeOperation(operation));
  }
  return { id, results };
});

ipcMain.handle("skills:list", async () => {
  const skills = await loadSkills();
  return {
    globalDir: getGlobalSkillsDir(),
    workspaceDir: workspaceRoot ? getWorkspaceSkillsDir() : null,
    skills: skills.map((skill) => ({
      name: skill.name,
      scope: skill.scope,
      path: skill.path,
      preview: skill.content.slice(0, 220)
    }))
  };
});

ipcMain.handle("skills:createTemplate", async (_event, input) => {
  const scope = input?.scope === "workspace" ? "workspace" : "global";
  const targetDir = scope === "workspace" ? getWorkspaceSkillsDir() : getGlobalSkillsDir();
  const baseName = sanitizeSkillName(input?.name);
  const targetPath = path.join(targetDir, baseName, "SKILL.md");

  await fs.mkdir(targetDir, { recursive: true });
  if (await exists(targetPath)) {
    throw new Error(`Skill already exists: ${targetPath}`);
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  const template = `# ${baseName}

## When To Use

Use this skill when the user asks for ...

## Instructions

- Describe the exact workflow the agent should follow.
- State any output format rules.
- State what the agent must avoid.

## Examples

User: ...
Agent behavior: ...
`;

  await fs.writeFile(targetPath, template, "utf8");
  return { path: targetPath };
});

ipcMain.handle("skills:openFolder", async (_event, scope) => {
  const targetDir = scope === "workspace" ? getWorkspaceSkillsDir() : getGlobalSkillsDir();
  await fs.mkdir(targetDir, { recursive: true });
  await shell.openPath(targetDir);
  return targetDir;
});

ipcMain.handle("conversations:list", async () => {
  ensureWorkspace();
  const dir = getConversationsDir();
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const conversations = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(dir, entry.name), "utf8");
      const data = JSON.parse(raw);
      conversations.push({ id: data.id, name: data.name, createdAt: data.createdAt, updatedAt: data.updatedAt });
    } catch { /* skip corrupt */ }
  }
  return conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
});

ipcMain.handle("conversations:get", async (_event, id) => {
  ensureWorkspace();
  const dir = getConversationsDir();
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  const raw = await fs.readFile(path.join(dir, `${safeId}.json`), "utf8");
  return JSON.parse(raw);
});

ipcMain.handle("conversations:save", async (_event, conversation) => {
  ensureWorkspace();
  const dir = getConversationsDir();
  await fs.mkdir(dir, { recursive: true });
  const safeId = String(conversation.id).replace(/[^a-zA-Z0-9-]/g, "");
  const toSave = { ...conversation, updatedAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, `${safeId}.json`), JSON.stringify(toSave, null, 2), "utf8");
  return toSave;
});

ipcMain.handle("conversations:delete", async (_event, id) => {
  ensureWorkspace();
  const dir = getConversationsDir();
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "");
  await fs.unlink(path.join(dir, `${safeId}.json`));
  return true;
});
