// ==UserScript==
// @name         scp wiki focus mode
// @namespace    https://github.com/shmup/userscripts
// @version      1.0.0
// @description  adds a distraction-free focus mode for scp wiki articles
// @author       shmup
// @match        https://scp-wiki.wikidot.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // create focus overlay
  const createFocusOverlay = () => {
    const overlay = document.createElement('div');
    overlay.id = 'scp-focus-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      color: #fff;
      z-index: 999999;
      overflow-y: auto;
      padding: 2rem;
      box-sizing: border-box;
      display: none;
    `;
    document.body.appendChild(overlay);
    return overlay;
  };

  // clone and style content for focus mode
  const enterFocusMode = () => {
    const content = document.querySelector('#page-content');
    if (!content) return;

    let overlay = document.querySelector('#scp-focus-overlay');
    if (!overlay) {
      overlay = createFocusOverlay();
    }

    // clone the content
    const clone = content.cloneNode(true);

    // preserve all inline styles and ensure light text on black
    clone.style.cssText = `
      max-width: 800px;
      margin: 0 auto;
      color: #fff;
    `;

    // ensure all text elements are light colored
    clone.querySelectorAll('*').forEach(el => {
      const computed = window.getComputedStyle(el);
      if (computed.color && computed.color !== 'rgb(255, 255, 255)') {
        el.style.color = '#fff';
      }
    });

    overlay.innerHTML = '';
    overlay.appendChild(clone);
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  };

  // exit focus mode
  const exitFocusMode = () => {
    const overlay = document.querySelector('#scp-focus-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  };

  // add focus link to navbar
  const addFocusLink = () => {
    const topBar = document.querySelector('#top-bar ul');
    if (!topBar) return;

    const focusLi = document.createElement('li');
    const focusLink = document.createElement('a');
    focusLink.href = 'javascript:;';
    focusLink.textContent = 'Focus';
    focusLink.addEventListener('click', (e) => {
      e.preventDefault();
      enterFocusMode();
    });

    focusLi.appendChild(focusLink);
    topBar.insertBefore(focusLi, topBar.firstChild);
  };

  // listen for escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      exitFocusMode();
    }
  });

  // initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addFocusLink);
  } else {
    addFocusLink();
  }
})();
