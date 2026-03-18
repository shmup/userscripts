// ==UserScript==
// @name         hn keyword filter
// @namespace    https://github.com/shmup/userscripts
// @version      2.0.0
// @description  filters hacker news posts by title keywords and renumbers the list
// @author       shmup
// @match        https://news.ycombinator.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const STORAGE_KEY = 'hn-filter-patterns';
  const DEFAULTS = ['ai', 'llm', 'openai', 'anthropic', 'mistral'];

  const loadPatterns = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULTS;
    } catch {
      return DEFAULTS;
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
    const hasWild = pat.includes('*');
    // escape regex special chars except *
    const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const src = escaped.replace(/\*/g, '.*');
    return hasWild ? src : '\\b' + src + '\\b';
  };

  const buildRegex = (patterns) => {
    const parts = patterns.map(patternToRegex).filter(Boolean);
    if (!parts.length) return null;
    return new RegExp('(' + parts.join('|') + ')', 'i');
  };

  const filter = () => {
    const blocked = buildRegex(loadPatterns());
    const page = Number(new URLSearchParams(location.search).get('p')) || 1;
    const startRank = (page - 1) * 30;

    const rows = document.querySelectorAll('tr.athing');
    let rank = startRank;

    rows.forEach(row => {
      const titleEl = row.querySelector('.titleline > a');
      if (!titleEl) return;

      // the subtext/spacer rows immediately follow each athing row
      const subtext = row.nextElementSibling;
      const spacer = subtext?.nextElementSibling;

      if (blocked && blocked.test(titleEl.textContent)) {
        row.style.display = 'none';
        if (subtext) subtext.style.display = 'none';
        if (spacer?.classList.contains('spacer')) spacer.style.display = 'none';
      } else {
        row.style.display = '';
        if (subtext) subtext.style.display = '';
        if (spacer?.classList.contains('spacer')) spacer.style.display = '';
        rank++;
        const rankEl = row.querySelector('.rank');
        if (rankEl) rankEl.textContent = rank + '.';
      }
    });
  };

  // filters panel - toggles inline, no overlay
  const createPanel = () => {
    const panel = document.createElement('tr');
    panel.id = 'hn-filter-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <td colspan="3" style="padding:10px;">
        <table border="0" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr><td>
            <b>Filter patterns</b>
            <span style="color:#828282; margin-left:8px;">
              plain words match standalone, use * for wildcards
            </span>
            <br><br>
            <textarea id="hn-filter-textarea" rows="6" cols="60"
              style="font-family:Verdana, Geneva, sans-serif; font-size:10pt;
                     border:1px solid #828282; padding:4px;"
            ></textarea>
            <br>
            <span style="margin-top:4px; display:inline-block;">
              <button id="hn-filter-save"
                style="font-family:Verdana, Geneva, sans-serif; font-size:10pt;
                       cursor:pointer;">save</button>
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
    const pagetop = document.querySelector('.pagetop');
    if (!pagetop) return;

    // add " | filters" after submit
    const sep = document.createTextNode(' | ');
    const link = document.createElement('a');
    link.href = 'javascript:;';
    link.textContent = 'filters';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      togglePanel();
    });
    pagetop.appendChild(sep);
    pagetop.appendChild(link);

    // insert panel row into the main table, after the header rows
    const panel = createPanel();
    const mainTable = document.querySelector('#hnmain > tbody');
    // insert before the row that contains the item list
    const bigbox = document.querySelector('#bigbox');
    if (bigbox && mainTable) {
      mainTable.insertBefore(panel, bigbox);
    }

    // wire up buttons
    const textarea = document.querySelector('#hn-filter-textarea');
    const saveBtn = document.querySelector('#hn-filter-save');
    const status = document.querySelector('#hn-filter-status');

    saveBtn.addEventListener('click', () => {
      const lines = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
      savePatterns(lines);
      filter();
      status.textContent = 'saved';
      setTimeout(() => { status.textContent = ''; }, 1500);
    });

  };

  const togglePanel = () => {
    const panel = document.querySelector('#hn-filter-panel');
    if (!panel) return;
    const visible = panel.style.display !== 'none';
    if (!visible) {
      const textarea = document.querySelector('#hn-filter-textarea');
      textarea.value = loadPatterns().join('\n');
    }
    panel.style.display = visible ? 'none' : '';
  };

  // init
  addFilterLink();
  filter();
})();
