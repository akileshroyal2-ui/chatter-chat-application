"use strict";

const STORAGE_KEY = "chatter.project.v1";
const svg = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const seed = {
  profile: { id: "jordan", name: "Jordan Davis", username: "@jordan.d", about: "Collecting moments, not things ✨", initials: "JD" },
  contacts: [
    { id: "sophie", name: "Sophie Chen", username: "@sophie.chen", about: "slow mornings & strong coffee", color: "#cfddd0", initials: "SC", status: "Online", favorite: true },
    { id: "marcus", name: "Marcus Rivera", username: "@marcus.r", about: "probably looking for my keys 🗝", color: "#e4cdb5", initials: "MR", status: "Online", favorite: true },
    { id: "ava", name: "Ava Thompson", username: "@ava.t", about: "making things with my hands 🌿", color: "#ddd0dd", initials: "AT", status: "last seen 24m ago", favorite: false },
    { id: "leo", name: "Leo Park", username: "@leo.park", about: "one day at a time ☁️", color: "#cdd8e7", initials: "LP", status: "Online", favorite: false },
    { id: "maya", name: "Maya Patel", username: "@mayap", about: "here for the plot", color: "#ead8a9", initials: "MP", status: "last seen 2h ago", favorite: true },
    { id: "noah", name: "Noah Williams", username: "@noahw", about: "let's make it a good one", color: "#d8c9bc", initials: "NW", status: "last seen yesterday", favorite: false }
  ],
  conversations: [
    { id: "sophie", pinned: true, unread: 2, lastActivity: Date.now() - 7 * 60000, messages: [
      { id: "s1", sender: "sophie", text: "Okay I finally found the little bookshop I was telling you about!", time: "10:21 AM", stamp: Date.now() - 3 * 3600000, status: "read" },
      { id: "s2", sender: "jordan", text: "Oh the one with the tiny green door? 🥹", time: "10:24 AM", stamp: Date.now() - 3 * 3590000, status: "read" },
      { id: "s3", sender: "sophie", text: "YES! And they have a whole room for poetry. We have to go this weekend.", time: "10:28 AM", stamp: Date.now() - 3 * 3580000, status: "read" },
      { id: "s4", sender: "sophie", text: "I saved you the address, by the way 🌱", time: "10:32 AM", stamp: Date.now() - 3 * 3570000, status: "read" },
      { id: "s5", sender: "sophie", text: "Also… I might have found my new favourite place in the entire city.", time: "2:34 PM", stamp: Date.now() - 7 * 60000, status: "read" }
    ] },
    { id: "marcus", pinned: true, unread: 0, lastActivity: Date.now() - 58 * 60000, messages: [
      { id: "m1", sender: "jordan", text: "You still up for coffee tomorrow?", time: "1:06 PM", stamp: Date.now() - 120000, status: "read" },
      { id: "m2", sender: "marcus", text: "Absolutely. Same little spot?", time: "1:10 PM", stamp: Date.now() - 58 * 60000, status: "read" }
    ] },
    { id: "ava", pinned: false, unread: 0, lastActivity: Date.now() - 24 * 60000, messages: [
      { id: "a1", sender: "ava", text: "the ceramics studio was so lovely yesterday", time: "Yesterday", stamp: Date.now() - 86400000, status: "read" },
      { id: "a2", sender: "jordan", text: "Your photos made me want to sign up too 🌼", time: "Yesterday", stamp: Date.now() - 85000000, status: "read" },
      { id: "a3", sender: "ava", text: "you so should! the next workshop still has a couple of spots", time: "2:17 PM", stamp: Date.now() - 24 * 60000, status: "read" }
    ] },
    { id: "leo", pinned: false, unread: 1, lastActivity: Date.now() - 2 * 3600000, messages: [
      { id: "l1", sender: "jordan", text: "Sending over that playlist you asked for!", time: "11:14 AM", stamp: Date.now() - 3 * 3600000, status: "read" },
      { id: "l2", sender: "leo", text: "this is exactly what my sunday needed, thank you 🫶", time: "12:03 PM", stamp: Date.now() - 2 * 3600000, status: "read" }
    ] },
    { id: "maya", pinned: false, unread: 0, lastActivity: Date.now() - 86400000, messages: [] }
  ],
  activeId: "sophie",
  filter: "all",
  blockedContactIds: [],
  settings: { notifications: true, readReceipts: true, theme: "light" }
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(seed);
    const parsed = JSON.parse(saved);
    if (!parsed.profile || !Array.isArray(parsed.contacts) || !Array.isArray(parsed.conversations)) {
      throw new Error("Saved chat data has an invalid format.");
    }
    const restored = { ...structuredClone(seed), ...parsed, settings: { ...seed.settings, ...parsed.settings } };
    restored.blockedContactIds = Array.isArray(parsed.blockedContactIds)
      ? parsed.blockedContactIds.filter((id) => restored.contacts.some((contact) => contact.id === id))
      : [];
    restored.settings.theme = restored.settings.theme === "dark" ? "dark" : "light";
    return restored;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      console.error("Could not load saved chat data.", error);
      try { localStorage.removeItem(STORAGE_KEY); } catch (storageError) { console.error("Could not clear invalid saved chat data.", storageError); }
      return structuredClone(seed);
    }
    if (error instanceof DOMException && error.name === "SecurityError") {
      console.error("Browser storage is unavailable; changes will not persist.", error);
      return structuredClone(seed);
    }
    throw error;
  }
}

