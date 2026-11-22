/* Progressive reveal + stat count-up, shared by public and app pages. */
let io = null;
function reveal() {
  if (!("IntersectionObserver" in window)) {
    $$(".rv").forEach((el) => el.classList.add("in"));
    return;
  }
  io =
    io ||
    new IntersectionObserver(
      (es) =>
        es.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.1 }
    );
  $$(".rv:not(.in)").forEach((el) => io.observe(el));
}

function countUp() {
  $$("[data-cu]").forEach((el) => {
    const target = +el.dataset.cu;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
