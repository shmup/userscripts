// ==UserScript==
// @name         hn keyword filter
// @namespace    https://github.com/shmup/userscripts
// @version      1.0.0
// @description  filters hacker news posts by title keywords and renumbers the list
// @author       shmup
// @match        https://news.ycombinator.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // standalone word match, case-insensitive
  const blocked = /\b(ai|llm)\b/i;

  const filter = () => {
    const rows = document.querySelectorAll('tr.athing');
    let rank = 0;

    rows.forEach(row => {
      const titleEl = row.querySelector('.titleline > a');
      if (!titleEl) return;

      // the subtext/spacer rows immediately follow each athing row
      const subtext = row.nextElementSibling;
      const spacer = subtext?.nextElementSibling;

      if (blocked.test(titleEl.textContent)) {
        row.style.display = 'none';
        if (subtext) subtext.style.display = 'none';
        if (spacer?.classList.contains('spacer')) spacer.style.display = 'none';
      } else {
        rank++;
        const rankEl = row.querySelector('.rank');
        if (rankEl) rankEl.textContent = rank + '.';
      }
    });
  };

  filter();
})();