let state = loadState();
let currentFilter = state.filter || "all";
let searchQuery = "";
let typingTimeout;
let demoSessionActive = true;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#171c19" : "#f5f7f5";
}

applyTheme(state.settings.theme);

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) {
    console.error("Could not save chat data.", error);
    showToast("Your browser couldn't save this change. Check storage permissions.");
  }
}

function contactFor(id) {
  return state.contacts.find((contact) => contact.id === id);
}

function conversationFor(id) {
  return state.conversations.find((conversation) => conversation.id === id);
}

function initialsFor(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function avatarMarkup(person, extraClass = "") {
  const initials = person.initials || initialsFor(person.name);
  const image = person.photo
    ? `<img src="${escapeHtml(person.photo)}" alt="" aria-hidden="true">`
    : escapeHtml(initials);
  const online = person.status === "Online" ? '<span class="presence-dot"></span>' : "";
  return `<span class="avatar ${extraClass}" style="--avatar-bg:${escapeHtml(person.color || "#d9e5db")}" aria-label="${escapeHtml(person.name)}"><span class="avatar-content">${image}</span>${online}</span>`;
}

function latestMessage(conversation) {
  return conversation.messages[conversation.messages.length - 1];
}

function shortTime(message) {
  if (!message) return "";
  if (message.stamp && Date.now() - message.stamp > 86400000) return "Yesterday";
  return message.time || "";
}

function iconStatus(status) {
  if (status === "sent") return `<span class="message-status">${svg("check")}</span>`;
  if (status === "delivered") return `<span class="message-status delivered">${svg("checks")}</span>`;
  if (status === "read") return `<span class="message-status read">${svg("checks")}</span>`;
  return "";
}

function updateCounts() {
  document.getElementById("conversation-count").textContent = state.conversations.length;
  document.getElementById("all-count").textContent = state.conversations.length;
  document.getElementById("unread-count").textContent = state.conversations.filter((conversation) => conversation.unread).length;
  document.getElementById("rail-initials").textContent = state.profile.initials || initialsFor(state.profile.name);
}

function renderConversationItem(conversation) {
  const person = contactFor(conversation.id);
  if (!person) return "";
  const message = latestMessage(conversation);
  const preview = message ? (message.file ? `📎 ${message.file.name}` : message.text) : "Say hello 👋";
  const own = message && message.sender === "jordan";
  const previewMarkup = own && message.status
    ? `<span class="mini-ticks">${message.status === "sent" ? "✓" : "✓✓"}</span>`
    : "";
  const isTyping = conversation.id === state.activeId && document.getElementById("typing-indicator") &&
    !document.getElementById("typing-indicator").hidden;
  const unreadMarkup = conversation.unread
    ? `<span class="unread-count">${conversation.unread}</span>`
    : "";
  const matchesSearch = !searchQuery || `${person.name} ${person.username} ${preview}`.toLowerCase().includes(searchQuery);
  const matchesFilter = currentFilter === "all" ||
    (currentFilter === "unread" && conversation.unread > 0) ||
    (currentFilter === "favorites" && person.favorite);
  const hidden = !matchesSearch || !matchesFilter;
  const selected = state.activeId === conversation.id;
  return `<button class="conversation-item${selected ? " selected" : ""}" data-conversation="${escapeHtml(conversation.id)}" ${hidden ? "hidden" : ""}>
    ${avatarMarkup(person)}
    <span class="conversation-copy">
      <span class="conversation-topline"><span class="conversation-name">${conversation.pinned ? '<span class="pinned-star">✳</span>' : ""}${escapeHtml(person.name)}</span><span class="conversation-time">${escapeHtml(shortTime(message))}</span></span>
      <span class="conversation-bottomline"><span class="conversation-preview">${previewMarkup}<span class="preview-text${isTyping ? " typing-preview" : ""}">${isTyping ? "typing…" : escapeHtml(preview)}</span></span>${unreadMarkup}</span>
    </span>
  </button>`;
}

function renderConversations() {
  const conversations = [...state.conversations].sort((a, b) => b.lastActivity - a.lastActivity);
  const pinned = conversations.filter((conversation) => conversation.pinned);
  const unpinned = conversations.filter((conversation) => !conversation.pinned);
  document.getElementById("pinned-list").innerHTML = pinned.map(renderConversationItem).join("");
  document.getElementById("conversation-list").innerHTML = unpinned.map(renderConversationItem).join("");
  const visible = [...document.querySelectorAll(".conversation-item")].some((item) => !item.hidden);
  document.getElementById("empty-search").hidden = visible;
  updateCounts();
}

function fileIconClass(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  return "doc";
}

function formatFileSize(size) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function renderMessage(message, contact) {
  const own = message.sender === "jordan";
  let body = escapeHtml(message.text || "");
  if (message.file) {
    const type = fileIconClass(message.file);
    const download = message.file.url
      ? `<a class="download-button" href="${escapeHtml(message.file.url)}" download="${escapeHtml(message.file.name)}" aria-label="Download ${escapeHtml(message.file.name)}" title="Download">${svg("download")}</a>`
      : `<span class="download-button" aria-label="File attached">${svg("check")}</span>`;
    body = `<div class="attachment-card"><span class="file-icon ${type}">${svg("file")}</span><span class="file-copy"><span class="file-name">${escapeHtml(message.file.name)}</span><span class="file-size">${escapeHtml(formatFileSize(message.file.size))}</span></span>${download}</div>${body ? `<span>${body}</span>` : ""}`;
  }
  const face = own ? "" : avatarMarkup(contact);
  return `<article class="message-row ${own ? "outgoing" : "incoming"}" data-message-id="${escapeHtml(message.id)}">
    ${face}
    <div class="message-content"><div class="message-bubble">${body}</div><div class="message-meta"><time>${escapeHtml(message.time || "")}</time>${own ? iconStatus(message.status) : ""}</div></div>
  </article>`;
}

function renderMessages() {
  const conversation = conversationFor(state.activeId);
  const contact = contactFor(state.activeId);
  const area = document.getElementById("messages");
  if (!conversation || !contact) {
    area.innerHTML = '<div class="empty-files">Select a contact to start a conversation.</div>';
    return;
  }
  const previousScroll = area.scrollHeight - area.scrollTop;
  const messages = conversation.messages;
  const content = messages.map((message, index) => {
    const currentDay = message.stamp ? new Date(message.stamp).toDateString() : "";
    const previousDay = index > 0 && messages[index - 1].stamp ? new Date(messages[index - 1].stamp).toDateString() : "";
    const separator = index === 0 || (currentDay && currentDay !== previousDay)
      ? `<div class="day-separator"><span>${currentDay === new Date().toDateString() ? "TODAY" : "OUR LITTLE CONVERSATION"}</span></div>`
      : "";
    return `${separator}${renderMessage(message, contact)}`;
  }).join("");
  area.innerHTML = content || '<div class="day-separator"><span>YOUR CONVERSATION STARTS HERE</span></div>';
  if (area.scrollHeight - previousScroll <= area.clientHeight + 100 || !area.dataset.initialized) {
    area.scrollTop = area.scrollHeight;
  }
  area.dataset.initialized = "true";
}

function renderHeader() {
  const contact = contactFor(state.activeId);
  const header = document.getElementById("chat-header");
  if (!contact) { header.innerHTML = ""; return; }
  const online = contact.status === "Online";
  header.innerHTML = `
    <div class="chat-person">
      <button class="mobile-back" data-action="back" aria-label="Back to conversations">${svg("back")}</button>
      ${avatarMarkup(contact)}
      <div class="chat-person-copy"><div class="chat-person-name">${escapeHtml(contact.name)}</div>
      <div class="chat-person-status"><span class="live-dot" style="${online ? "" : "background:#c9ceca;box-shadow:none"}"></span>${state.blockedContactIds.includes(contact.id) ? "Blocked" : escapeHtml(contact.status)}</div></div>
    </div>
    <div class="chat-actions">
      <button class="icon-button" data-action="voice-call" aria-label="Voice call" title="Voice call">${svg("phone")}</button>
      <button class="icon-button" data-action="video-call" aria-label="Video call" title="Video call">${svg("video")}</button>
      <span class="action-divider"></span>
      <button class="icon-button" data-action="contact-details" aria-label="Contact details" title="Contact details">${svg("info")}</button>
    </div>`;
}

function renderDetails() {
  const contact = contactFor(state.activeId);
  const panel = document.getElementById("details-panel");
  if (!contact) { panel.innerHTML = ""; return; }
  const conversation = conversationFor(contact.id);
  const isBlocked = state.blockedContactIds.includes(contact.id);
  const files = conversation ? conversation.messages.filter((message) => message.file).slice(-3).reverse() : [];
  panel.innerHTML = `
    <div class="details-topline"><span>ABOUT THIS CHAT</span><button data-action="more-details" aria-label="More options">${svg("more")}</button></div>
    <div class="profile-card">
      ${avatarMarkup(contact)}
      <div class="profile-name">${escapeHtml(contact.name)}</div><div class="profile-username">${escapeHtml(contact.username)}</div>
      <div class="profile-status"><span class="live-dot" style="${contact.status === "Online" ? "" : "background:#c9ceca;box-shadow:none"}"></span>${escapeHtml(contact.status)}</div>
      <div class="profile-quote">${escapeHtml(contact.about)}</div>
    </div>
    <div class="profile-actions">
      <button class="profile-action" data-action="voice-call"><span class="profile-action-icon">${svg("phone")}</span>Audio</button>
      <button class="profile-action" data-action="video-call"><span class="profile-action-icon">${svg("video")}</span>Video</button>
      <button class="profile-action" data-action="search-chat"><span class="profile-action-icon">${svg("search")}</span>Search</button>
    </div>
    <button class="block-contact-button${isBlocked ? " is-blocked" : ""}" data-action="toggle-block-contact">${isBlocked ? "Unblock contact" : "Block contact"}</button>
    <section class="details-section"><div class="details-section-header"><span>Shared moments</span><span>3 items</span></div>
      <div class="media-grid"><button class="media-tile" data-action="shared-media" aria-label="Shared photo"><span>☼</span></button><button class="media-tile" data-action="shared-media" aria-label="Shared photo"><span>✳</span></button><button class="media-tile" data-action="shared-media" aria-label="Shared photo"><span>❋</span></button></div>
    </section>
    <section class="details-section"><div class="details-section-header"><span>Shared files</span><span>${files.length} ${files.length === 1 ? "file" : "files"}</span></div>
      <div class="file-list">${files.length ? files.map((message) => `<div class="shared-file-row"><span class="file-icon ${fileIconClass(message.file)}">${svg("file")}</span><span class="file-copy"><span class="file-name">${escapeHtml(message.file.name)}</span><span class="file-size">${escapeHtml(formatFileSize(message.file.size))}</span></span></div>`).join("") : '<div class="empty-files">Files shared in this chat will appear here.</div>'}</div>
      <button class="view-all-button" data-action="files">View all shared files <span>→</span></button>
    </section>
    <div class="secure-note"><span>✳</span><span><strong>A little space, just for you two</strong>Your messages are private in this demo.</span></div>`;
}

function renderApp() {
  renderConversations();
  renderHeader();
  renderMessages();
  renderDetails();
  renderBlockedState();
  document.getElementById("rail-initials").textContent = state.profile.initials || initialsFor(state.profile.name);
}

function renderBlockedState() {
  const blocked = state.blockedContactIds.includes(state.activeId);
  const banner = document.getElementById("blocked-banner");
  const composer = document.getElementById("message-form");
  banner.hidden = !blocked;
  composer.hidden = blocked;
  if (blocked) {
    const contact = contactFor(state.activeId);
    document.getElementById("blocked-contact-name").textContent = contact ? contact.name : "This contact";
  }
}

function showToast(message) {
  const region = document.getElementById("toast-region");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `${svg("spark")}<span>${escapeHtml(message)}</span>`;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3500);
}

