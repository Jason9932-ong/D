/* D.STUDIO LAB — starfield, scroll reveal, 3D tilt, counters, progress. */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll progress bar ---------- */
  const bar = document.getElementById("progress");
  function onScrollBar() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }
  addEventListener("scroll", onScrollBar, { passive: true });
  onScrollBar();

  /* ---------- starfield with scroll parallax ---------- */
  const canvas = document.getElementById("stars");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let W, H, stars = [];
    const DPR = Math.min(devicePixelRatio || 1, 2);
    function resize() {
      W = canvas.width = innerWidth * DPR;
      H = canvas.height = innerHeight * DPR;
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      const n = Math.min(160, Math.floor(innerWidth / 8));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.9 + 0.1,           // depth → size, speed, parallax
        tw: Math.random() * Math.PI * 2,
      }));
    }
    resize();
    addEventListener("resize", resize);
    let t = 0;
    (function draw() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      const scrollPar = (scrollY || 0) * DPR;
      for (const s of stars) {
        const y = (s.y - scrollPar * s.z * 0.35 % H + H) % H;
        const r = s.z * 1.8 * DPR;
        const a = 0.35 + 0.45 * Math.abs(Math.sin(t * (0.6 + s.z) + s.tw));
        ctx.beginPath();
        ctx.arc(s.x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.z > 0.66 ? "139,124,246" : s.z > 0.33 ? "76,201,240" : "237,235,255"},${a})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  }

  /* ---------- scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- 3D tilt (mouse; skipped on touch) ---------- */
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (fine && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const glow = card.querySelector(".tc-glow");
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${px * 14}deg) rotateX(${py * -14}deg) translateZ(6px)`;
        if (glow) { glow.style.left = (px + 0.5) * 100 + "%"; glow.style.top = (py + 0.5) * 100 + "%"; }
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- animated counters ---------- */
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target;
      const target = parseInt(el.dataset.count, 10) || 0;
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      if (reduced) { el.textContent = prefix + target + suffix; return; }
      const t0 = performance.now(), dur = 1400;
      (function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".n[data-count]").forEach((el) => cio.observe(el));

  /* ---------- hero cube: slow down spin while scrolling past hero ---------- */
  const cube = document.getElementById("cube");
  if (cube && !reduced) {
    addEventListener("scroll", () => {
      const y = Math.min(1, scrollY / innerHeight);
      cube.style.opacity = String(1 - y * 0.9);
    }, { passive: true });
  }
})();
