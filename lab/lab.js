/* D.STUDIO LAB — scroll-scrubbed animation engine.
   Every effect is tied to scroll position (plays forward on scroll down,
   backward on scroll up), smoothed with a small lerp. */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- scroll progress bar ---------- */
  const bar = document.getElementById("progress");

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
        x: Math.random() * W, y: Math.random() * H,
        z: Math.random() * 0.9 + 0.1, tw: Math.random() * Math.PI * 2,
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

  /* ---------- scrub engine ---------- */
  // Collect .fx elements; children of [data-stagger] get an incremental
  // progress offset so items in the same row arrive one after another.
  const fxEls = [];
  document.querySelectorAll("[data-stagger]").forEach((c) => {
    const step = parseFloat(c.dataset.stagger) || 0;
    [...c.children].forEach((ch, i) => { if (ch.classList.contains("fx")) ch._shift = i * step; });
  });
  document.querySelectorAll(".fx").forEach((el) => fxEls.push({ el, shift: el._shift || 0, cur: -1 }));
  const sections = [...document.querySelectorAll(".lsection")].map((el) => ({ el, cur: -1 }));

  const heroInner = document.getElementById("heroInner");
  const gridFloor = document.querySelector(".grid-floor");
  const cube = document.getElementById("cube");
  const railOrb = document.getElementById("railOrb");
  const marqueeTrack = document.querySelector(".marquee-track");

  const ease = (p) => 1 - Math.pow(1 - p, 2.2);      // ease-out on the scrub
  let ticking = false;

  function frame() {
    ticking = false;
    const vh = innerHeight;
    const h = document.documentElement;
    const maxScroll = h.scrollHeight - h.clientHeight;
    const total = maxScroll > 0 ? h.scrollTop / maxScroll : 0;

    // progress bar + rail orb follow overall scroll
    if (bar) bar.style.width = total * 100 + "%";
    if (railOrb) railOrb.style.top = total * (vh - 14) + 2 + "px";

    // per-element scrub: 0 when entering at the bottom → 1 around mid-viewport
    for (const f of fxEls) {
      const r = f.el.getBoundingClientRect();
      let p = (vh * 0.94 - r.top) / (vh * 0.5);
      p = clamp(p - f.shift, 0, 1);
      p = ease(p);
      if (Math.abs(p - f.cur) > 0.001) { f.cur = p; f.el.style.setProperty("--p", p.toFixed(3)); }
    }
    // per-section glow drift
    for (const s of sections) {
      const r = s.el.getBoundingClientRect();
      const p = ease(clamp((vh * 0.9 - r.top) / (vh * 0.8), 0, 1));
      if (Math.abs(p - s.cur) > 0.001) { s.cur = p; s.el.style.setProperty("--p", p.toFixed(3)); }
    }

    if (!reduced) {
      // hero exit transition: shrink, lift and fade as you scroll away
      const hp = clamp(scrollY / (vh * 0.85), 0, 1);
      if (heroInner) {
        heroInner.style.transform = `translateY(${hp * -80}px) scale(${1 - hp * 0.14})`;
        heroInner.style.opacity = String(1 - hp * 1.15);
      }
      if (gridFloor) gridFloor.style.transform =
        `perspective(600px) rotateX(62deg) translateY(${hp * 120}px)`;
      if (cube) cube.style.opacity = String(1 - hp * 0.9);

      // marquee drifts with the scrollbar on top of its own animation
      if (marqueeTrack) marqueeTrack.style.marginLeft = -(scrollY * 0.18 % 300) + "px";
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  frame();

  /* ---------- 3D tilt (mouse; skipped on touch) ---------- */
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (fine && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const glow = card.querySelector(".tc-glow");
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 14}deg) rotateX(${py * -14}deg) translateZ(6px)`;
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
})();
