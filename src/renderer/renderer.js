const translations = {
  zh: {
    conversationsLabel: "对话",
    newConversationTitle: "新建对话",
    newConversationName: "新对话",
    noConversations: "暂无对话",
    referencesLabel: "引用资料",
    addFilesTitle: "添加文件",
    dropHint: "拖入文件、图片或视频，或 Ctrl+V 粘贴图片",
    tooManyAttachments: "最多添加 10 个文件。",
    imageTooBig: "图片超过 5 MB，仅保存元数据。",
    textTooBig: "文本文件超过 200 KB，仅保存元数据。",
    brandSubtitle: "本地文件助手",
    languageLabel: "语言",
    bochaApiKeyLabel: "博查 API Key",
    aiProviderLabel: "AI 提供商",
    providerDeepSeek: "DeepSeek 官方",
    providerBocha: "博查 Model API",
    modelLabel: "模型",
    saveButton: "保存",
    workspaceLabel: "工作目录",
    chooseFolderButton: "选择文件夹",
    accessLabel: "访问权限",
    accessAsk: "写入前询问",
    accessTrusted: "自动批准工作区写入",
    accessReadOnly: "只读",
    accessHint: "应用到当前工作目录，并在下次打开时保留。",
    refreshTitle: "刷新",
    newGlobalSkill: "新建全局",
    newWorkspaceSkill: "新建项目",
    openGlobalSkill: "打开全局",
    openWorkspaceSkill: "打开项目",
    filesLabel: "文件",
    welcomeMessage: "选择一个工作文件夹，然后告诉我你想检查、整理、创建或修改什么。\n\n💡 如需联网搜索，请在设置中填写博查 API Key（bochaai.com 免费注册，国内直连）。",
    pendingPlan: "待执行计划",
    executeButton: "执行",
    cancelButton: "取消",
    sendButton: "发送",
    messagePlaceholder: "例如：搜索最新 AI 趋势并制作一份演示文稿",
    notSelected: "未选择",
    settingsSaved: "设置已保存。",
    userLabel: "你",
    emptyFolder: "这个文件夹是空的。",
    noSkills: "暂无 skill。",
    skillPrompt: "Skill 名称，例如：contract-review",
    skillCreated: "已创建 skill 模板：",
    operations: "个操作",
    generatedPlan: "我生成了一个计划。",
    readOnlyBlocked: "当前是只读模式，写入已被阻止。",
    confirmExecute: (count) => `即将执行 ${count} 个文件操作。已有文件会先自动备份。是否继续？`,
    backup: "备份",
    accessModeSet: "访问权限已设置为：",
    progressSearching: (q) => `🔍 网页搜索：${q}`,
    progressAgentSearch: (q) => `🤖 深度搜索：${q}`,
    progressFetching: (u) => `🌐 正在读取：${u}`,
    progressRoundDone: (n, total) => `✅ 第 ${n} 轮完成，获取 ${total} 条结果，正在生成计划…`
  },
  en: {
    conversationsLabel: "Conversations",
    newConversationTitle: "New Conversation",
    newConversationName: "New Conversation",
    noConversations: "No conversations yet",
    referencesLabel: "References",
    addFilesTitle: "Add Files",
    dropHint: "Drop files, images, or videos here — or Ctrl+V to paste an image",
    tooManyAttachments: "Maximum 10 files.",
    imageTooBig: "Image exceeds 5 MB — metadata only.",
    textTooBig: "Text file exceeds 200 KB — metadata only.",
    brandSubtitle: "Local file assistant",
    languageLabel: "Language",
    bochaApiKeyLabel: "Bocha API Key",
    aiProviderLabel: "AI Provider",
    providerDeepSeek: "DeepSeek Official",
    providerBocha: "Bocha Model API",
    modelLabel: "Model",
    saveButton: "Save",
    workspaceLabel: "Workspace",
    chooseFolderButton: "Choose Folder",
    accessLabel: "Access",
    accessAsk: "Ask before writes",
    accessTrusted: "Auto-approve workspace writes",
    accessReadOnly: "Read-only",
    accessHint: "Applied to the selected workspace and saved for next launch.",
    refreshTitle: "Refresh",
    newGlobalSkill: "New Global",
    newWorkspaceSkill: "New Workspace",
    openGlobalSkill: "Open Global",
    openWorkspaceSkill: "Open Workspace",
    filesLabel: "Files",
    welcomeMessage: "Choose a workspace folder, then tell me what to inspect, organize, create, or edit.\n\n💡 For web search, add a Bocha API Key in settings (free at bochaai.com, works in China).",
    pendingPlan: "Pending Plan",
    executeButton: "Execute",
    cancelButton: "Cancel",
    sendButton: "Send",
    messagePlaceholder: "Example: search latest AI trends and create a presentation",
    notSelected: "Not selected",
    settingsSaved: "Settings saved.",
    userLabel: "You",
    emptyFolder: "This folder is empty.",
    noSkills: "No skills installed.",
    skillPrompt: "Skill name, for example: contract-review",
    skillCreated: "Created skill template: ",
    operations: "operations",
    generatedPlan: "I generated a plan.",
    readOnlyBlocked: "Read-only mode is enabled. Writes are blocked.",
    confirmExecute: (count) => `Execute ${count} file operations? Existing files will be backed up first.`,
    backup: "Backup",
    accessModeSet: "Access mode set to: ",
    progressSearching: (q) => `🔍 Web search: ${q}`,
    progressAgentSearch: (q) => `🤖 Deep search: ${q}`,
    progressFetching: (u) => `🌐 Fetching: ${u}`,
    progressRoundDone: (n, total) => `✅ Round ${n} done — ${total} results, generating plan…`
  }
};

