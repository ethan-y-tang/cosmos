"use strict";

// === DOM ELEMENTS ===
const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const frame = document.getElementById("uv-frame");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// === TAB SYSTEM ===
const tabBar = document.getElementById("tab-bar");
const tabContent = document.createElement("div");
tabContent.id = "tab-content";
frame.replaceWith(tabContent);

const newTabBtn = document.createElement("button");
newTabBtn.id = "new-tab";
newTabBtn.textContent = "+";
tabBar.appendChild(newTabBtn);

let tabs = [];
let currentTab = null;

function createTab(url = null) {
  const id = Date.now().toString();
  const tab = document.createElement("div");
  tab.className = "tab";
  tab.dataset.id = id;
  tab.textContent = url ? new URL(url).hostname : "New Tab";

  const close = document.createElement("span");
  close.textContent = "✕";
  close.className = "tab-close";
  close.onclick = (e) => {
    e.stopPropagation();
    closeTab(id);
  };

  tab.appendChild(close);
  tab.onclick = () => switchTab(id);

  const iframe = document.createElement("iframe");
  iframe.dataset.id = id;
  iframe.loading = "lazy";
  iframe.title = "Proxy Tab";

  tabBar.insertBefore(tab, newTabBtn);
  tabContent.appendChild(iframe);

  tabs.push({ id, tab, iframe, url });
  switchTab(id);

  if (url) loadProxiedUrl(iframe, url);
}

function switchTab(id) {
  tabs.forEach(({ tab, iframe }) => {
    const active = tab.dataset.id === id;
    tab.classList.toggle("active", active);
    iframe.classList.toggle("active", active);
  });
  currentTab = id;
}

function closeTab(id) {
  const index = tabs.findIndex((t) => t.id === id);
  if (index === -1) return;
  const { tab, iframe } = tabs[index];
  tab.remove();
  iframe.remove();
  tabs.splice(index, 1);
  if (currentTab === id && tabs.length) switchTab(tabs[tabs.length - 1].id);
}

// === URL HANDLING ===
async function loadProxiedUrl(iframe, input) {
  const url = formatURL(input);
  const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;

  try {
    await registerSW();

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
  try {
    return new URL(input).toString();
  } catch {
    return searchEngine.value.replace("%s", encodeURIComponent(input));
  }
}

// === FORM SUBMIT ===
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = address.value.trim();
  if (!input) return;

  const tab = tabs.find((t) => t.id === currentTab);
  if (!tab) return;

  tab.url = input;
  loadProxiedUrl(tab.iframe, input);
});

// === ADD NEW TAB ===
newTabBtn.onclick = () => createTab();

// Start with one tab
createTab();

// === THEME HANDLER ===
const lightBannerImg = new Image();
const darkBannerImg = new Image();
lightBannerImg.src = "bannerLight.webp";
darkBannerImg.src = "bannerDark.webp";

let themeToggle, themeIcon, body, html, bannerImg;
let isInitialized = false;

function initializeTheme() {
  if (isInitialized) return;

  themeToggle = document.getElementById("theme-toggle");
  themeIcon = themeToggle?.querySelector(".theme-icon");
  body = document.body;
  html = document.documentElement;
  bannerImg = document.getElementById("banner-img");

  if (!themeToggle || !themeIcon || !bannerImg) {
    requestAnimationFrame(initializeTheme);
    return;
  }

  // Lightweight placeholder instantly
  bannerImg.src =
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='100'><rect width='400' height='100' fill='%231a1b26'/></svg>";

  const savedTheme = localStorage.getItem("theme");
  const isDarkMode =
    html.classList.contains("dark-theme") ||
    body.classList.contains("dark-theme") ||
    savedTheme === "dark";

  if (isDarkMode) {
    html.classList.add("dark-theme");
    body.classList.add("dark-theme");
    themeIcon.textContent = "☀️";
    darkBannerImg.decode().then(() => {
      bannerImg.src = darkBannerImg.src;
    });
    localStorage.setItem("theme", "dark");
  } else {
    html.classList.remove("dark-theme");
    body.classList.remove("dark-theme");
    themeIcon.textContent = "🌙";
    lightBannerImg.decode().then(() => {
      bannerImg.src = lightBannerImg.src;
    });
    localStorage.setItem("theme", "light");
  }

  themeToggle.addEventListener("click", toggleTheme, { passive: true });
  isInitialized = true;
}

function toggleTheme() {
  if (!isInitialized) return;

  const isDarkMode = body.classList.contains("dark-theme");
  themeIcon.classList.add("spin");
  setTimeout(() => themeIcon.classList.remove("spin"), 600);

  requestAnimationFrame(() => {
    if (isDarkMode) {
      html.classList.remove("dark-theme");
      body.classList.remove("dark-theme");
      themeIcon.textContent = "🌙";
      lightBannerImg.decode().then(() => {
        bannerImg.src = lightBannerImg.src;
      });
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark-theme");
      body.classList.add("dark-theme");
      themeIcon.textContent = "☀️";
      darkBannerImg.decode().then(() => {
        bannerImg.src = darkBannerImg.src;
      });
      localStorage.setItem("theme", "dark");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTheme, { once: true });
} else {
  requestAnimationFrame(initializeTheme);
}
