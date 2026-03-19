// ==UserScript==
// @name        Unread Mail - proton.me
// @namespace   github.com/shmup
// @match       https://mail.proton.me/u/0/*
// @grant       none
// @version     1.0
// @author      devilegg
// @description Adds a link to Unread Mail
// @run-at      document-end
// ==/UserScript==

// Resolves a promise after the selected element appears
function waitForElem(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

// Raw HTML for the new navigation link
const html = `<a
    class="navigation-link"
    title="Unread Mail"
    data-testid="navigation-link:Unread mail"
    data-shortcut-target="navigation-link unreadmail"
    href="/u/0/all-mail#filter=unread"
  >
    <span class="flex flex-nowrap w100 flex-align-items-center">
      <svg
        viewBox="0 0 16 16"
        class="icon-16p navigation-icon flex-item-noshrink mr0-5 flex-item-centered-vert"
        role="img"
        focusable="false"
      >
        <use xlink:href="#ic-envelopes"></use>
      </svg>
      <span class="flex-item-fluid max-w100 flex flex-align-items-center flex-nowrap">
        <span class="text-ellipsis">Unread mail</span>
      </span>
      <span class="flex flex-align-items-center">
        <span
          class="navigation-counter-item flex-item-noshrink"
          title=""
          data-testid="navigation-link:unread-count"
        >
        </span>
      </span>
    </span>
  </a>
  <div></div>`;

const createUnreadMail = () => {
  const li = document.createElement("li");
  li.classList.add("navigation-item");

  li.innerHTML = html;

  return li;
};

waitForElem(".navigation-list").then((visibleElem) => {
  const allMail = document.querySelector(
    "[data-testid='navigation-link:All mail']"
  ).parentElement;

  const unreadMail = createUnreadMail();

  visibleElem.insertBefore(unreadMail, allMail);
});