const apiKeyInput = document.querySelector("#apiKey");
const searchApiKeyInput = document.querySelector("#searchApiKey");
const aiProviderSelect = document.querySelector("#aiProvider");
const modelSelect = document.querySelector("#model");
const languageSelect = document.querySelector("#language");
const approvalModeSelect = document.querySelector("#approvalMode");
const saveSettingsButton = document.querySelector("#saveSettings");
const chooseWorkspaceButton = document.querySelector("#chooseWorkspace");
const workspacePath = document.querySelector("#workspacePath");
const refreshFilesButton = document.querySelector("#refreshFiles");
const fileList = document.querySelector("#fileList");
const refreshSkillsButton = document.querySelector("#refreshSkills");
const skillList = document.querySelector("#skillList");
const createGlobalSkillButton = document.querySelector("#createGlobalSkill");
const createWorkspaceSkillButton = document.querySelector("#createWorkspaceSkill");
const openGlobalSkillsButton = document.querySelector("#openGlobalSkills");
const openWorkspaceSkillsButton = document.querySelector("#openWorkspaceSkills");
const messages = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const sendMessageButton = document.querySelector("#sendMessage");
const planPanel = document.querySelector("#planPanel");
const operationCount = document.querySelector("#operationCount");
const operationPreview = document.querySelector("#operationPreview");
const executePlanButton = document.querySelector("#executePlan");
const cancelPlanButton = document.querySelector("#cancelPlan");
const newConversationButton = document.querySelector("#newConversation");
const conversationList = document.querySelector("#conversationList");
const referencesPanel = document.querySelector("#referencesPanel");
const attachmentList = document.querySelector("#attachmentList");
const addFileButton = document.querySelector("#addFileButton");
const fileInput = document.querySelector("#fileInput");

let pendingOperations = [];
let approvalMode = "on-request";
let currentLanguage = "zh";
let currentWorkspace = null;
let currentConversationId = null;
let currentConversation = null;
let chatHistory = [];
let currentAttachments = [];
let activeProgressNode = null;

function t(key) {
  return translations[currentLanguage][key] || translations.zh[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });

  workspacePath.textContent = currentWorkspace || t("notSelected");
  if (pendingOperations.length) {
    operationCount.textContent = `${pendingOperations.length} ${t("operations")}`;
  }
  renderAttachments();
}