function getCurrentTime() {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function addMessage({ text = "", file = null, sender = "jordan", conversationId = state.activeId }) {
  const conversation = conversationFor(conversationId);
  if (!conversation) return;
  if (state.blockedContactIds.includes(conversationId)) {
    showToast("Unblock this contact before messaging or sharing files.");
    return;
  }
  const message = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, sender, text, file, time: getCurrentTime(), stamp: Date.now(), status: sender === "jordan" ? "sent" : undefined };
  conversation.messages.push(message);
  conversation.lastActivity = message.stamp;
  if (sender === "jordan") conversation.unread = 0;
  else if (conversation.id !== state.activeId) conversation.unread += 1;
  saveState();
  renderApp();
  if (sender === "jordan") {
    window.setTimeout(() => {
      const stored = conversationFor(conversationId);
      const delivered = stored && stored.messages.find((item) => item.id === message.id);
      if (!delivered) return;
      delivered.status = "delivered";
      saveState();
      if (state.activeId === conversationId) renderMessages();
      renderConversations();
    }, 450);
  }
  return message;
}

function selectConversation(id) {
  const conversation = conversationFor(id);
  if (!conversation) return;
  state.activeId = id;
  conversation.unread = 0;
  if (state.settings.readReceipts) {
    conversation.messages.forEach((message) => {
      if (message.sender !== "jordan") message.status = "read";
    });
  }
  saveState();
  document.querySelector(".app-shell").classList.add("mobile-chat-open");
  renderApp();
}

