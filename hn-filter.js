// ==UserScript==
// @name         hn keyword filter
// @namespace    https://github.com/shmup/userscripts
// @version      1.1.0
// @description  filters hacker news posts by title keywords and renumbers the list
// @author       shmup
// @match        https://news.ycombinator.com/*
// @grant        none
// @run-at       document-idle
// @ts-nocheck
// ==/UserScript==

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
    const hasWild = pat.includes("*");
    // escape regex special chars except *
    const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const src = escaped.replace(/\*/g, ".*");
    return hasWild ? src : "\\b" + src + "\\b";
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

  const filter = () => {
    const blocked = buildMatchers(loadPatterns());
    const page = Number(new URLSearchParams(location.search).get("p")) || 1;
    const startRank = (page - 1) * 30;

    const rows = document.querySelectorAll("tr.athing");
    let rank = startRank;

    rows.forEach((row) => {
      const titleEl = row.querySelector(".titleline > a");
      if (!titleEl) return;

      const siteEl = row.querySelector(".sitebit a");
      const site = siteEl ? siteEl.textContent : "";
      const href = titleEl.href || "";

      // the subtext/spacer rows immediately follow each athing row
      const subtext = row.nextElementSibling;
      const spacer = subtext?.nextElementSibling;

      const titleMatch =
        blocked.title && blocked.title.test(titleEl.textContent);
      const urlMatch =
        blocked.url && (blocked.url.test(site) || blocked.url.test(href));
      const hide = titleMatch || urlMatch;
      const display = hide ? "none" : "";

      row.style.display = display;
      if (subtext) subtext.style.display = display;
      if (spacer?.classList.contains("spacer")) spacer.style.display = display;

      if (!hide) {
        rank++;
        const rankEl = row.querySelector(".rank");
        if (rankEl) rankEl.textContent = rank + ".";
      }
    });
  };

  // filters panel - toggles inline, no overlay
  const createPanel = () => {
    const panel = document.createElement("tr");
    panel.id = "hn-filter-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <td colspan="3" style="padding:10px;">
        <table border="0" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td>
            <b>Filter patterns</b>
            <span style="color:#828282; margin-left:8px;">
              words match standalone, * for wildcards, url: for site/link
            </span>
            <br><br>
            <textarea id="hn-filter-textarea" rows="6" cols="60"
              placeholder="ai&#10;llm&#10;meta-prompt*&#10;context-eng*&#10;url:*.ai&#10;url:openai.*"
              style="font-family:Verdana, Geneva, sans-serif; font-size:10pt;
                     border:1px solid #828282; padding:4px;"
            ></textarea>
            <br>
            <span style="margin-top:4px; display:inline-block;">
              <button id="hn-filter-save"
                style="font-family:Verdana, Geneva, sans-serif; font-size:10pt;
                       cursor:pointer;">save</button>
              <button id="hn-filter-close"
                style="font-family:Verdana, Geneva, sans-serif; font-size:10pt;
                       cursor:pointer; margin-left:4px;">close</button>
              <span id="hn-filter-status" style="color:#828282; margin-left:8px;"></span>
            </span>
          </td></tr>
        </table>
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

    // wire up buttons
    const textarea = document.querySelector("#hn-filter-textarea");
    const saveBtn = document.querySelector("#hn-filter-save");
    const status = document.querySelector("#hn-filter-status");

    saveBtn.addEventListener("click", () => {
      const lines = textarea.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      savePatterns(lines);
      filter();
      status.textContent = "saved";
      setTimeout(() => {
        status.textContent = "";
      }, 1500);
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
      const textarea = document.querySelector("#hn-filter-textarea");
      textarea.value = loadPatterns().join("\n");
    }
    panel.style.display = visible ? "none" : "";
  };

  // init
  addFilterLink();
  filter();
})();