// ── Attachment helpers ────────────────────────────────────────────────────────

const TEXT_FILE_EXTS = new Set([".txt", ".md", ".json", ".csv", ".tsv", ".html", ".css", ".js", ".ts", ".jsx", ".tsx", ".xml", ".yml", ".yaml", ".log"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_BYTES = 200 * 1024;
const MAX_ATTACHMENTS = 10;

function fileCategory(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (file.type.startsWith("text/") || TEXT_FILE_EXTS.has(ext)) return "text";
  return "other";
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function processFile(file) {
  const category = fileCategory(file);
  const att = { id: crypto.randomUUID(), name: file.name, type: file.type || "application/octet-stream", size: file.size, category };
  if (category === "image") {
    if (file.size <= MAX_IMAGE_BYTES) att.dataUrl = await readAsDataUrl(file);
  } else if (category === "text") {
    if (file.size <= MAX_TEXT_BYTES) att.textContent = await readAsText(file);
  }
  return att;
}

async function addAttachmentFiles(files) {
  for (const file of files) {
    if (currentAttachments.length >= MAX_ATTACHMENTS) { addMessage("assistant", t("tooManyAttachments")); break; }
    if (currentAttachments.some((a) => a.name === file.name && a.size === file.size)) continue;
    currentAttachments.push(await processFile(file));
  }
  renderAttachments();
  syncAttachmentsToConversation();
}

function removeAttachment(id) {
  currentAttachments = currentAttachments.filter((a) => a.id !== id);
  renderAttachments();
  syncAttachmentsToConversation();
}

function syncAttachmentsToConversation() {
  if (currentConversation) {
    currentConversation.attachments = currentAttachments;
    saveCurrentConversation();
  }
}

function renderAttachments() {
  attachmentList.innerHTML = "";
  if (!currentAttachments.length) {
    const hint = document.createElement("span");
    hint.className = "drop-hint";
    hint.textContent = t("dropHint");
    attachmentList.appendChild(hint);
    return;
  }
  for (const att of currentAttachments) {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    if (att.category === "image" && att.dataUrl) {
      const img = document.createElement("img");
      img.className = "att-thumb";
      img.src = att.dataUrl;
      img.alt = att.name;
      chip.appendChild(img);
    } else {
      const icon = document.createElement("span");
      icon.className = "att-icon";
      icon.textContent = att.category === "video" ? "🎬" : att.category === "text" ? "📄" : "📎";
      chip.appendChild(icon);
    }
    const nameEl = document.createElement("span");
    nameEl.className = "att-name";
    nameEl.textContent = att.name;
    chip.appendChild(nameEl);
    const sizeEl = document.createElement("span");
    sizeEl.className = "att-size";
    sizeEl.textContent = formatBytes(att.size);
    chip.appendChild(sizeEl);
    const btn = document.createElement("button");
    btn.className = "att-remove secondary";
    btn.textContent = "×";
    btn.addEventListener("click", () => removeAttachment(att.id));
    chip.appendChild(btn);
    attachmentList.appendChild(chip);
  }
}

// ── Drag / drop / paste ───────────────────────────────────────────────────────

let dragCounter = 0;

referencesPanel.addEventListener("dragenter", (e) => { e.preventDefault(); dragCounter++; referencesPanel.classList.add("drag-over"); });
referencesPanel.addEventListener("dragleave", () => { if (--dragCounter <= 0) { dragCounter = 0; referencesPanel.classList.remove("drag-over"); } });
referencesPanel.addEventListener("dragover", (e) => e.preventDefault());
referencesPanel.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragCounter = 0;
  referencesPanel.classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files);
  if (files.length) await addAttachmentFiles(files);
});

