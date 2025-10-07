"use strict";

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// === DOM ELEMENTS ===
const tabBar = document.getElementById("tab-bar");
const tabContent = document.getElementById("tab-content");
const home = document.getElementById("home");
const startBtn = document.getElementById("start-btn");
const addressBar = document.getElementById("address-bar");
const addressInput = document.getElementById("uv-address");
const goBtn = document.getElementById("go-btn");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");

let tabs = [];
let currentTab = null;

// === TAB FUNCTIONS ===
function createTab(url = null) {
  // Hide homepage & address bar initially
  home.style.display = "none";
  addressBar.style.display = "flex";

  const id = Date.now().toString();
  const tabEl = document.createElement("div");
  tabEl.className = "tab";
  tabEl.dataset.id = id;
  tabEl.textContent = url ? new URL(url).hostname : "New Tab";

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.className = "tab-close";
  closeBtn.onclick = (e) => { e.stopPropagation(); closeTab(id); };
  tabEl.appendChild(closeBtn);
  tabEl.onclick = () => switchTab(id);

  const iframe = document.createElement("iframe");
  iframe.dataset.id = id;
  iframe.loading = "lazy";
  iframe.className = "tab-frame";
  iframe.title = "Proxy Tab";

  iframe.addEventListener("load", () => {
    try {
      const title = iframe.contentDocument?.title || tabEl.textContent;
      if (title && title.length < 60) tabEl.childNodes[0].textContent = title;
    } catch {}
  });

  tabBar.appendChild(tabEl);
  tabContent.appendChild(iframe);

  tabs.push({ id, tabEl, iframe, url });
  switchTab(id);

  if (url) loadProxiedUrl(iframe, url);
}

function switchTab(id) {
  tabs.forEach(({ tabEl, iframe }) => {
    const active = tabEl.dataset.id === id;
    tabEl.classList.toggle("active", active);
    iframe.style.display = active ? "block" : "none";
  });
  currentTab = id;
  // Hide address bar after navigating
  if (currentTab) addressBar.style.display = "none";
}

function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;
  const { tabEl, iframe } = tabs[index];
  tabEl.remove();
  iframe.remove();
  tabs.splice(index, 1);
  if (currentTab === id) {
    if (tabs.length) switchTab(tabs[tabs.length - 1].id);
    else {
      home.style.display = "flex";
      addressBar.style.display = "flex";
    }
  }
}

// === URL HANDLING ===
async function loadProxiedUrl(iframe, input) {
  const url = formatURL(input);
  const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;

  try {
    if (await connection.getTransport() !== "/epoxy/index.mjs") {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
    iframe.src = __uv$config.prefix + __uv$config.encodeUrl(url);
  } catch (err) {
    error.textContent = "Failed to load URL.";
    errorCode.textContent = err.toString();
  }
}

function formatURL(input) {
  try { return new URL(input).toString(); }
  catch { return `https://www.google.com/search?q=${encodeURIComponent(input)}`; }
}

// === EVENTS ===
startBtn.onclick = () => createTab("https://www.google.com");
goBtn.onclick = () => {
  const input = addressInput.value.trim();
  if (!input) return;
  const tab = tabs.find(t => t.id === currentTab);
  if (!tab) return;
  tab.url = input;
  loadProxiedUrl(tab.iframe, input);
  addressBar.style.display = "none";
};

addressInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") goBtn.click();
});

// Start with one tab hidden (homepage)
addressBar.style.display = "flex";

// === THEME HANDLER ===
const lightBannerImg = new Image();
const darkBannerImg = new Image();
lightBannerImg.src = "bannerLight.webp";
darkBannerImg.src = "bannerDark.webp";

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = themeToggle.querySelector(".theme-icon");
const bannerImg = document.getElementById("banner-img");
const body = document.body;
const html = document.documentElement;

function setTheme(dark) {
  if (dark) {
    html.classList.add("dark-theme");
    body.classList.add("dark-theme");
    themeIcon.textContent = "☀️";
    darkBannerImg.decode().then(() => bannerImg.src = darkBannerImg.src);
    localStorage.setItem("theme", "dark");
  } else {
    html.classList.remove("dark-theme");
    body.classList.remove("dark-theme");
    themeIcon.textContent = "🌙";
    lightBannerImg.decode().then(() => bannerImg.src = lightBannerImg.src);
    localStorage.setItem("theme", "light");
  }
}

themeToggle.onclick = () => setTheme(!html.classList.contains("dark-theme"));

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTheme(localStorage.getItem("theme") === "dark");
  });
} else setTheme(localStorage.getItem("theme") === "dark");