function sendMessage(text) {
  if (state.blockedContactIds.includes(state.activeId)) {
    showToast("Unblock this contact before sending a message.");
    return;
  }
  const message = text.trim();
  if (!message) return;
  addMessage({ text: message });
  const input = document.getElementById("message-input");
  input.value = "";
  input.style.height = "31px";
  scheduleReply(message);
}

function scheduleReply(message) {
  const contact = contactFor(state.activeId);
  if (!contact || contact.status !== "Online" || state.blockedContactIds.includes(contact.id)) return;
  const name = contact.name.split(" ")[0];
  const indicator = document.getElementById("typing-indicator");
  document.getElementById("typing-name").textContent = name;
  indicator.hidden = false;
  renderConversations();
  window.clearTimeout(typingTimeout);
  typingTimeout = window.setTimeout(() => {
    indicator.hidden = true;
    if (state.blockedContactIds.includes(contact.id)) {
      renderConversations();
      return;
    }
    const conversation = conversationFor(contact.id);
    if (conversation) {
      conversation.messages.forEach((message) => {
        if (message.sender === "jordan" && message.status === "delivered") message.status = "read";
      });
      saveState();
      if (state.activeId === contact.id) renderMessages();
    }
    const reply = /book|weekend|address/i.test(message)
      ? "That sounds lovely! Count me in 🌿"
      : /coffee|tomorrow/i.test(message)
        ? "Absolutely! Looking forward to it ☕"
        : ["This made me smile 😊", "Tell me more! 🌱", "Love that for us ✨", "I was just thinking the same thing 🫶"][Math.floor(Math.random() * 4)];
    addMessage({ text: reply, sender: contact.id, conversationId: contact.id });
  }, 2600);
}