document.addEventListener("paste", async (e) => {
  const imageItems = Array.from(e.clipboardData?.items || []).filter((i) => i.type.startsWith("image/"));
  if (!imageItems.length) return;
  const files = imageItems.map((item) => {
    const file = item.getAsFile();
    if (!file) return null;
    const ext = file.type.split("/")[1] || "png";
    return new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type });
  }).filter(Boolean);
  if (files.length) await addAttachmentFiles(files);
});

addFileButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files);
  if (files.length) await addAttachmentFiles(files);
  fileInput.value = "";
});

// ─────────────────────────────────────────────────────────────────────────────

async function loadConversations() {
  try {
    const list = await window.agentApi.listConversations();
    renderConversationList(list);
  } catch {
    conversationList.textContent = "";
  }
}

function renderConversationList(list) {
  conversationList.innerHTML = "";
  if (!list.length) {
    conversationList.textContent = t("noConversations");
    return;
  }
  for (const conv of list) {
    const item = document.createElement("div");
    item.className = "conversation-item" + (conv.id === currentConversationId ? " active" : "");
    item.dataset.id = conv.id;
    item.innerHTML = `<span class="conv-name"></span><button class="conv-delete secondary">×</button>`;
    item.querySelector(".conv-name").textContent = conv.name;
    item.querySelector(".conv-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteConversation(conv.id);
    });
    item.addEventListener("click", () => switchConversation(conv.id));
    conversationList.appendChild(item);
  }
}

async function switchConversation(id) {
  try {
    const conv = await window.agentApi.getConversation(id);
    currentConversationId = id;
    currentConversation = conv;
    chatHistory = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    currentAttachments = Array.isArray(conv.attachments) ? conv.attachments : [];
    messages.innerHTML = "";
    for (const msg of conv.messages) {
      addMessage(msg.role, msg.content);
    }
    renderAttachments();
    showPlan([]);
    await loadConversations();
  } catch (error) {
    addMessage("assistant", error.message);
  }
}

