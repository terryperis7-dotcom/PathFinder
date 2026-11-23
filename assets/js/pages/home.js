/* Public landing page: FAQ accordion, stat count-up, reveal-on-scroll. */
/* ---------- FAQ ---------- */
function initFaq() {
  $("#faqList").innerHTML = FAQS.map(
    ([q, a], i) =>
      `<div class="faq" data-faq="${i}"><button>${esc(q)}${ic("i-chev")}</button><div class="a">${esc(a)}</div></div>`
  ).join("");
  $("#faqList").addEventListener("click", (e) => {
    const f = e.target.closest("[data-faq]");
    if (f) f.classList.toggle("open");
  });
}

/* ---------- page boot ---------- */
initFaq();
reveal();
countUp();
