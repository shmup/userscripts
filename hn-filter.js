// ==UserScript==
// @name         hn keyword filter
// @namespace    https://github.com/shmup/userscripts
// @version      1.1.0
// @description  filters hacker news posts by title keywords and renumbers the list
// @author       shmup
// @match        https://news.ycombinator.com/*
// @license      MIT
// @grant        none
// @run-at       document-idle
// @ts-nocheck
// ==/UserScript==

// jshint esversion: 11
(function () {
  "use strict";

  const STORAGE_KEY = "hn-filter-patterns";

  const loadPatterns = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const savePatterns = (patterns) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  };

  // convert user pattern to regex source
  // plain word = \bword\b, pattern with * = wildcard match
  const patternToRegex = (pat) => {
    pat = pat.trim().toLowerCase();
    if (!pat) return null;
    const startsWild = pat.startsWith("*");
    const endsWild = pat.endsWith("*");
    // escape regex special chars except *
    const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const src = escaped.replace(/\*/g, ".*");
    if (!startsWild && !endsWild) return "\\b" + src + "\\b";
    return (startsWild ? "" : "\\b") + src + (endsWild ? "" : "\\b");
  };

  const buildRegex = (parts) => {
    if (!parts.length) return null;
    return new RegExp("(" + parts.join("|") + ")", "i");
  };

  const buildMatchers = (patterns) => {
    const titleParts = [];
    const urlParts = [];
    for (const pat of patterns) {
      if (pat.startsWith("url:")) {
        const src = patternToRegex(pat.slice(4));
        if (src) urlParts.push(src);
      } else {
        const src = patternToRegex(pat);
        if (src) titleParts.push(src);
      }
    }
    return {
      title: buildRegex(titleParts),
      url: buildRegex(urlParts),
    };
  };

  let minTextareaHeight = 0;

  // test each row against matchers, call fn(row, subtext, spacer, matched)
  const eachRow = (matchers, fn) => {
    const rows = document.querySelectorAll("tr.athing");
    rows.forEach((row) => {
      const titleEl = row.querySelector(".titleline > a");
      if (!titleEl) return;

      const siteEl = row.querySelector(".sitebit a");
      const site = siteEl ? siteEl.textContent : "";
      const href = titleEl.href || "";

      const subtext = row.nextElementSibling;
      const spacer = subtext?.nextElementSibling;

      const titleMatch =
        matchers.title && matchers.title.test(titleEl.textContent);
      const urlMatch =
        matchers.url && (matchers.url.test(site) || matchers.url.test(href));

      fn(row, subtext, spacer, titleMatch || urlMatch);
    });
  };

  const filter = () => {
    const blocked = buildMatchers(loadPatterns());
    if (!blocked.title && !blocked.url) return;

    const page = Number(new URLSearchParams(location.search).get("p")) || 1;
    const startRank = (page - 1) * 30;
    let rank = startRank;

    eachRow(blocked, (row, subtext, spacer, matched) => {
      const display = matched ? "none" : "";
      row.style.display = display;
      if (subtext) subtext.style.display = display;
      if (spacer?.classList.contains("spacer")) spacer.style.display = display;

      if (!matched) {
        rank++;
        const rankEl = row.querySelector(".rank");
        if (rankEl) rankEl.textContent = rank + ".";
      }
    });
  };

  const clearHighlights = () => {
    document
      .querySelectorAll("tr.athing.hn-filter-highlight")
      .forEach((row) => {
        row.classList.remove("hn-filter-highlight");
      });
  };

  const preview = (text) => {
    const lines = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const matchers = buildMatchers(lines);

    if (!matchers.title && !matchers.url) {
      clearHighlights();
      return;
    }

    eachRow(matchers, (row, _subtext, _spacer, matched) => {
      row.classList.toggle("hn-filter-highlight", matched);
    });
  };

  // filters panel - toggles inline, no overlay
  const injectStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      #hn-filter-panel textarea,
      #hn-filter-panel button {
        font-family: Verdana, Geneva, sans-serif;
        font-size: 10pt;
      }
      #hn-filter-textarea {
        border: 1px solid #828282;
        padding: 4px;
        overflow: hidden;
        resize: none;
      }
      #hn-filter-panel button { cursor: pointer; }
      tr.athing.hn-filter-highlight .titleline > a {
        background-color: #ff6600;
        color: #fffefe;
      }
    `;
    document.head.appendChild(style);
  };

  const createPanel = () => {
    const panel = document.createElement("tr");
    panel.id = "hn-filter-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <td colspan="3" style="padding:10px;">
        <b>Filter patterns</b>
        <span style="color:#828282; margin-left:8px;">
          words match standalone, * for wildcards, url: for site/link
        </span>
        <br><br>
        <textarea id="hn-filter-textarea" rows="6" cols="60"
          placeholder="ai&#10;llm&#10;meta-prompt*&#10;context-eng*&#10;url:*.ai&#10;url:openai.*"
        ></textarea>
        <br>
        <span style="margin-top:4px; display:inline-block;">
          <button id="hn-filter-close">save &amp; close</button>
        </span>
      </td>
    `;
    return panel;
  };

  const addFilterLink = () => {
    // find the left pagetop span (the one with nav links)
    const pagetop = document.querySelector(".pagetop");
    if (!pagetop) return;

    // add " | filters" after submit
    const sep = document.createTextNode(" | ");
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = "filters";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      togglePanel();
    });
    pagetop.appendChild(sep);
    pagetop.appendChild(link);

    // insert panel row into the main table, after the header rows
    const panel = createPanel();
    const mainTable = document.querySelector("#hnmain > tbody");
    // insert before the row that contains the item list
    const bigbox = document.querySelector("#bigbox");
    if (bigbox && mainTable) {
      mainTable.insertBefore(panel, bigbox);
    }

    const textarea = document.querySelector("#hn-filter-textarea");

    const autoResize = () => {
      textarea.style.height = "0";
      textarea.style.height =
        Math.max(textarea.scrollHeight, minTextareaHeight) + "px";
    };

    let debounceTimer;
    const debouncedPreview = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => preview(textarea.value), 200);
    };

    textarea.addEventListener("input", () => {
      autoResize();
      debouncedPreview();
    });

    document
      .querySelector("#hn-filter-close")
      .addEventListener("click", togglePanel);
  };

  const togglePanel = () => {
    const panel = document.querySelector("#hn-filter-panel");
    if (!panel) return;
    const visible = panel.style.display !== "none";
    if (!visible) {
      // opening: unhide everything so highlights are visible
      document.querySelectorAll("tr.athing").forEach((row) => {
        row.style.display = "";
        const subtext = row.nextElementSibling;
        const spacer = subtext?.nextElementSibling;
        if (subtext) subtext.style.display = "";
        if (spacer?.classList.contains("spacer")) spacer.style.display = "";
      });

      const textarea = document.querySelector("#hn-filter-textarea");
      textarea.value = loadPatterns().join("\n");
      panel.style.display = "";
      if (!minTextareaHeight) minTextareaHeight = textarea.offsetHeight;
      textarea.style.height = "0";
      textarea.style.height =
        Math.max(textarea.scrollHeight, minTextareaHeight) + "px";

      // highlight current patterns
      preview(textarea.value);
      return;
    }

    // closing: save, clear highlights, apply filter
    const textarea = document.querySelector("#hn-filter-textarea");
    const lines = textarea.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    savePatterns(lines);
    clearHighlights();
    panel.style.display = "none";
    filter();
  };

  // init
  injectStyles();
  addFilterLink();
  filter();
})();