async function startNewConversation() {
  currentConversationId = crypto.randomUUID();
  currentConversation = {
    id: currentConversationId,
    name: t("newConversationName"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    attachments: []
  };
  chatHistory = [];
  currentAttachments = [];
  messages.innerHTML = "";
  addMessage("assistant", t("welcomeMessage"));
  renderAttachments();
  showPlan([]);
  await loadConversations();
}

async function deleteConversation(id) {
  try {
    await window.agentApi.deleteConversation(id);
    if (currentConversationId === id) {
      await startNewConversation();
    }
    await loadConversations();
  } catch (error) {
    addMessage("assistant", error.message);
  }
}

async function saveCurrentConversation() {
  if (!currentConversation || !currentWorkspace) return;
  try {
    await window.agentApi.saveConversation(currentConversation);
  } catch { /* ignore */ }
}

function loadLocalSettings() {
  apiKeyInput.value = localStorage.getItem("deepseekApiKey") || "";
  searchApiKeyInput.value = localStorage.getItem("bochaApiKey") || "";
  aiProviderSelect.value = localStorage.getItem("aiProvider") || "deepseek";
  modelSelect.value = localStorage.getItem("aiModel") || "deepseek-v4-flash";
  currentLanguage = localStorage.getItem("language") || "zh";
  languageSelect.value = currentLanguage;
  applyLanguage();
}

function saveLocalSettings() {
  localStorage.setItem("deepseekApiKey", apiKeyInput.value.trim());
  localStorage.setItem("bochaApiKey", searchApiKeyInput.value.trim());
  localStorage.setItem("aiProvider", aiProviderSelect.value);
  localStorage.setItem("aiModel", modelSelect.value);
  addMessage("assistant", t("settingsSaved"));
}

function addMessage(role, text) {
  const safeText = String(text ?? "").trim();
  if (!safeText) return;
  clearProgressMessage();
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.innerHTML = `<strong>${role === "user" ? t("userLabel") : "Agent"}</strong><p></p>`;
  node.querySelector("p").textContent = safeText;
  messages.appendChild(node);
  messages.scrollTop = messages.scrollHeight;
}

function showProgressMessage(text) {
  if (!activeProgressNode) {
    activeProgressNode = document.createElement("div");
    activeProgressNode.className = "message progress";
    messages.appendChild(activeProgressNode);
  }
  activeProgressNode.textContent = text;
  messages.scrollTop = messages.scrollHeight;
}

function clearProgressMessage() {
  if (activeProgressNode) {
    activeProgressNode.remove();
    activeProgressNode = null;
  }
}

function setBusy(isBusy) {
  sendMessageButton.disabled = isBusy;
  chooseWorkspaceButton.disabled = isBusy;
  refreshFilesButton.disabled = isBusy;
  refreshSkillsButton.disabled = isBusy;
  executePlanButton.disabled = isBusy;
}

async function refreshSettings() {
  const settings = await window.agentApi.getSettings();
  currentWorkspace = settings.workspaceRoot || null;
  workspacePath.textContent = currentWorkspace || t("notSelected");
  approvalMode = settings.approvalMode || "on-request";
  approvalModeSelect.value = approvalMode;
}

async function refreshFiles() {
  try {
    const files = await window.agentApi.listWorkspace();
    fileList.innerHTML = "";

    if (!files.length) {
      fileList.textContent = t("emptyFolder");
      return;
    }

    for (const item of files.slice(0, 250)) {
      const row = document.createElement("div");
      row.className = "file-item";
      row.textContent = `${item.type === "folder" ? "[DIR]" : "[FILE]"} ${item.path}`;
      fileList.appendChild(row);
    }
  } catch (error) {
    fileList.textContent = error.message;
  }
}

async function refreshSkills() {
  try {
    const result = await window.agentApi.listSkills();
    skillList.innerHTML = "";

    if (!result.skills.length) {
      skillList.textContent = t("noSkills");
      return;
    }

    for (const skill of result.skills) {
      const row = document.createElement("div");
      row.className = "skill-item";
      row.innerHTML = `<strong></strong><span></span>`;
      row.querySelector("strong").textContent = skill.name;
      row.querySelector("span").textContent = `${skill.scope} - ${skill.path}`;
      skillList.appendChild(row);
    }
  } catch (error) {
    skillList.textContent = error.message;
  }
}

async function createSkill(scope) {
  const name = prompt(t("skillPrompt"));
  if (!name) return;

  try {
    const result = await window.agentApi.createSkillTemplate({ scope, name });
    addMessage("assistant", `${t("skillCreated")}${result.path}`);
    await refreshSkills();
  } catch (error) {
    addMessage("assistant", error.message);
  }
}

function showPlan(operations) {
  pendingOperations = operations;
  if (!operations.length) {
    planPanel.classList.add("hidden");
    return;
  }

  operationCount.textContent = `${operations.length} ${t("operations")}`;
  operationPreview.textContent = JSON.stringify(operations, null, 2);
  planPanel.classList.remove("hidden");
}

async function handleChat(event) {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  addMessage("user", message);
  messageInput.value = "";
  showPlan([]);
  setBusy(true);

  if (!currentConversationId) {
    currentConversationId = crypto.randomUUID();
    currentConversation = {
      id: currentConversationId,
      name: message.slice(0, 40),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    chatHistory = [];
  } else if (currentConversation && currentConversation.messages.length === 0) {
    currentConversation.name = message.slice(0, 40);
  }

  const textAttachments = currentAttachments
    .filter((a) => a.category === "text" && a.textContent)
    .map((a) => ({ name: a.name, content: a.textContent.slice(0, 8000) }));

  const imageAttachments = currentAttachments
    .filter((a) => a.category === "image" && a.dataUrl)
    .map((a) => ({ name: a.name, dataUrl: a.dataUrl }));

  const otherAttachments = currentAttachments
    .filter((a) => !((a.category === "text" && a.textContent) || (a.category === "image" && a.dataUrl)))
    .map((a) => ({ name: a.name, type: a.type, size: a.size, category: a.category }));

  window.agentApi.removeAgentProgressListeners();
  window.agentApi.onAgentProgress((data) => {
    if (data.type === "search") showProgressMessage(t("progressSearching")(data.query));
    else if (data.type === "agent_search") showProgressMessage(t("progressAgentSearch")(data.query));
    else if (data.type === "fetch") showProgressMessage(t("progressFetching")(data.url));
    else if (data.type === "round_done") showProgressMessage(t("progressRoundDone")(data.round, data.total));
  });

  try {
    const result = await window.agentApi.plan({
      apiKey: apiKeyInput.value.trim(),
      searchApiKey: searchApiKeyInput.value.trim(),
      aiProvider: aiProviderSelect.value,
      model: modelSelect.value,
      message,
      history: chatHistory,
      textAttachments,
      imageAttachments,
      otherAttachments
    });

    const reply = result.reply || t("generatedPlan");
    addMessage("assistant", reply);

    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });

    if (currentConversation) {
      const ts = new Date().toISOString();
      currentConversation.messages.push({ role: "user", content: message, timestamp: ts });
      currentConversation.messages.push({ role: "assistant", content: reply, timestamp: ts, operations: result.operations || [] });
      await saveCurrentConversation();
      await loadConversations();
    }

    showPlan(result.operations || []);
  } catch (error) {
    addMessage("assistant", error.message);
  } finally {
    clearProgressMessage();
    window.agentApi.removeAgentProgressListeners();
    setBusy(false);
  }
}