function createConversation(id) {
  let conversation = conversationFor(id);
  if (!conversation) {
    conversation = { id, pinned: false, unread: 0, lastActivity: Date.now(), messages: [] };
    state.conversations.push(conversation);
  }
  selectConversation(id);
}

function modalMarkup(title, subtitle, contents) {
  return `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
    <header class="modal-header"><div><div class="modal-heading">${escapeHtml(title)}</div><div class="modal-subheading">${escapeHtml(subtitle)}</div></div><button class="modal-close" data-action="close-modal" aria-label="Close">${svg("close")}</button></header>
    ${contents}
  </section></div>`;
}

function openModal(title, subtitle, contents, onReady) {
  const root = document.getElementById("modal-root");
  root.innerHTML = modalMarkup(title, subtitle, contents);
  if (onReady) onReady(root);
  const firstInput = root.querySelector("input, textarea, button");
  if (firstInput) firstInput.focus({ preventScroll: true });
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function showSignedOutScreen() {
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="signed-out-title">
      <div class="modal-heading" id="signed-out-title">You're signed out</div>
      <p class="signed-out-message">Account registration and secure sign-in need the backend service described in the project guide. This front-end prototype stores no login credentials.</p>
      <div class="modal-actions"><button class="button-primary" data-action="continue-demo">Continue with sample account</button></div>
    </section></div>`;
  document.querySelector('[data-action="continue-demo"]').focus();
}

function openNewChat() {
  const results = state.contacts.map((contact) => {
    const existing = Boolean(conversationFor(contact.id));
    return `<button class="contact-result" data-contact="${escapeHtml(contact.id)}">${avatarMarkup(contact)}<span class="contact-result-copy"><span class="contact-result-name">${escapeHtml(contact.name)}</span><span class="contact-result-status">${escapeHtml(contact.status)}${existing ? " · conversation started" : ""}</span></span><span class="contact-result-action">${existing ? "Open chat →" : "Say hello →"}</span></button>`;
  }).join("");
  openModal("A new little hello", "Pick someone from your contacts to start a conversation.", `<div class="contact-results">${results}</div>`);
}

function openProfileSettings() {
  const profile = state.profile;
  const blockedContacts = state.blockedContactIds.map(contactFor).filter(Boolean);
  const blockedMarkup = blockedContacts.length
    ? blockedContacts.map((contact) => `<div class="blocked-contact-row">${avatarMarkup(contact)}<span class="contact-result-copy"><span class="contact-result-name">${escapeHtml(contact.name)}</span><span class="contact-result-status">Blocked in this demo</span></span><button class="button-secondary unblock-button" data-unblock-contact="${escapeHtml(contact.id)}">Unblock</button></div>`).join("")
    : '<div class="empty-files">Contacts you block will be listed here.</div>';
  const contents = `
    <div class="settings-section-label">YOUR PROFILE</div>
    <div class="field-group"><label class="field-label" for="profile-name">Your name</label><input class="field-input" id="profile-name" maxlength="50" value="${escapeHtml(profile.name)}" required></div>
    <div class="field-group"><label class="field-label" for="profile-username">Username</label><input class="field-input" id="profile-username" maxlength="30" value="${escapeHtml(profile.username)}"></div>
    <div class="field-group"><label class="field-label" for="profile-about">A little about you</label><textarea class="field-input" id="profile-about" maxlength="140">${escapeHtml(profile.about)}</textarea></div>
    <div class="settings-section-label settings-section-spaced">APPEARANCE</div>
    <div class="theme-options" role="group" aria-label="Choose color theme">
      <button class="theme-option${state.settings.theme === "light" ? " selected" : ""}" data-theme-choice="light" aria-pressed="${state.settings.theme === "light"}"><span class="theme-preview light-preview"><i></i><i></i><i></i></span><span>Light</span><span class="theme-check">${state.settings.theme === "light" ? "✓" : ""}</span></button>
      <button class="theme-option${state.settings.theme === "dark" ? " selected" : ""}" data-theme-choice="dark" aria-pressed="${state.settings.theme === "dark"}"><span class="theme-preview dark-preview"><i></i><i></i><i></i></span><span>Dark</span><span class="theme-check">${state.settings.theme === "dark" ? "✓" : ""}</span></button>
    </div>
    <div class="settings-section-label settings-section-spaced">PRIVACY & NOTIFICATIONS</div>
    <div class="settings-block"><div class="settings-copy"><strong>Message notifications</strong><span>Keep up with the people you love.</span></div><button class="switch ${state.settings.notifications ? "on" : ""}" data-setting="notifications" role="switch" aria-checked="${state.settings.notifications}" aria-label="Message notifications"></button></div>
    <div class="settings-block"><div class="settings-copy"><strong>Read receipts</strong><span>Let people know when you've read their message.</span></div><button class="switch ${state.settings.readReceipts ? "on" : ""}" data-setting="readReceipts" role="switch" aria-checked="${state.settings.readReceipts}" aria-label="Read receipts"></button></div>
    <div class="settings-section-label settings-section-spaced">BLOCKED CONTACTS <span class="blocked-count">${blockedContacts.length}</span></div>
    <div class="blocked-contacts-list">${blockedMarkup}</div>
    <div class="modal-actions"><button class="button-secondary" data-action="logout">Log out</button><button class="button-primary" data-action="save-profile">Save changes</button></div>`;
  openModal("Settings & profile", "Personalize Chatter and manage who can message you.", contents);
}

function openBlockConfirmation() {
  const contact = contactFor(state.activeId);
  if (!contact) return;
  openModal(
    `Block ${contact.name}?`,
    "They won't be able to message you in this demo. You can unblock them anytime in Settings.",
    `<div class="block-confirm-note">Your existing conversation will stay here. Blocking only changes this browser demo.</div>
     <div class="modal-actions"><button class="button-secondary" data-action="close-modal">Cancel</button><button class="button-danger" data-action="confirm-block-contact" data-contact-id="${escapeHtml(contact.id)}">Block contact</button></div>`
  );
}

function unblockContact(id) {
  state.blockedContactIds = state.blockedContactIds.filter((blockedId) => blockedId !== id);
  saveState();
  renderApp();
  showToast(`${contactFor(id)?.name || "Contact"} can message you again.`);
}

function openFiles() {
  const files = state.conversations.flatMap((chat) => chat.messages.filter((message) => message.file).map((message) => ({ ...message, contact: contactFor(chat.id) })));
  const rows = files.length ? files.slice().reverse().map((message) => `
    <div class="shared-file-row"><span class="file-icon ${fileIconClass(message.file)}">${svg("file")}</span><span class="file-copy"><span class="file-name">${escapeHtml(message.file.name)}</span><span class="file-size">${escapeHtml(formatFileSize(message.file.size))} · ${escapeHtml(message.contact ? message.contact.name : "Chat")}</span></span>${message.file.url ? `<a class="download-button" href="${escapeHtml(message.file.url)}" download="${escapeHtml(message.file.name)}" aria-label="Download file">${svg("download")}</a>` : ""}</div>`).join("")
    : '<div class="empty-files">No files shared just yet. Attach one in a chat and it will show up here.</div>';
  openModal("Shared with you", `A little library of the things you and ${escapeHtml(contactFor(state.activeId)?.name || "your friends")} have shared.`, `<div class="file-list">${rows}</div><div class="modal-actions"><button class="button-primary" data-action="close-modal">Lovely</button></div>`);
}

function handleFiles(fileList) {
  if (state.blockedContactIds.includes(state.activeId)) {
    showToast("Unblock this contact before sharing a file.");
    return;
  }
  const files = Array.from(fileList);
  files.forEach((file) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast(`${file.name} is bigger than our 10 MB demo limit.`);
      return;
    }
    const fileRecord = { name: file.name, size: file.size };
    if (file.size <= 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        fileRecord.url = reader.result;
        addMessage({ file: fileRecord });
      };
      reader.onerror = () => {
        console.error("Could not read the selected image.", reader.error);
        showToast(`Couldn't attach ${file.name}. Please try again.`);
      };
      reader.readAsDataURL(file);
    } else {
      addMessage({ file: fileRecord });
      showToast("Attached to this demo chat. Files over 1 MB aren't stored locally.");
    }
  });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-conversation], [data-contact], [data-setting], [data-theme-choice], [data-unblock-contact]");
  if (!target) return;
  if (target.dataset.themeChoice) {
    state.settings.theme = target.dataset.themeChoice;
    applyTheme(state.settings.theme);
    saveState();
    document.querySelectorAll(".theme-option").forEach((option) => {
      const selected = option.dataset.themeChoice === state.settings.theme;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-pressed", String(selected));
      option.querySelector(".theme-check").textContent = selected ? "✓" : "";
    });
    return;
  }
  if (target.dataset.unblockContact) {
    unblockContact(target.dataset.unblockContact);
    openProfileSettings();
    return;
  }
  if (target.dataset.conversation) { selectConversation(target.dataset.conversation); return; }
  if (target.dataset.contact) { createConversation(target.dataset.contact); closeModal(); return; }
  if (target.dataset.setting) {
    const setting = target.dataset.setting;
    state.settings[setting] = !state.settings[setting];
    target.classList.toggle("on", state.settings[setting]);
    target.setAttribute("aria-checked", String(state.settings[setting]));
    saveState();
    return;
  }
  switch (target.dataset.action) {
    case "new-chat":
    case "contacts": openNewChat(); break;
    case "settings": openProfileSettings(); break;
    case "files": openFiles(); break;
    case "attach": document.getElementById("file-input").click(); break;
    case "emoji": {
      const input = document.getElementById("message-input");
      const start = input.selectionStart;
      input.setRangeText("😊", start, input.selectionEnd, "end");
      input.focus();
      break;
    }
    case "voice": showToast("Voice messages are on the roadmap ✨"); break;
    case "voice-call":
    case "video-call": showToast("Calling is ready for the real-time backend ✨"); break;
    case "contact-details": document.getElementById("details-panel").scrollTo({ top: 0, behavior: "smooth" }); showToast("A little more about this person, just to the right."); break;
    case "search-chat": document.getElementById("chat-search").focus(); break;
    case "shared-media": showToast("Shared photos will show here once you send one."); break;
    case "more-details": showToast("You're in a private one-to-one chat."); break;
    case "toggle-block-contact":
      if (state.blockedContactIds.includes(state.activeId)) {
        unblockContact(state.activeId);
      } else {
        openBlockConfirmation();
      }
      break;
    case "confirm-block-contact": {
      const contactId = target.dataset.contactId;
      if (contactFor(contactId) && !state.blockedContactIds.includes(contactId)) {
        state.blockedContactIds.push(contactId);
        const conversation = conversationFor(contactId);
        if (conversation) conversation.unread = 0;
        saveState();
        closeModal();
        renderApp();
        showToast(`${contactFor(contactId).name} is blocked in this demo.`);
      }
      break;
    }
    case "back": document.querySelector(".app-shell").classList.remove("mobile-chat-open"); break;
    case "close-modal": closeModal(); break;
    case "backdrop": if (event.target === target) closeModal(); break;
    case "logout": demoSessionActive = false; showSignedOutScreen(); break;
    case "continue-demo": demoSessionActive = true; closeModal(); showToast("Welcome back to the sample account ✨"); break;
    case "save-profile": {
      const name = document.getElementById("profile-name").value.trim();
      const username = document.getElementById("profile-username").value.trim();
      const about = document.getElementById("profile-about").value.trim();
      if (name.length < 2) { document.getElementById("profile-name").setCustomValidity("Please enter a name with at least 2 characters."); document.getElementById("profile-name").reportValidity(); return; }
      state.profile = { ...state.profile, name, username: username.startsWith("@") || !username ? username : `@${username}`, about, initials: initialsFor(name) };
      saveState(); closeModal(); renderApp(); showToast("Your profile feels a little more like you now.");
      break;
    }
  }
});

document.getElementById("message-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(document.getElementById("message-input").value);
});

document.getElementById("message-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(event.currentTarget.value);
  }
});

document.getElementById("message-input").addEventListener("input", (event) => {
  event.currentTarget.style.height = "31px";
  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 110)}px`;
});

document.getElementById("chat-search").addEventListener("input", (event) => {
  searchQuery = event.currentTarget.value.trim().toLowerCase();
  renderConversations();
});

document.querySelectorAll(".filter-tab").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll(".filter-tab").forEach((other) => {
    const selected = other === tab;
    other.classList.toggle("selected", selected);
    other.setAttribute("aria-selected", String(selected));
  });
  currentFilter = tab.dataset.filter;
  renderConversations();
}));

document.getElementById("file-input").addEventListener("change", (event) => {
  if (event.currentTarget.files.length) handleFiles(event.currentTarget.files);
  event.currentTarget.value = "";
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.getElementById("chat-search").focus();
  }
  if (event.key === "Escape" && demoSessionActive) closeModal();
});

renderApp();
