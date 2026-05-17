const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agentApi", {
  chooseWorkspace: () => ipcRenderer.invoke("workspace:choose"),
  getWorkspace: () => ipcRenderer.invoke("workspace:get"),
  listWorkspace: () => ipcRenderer.invoke("workspace:list"),
  readFile: (path) => ipcRenderer.invoke("file:read", path),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setApprovalMode: (approvalMode) => ipcRenderer.invoke("settings:setApprovalMode", approvalMode),
  plan: (input) => ipcRenderer.invoke("agent:plan", input),
  execute: (operations) => ipcRenderer.invoke("agent:execute", operations),
  listSkills: () => ipcRenderer.invoke("skills:list"),
  createSkillTemplate: (input) => ipcRenderer.invoke("skills:createTemplate", input),
  openSkillsFolder: (scope) => ipcRenderer.invoke("skills:openFolder", scope),
  listConversations: () => ipcRenderer.invoke("conversations:list"),
  getConversation: (id) => ipcRenderer.invoke("conversations:get", id),
  saveConversation: (conversation) => ipcRenderer.invoke("conversations:save", conversation),
  deleteConversation: (id) => ipcRenderer.invoke("conversations:delete", id),
  onAgentProgress: (callback) => ipcRenderer.on("agent:progress", (_event, data) => callback(data)),
  removeAgentProgressListeners: () => ipcRenderer.removeAllListeners("agent:progress")
});