async function executePlan() {
  if (!pendingOperations.length) return;

  if (approvalMode === "read-only") {
    addMessage("assistant", t("readOnlyBlocked"));
    return;
  }

  if (approvalMode === "on-request") {
    const ok = confirm(t("confirmExecute")(pendingOperations.length));
    if (!ok) return;
  }

  setBusy(true);
  try {
    const result = await window.agentApi.execute(pendingOperations);
    addMessage(
      "assistant",
      result.results.map((item) => `${item.message}${item.backup ? `\n${t("backup")}: ${item.backup}` : ""}`).join("\n")
    );
    showPlan([]);
    await refreshFiles();
  } catch (error) {
    addMessage("assistant", error.message);
  } finally {
    setBusy(false);
  }
}

languageSelect.addEventListener("change", async () => {
  currentLanguage = languageSelect.value;
  localStorage.setItem("language", currentLanguage);
  applyLanguage();
  await refreshFiles();
  await refreshSkills();
});

saveSettingsButton.addEventListener("click", saveLocalSettings);

approvalModeSelect.addEventListener("change", async () => {
  try {
    const updated = await window.agentApi.setApprovalMode(approvalModeSelect.value);
    approvalMode = updated.approvalMode;
    addMessage("assistant", `${t("accessModeSet")}${approvalMode}`);
  } catch (error) {
    addMessage("assistant", error.message);
  }
});

chooseWorkspaceButton.addEventListener("click", async () => {
  const selected = await window.agentApi.chooseWorkspace();
  if (selected) {
    await refreshSettings();
    await refreshFiles();
    await refreshSkills();
    await startNewConversation();
    await loadConversations();
  }
});

newConversationButton.addEventListener("click", startNewConversation);

refreshFilesButton.addEventListener("click", refreshFiles);
refreshSkillsButton.addEventListener("click", refreshSkills);
createGlobalSkillButton.addEventListener("click", () => createSkill("global"));
createWorkspaceSkillButton.addEventListener("click", () => createSkill("workspace"));
openGlobalSkillsButton.addEventListener("click", () => window.agentApi.openSkillsFolder("global"));
openWorkspaceSkillsButton.addEventListener("click", () => window.agentApi.openSkillsFolder("workspace"));
chatForm.addEventListener("submit", handleChat);
executePlanButton.addEventListener("click", executePlan);
cancelPlanButton.addEventListener("click", () => showPlan([]));

loadLocalSettings();
refreshSettings().then(() => {
  applyLanguage();
  refreshFiles();
  refreshSkills();
  loadConversations();
});
