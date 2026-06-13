/* D.STUDIO — client portal logic.
   Clients sign in and see only their own projects (enforced by RLS). */

const app = document.getElementById("app");
const logoutBtn = document.getElementById("logoutBtn");
let currentRender = () => {}; // re-invoked on language change

initLangToggle();
window.addEventListener("langchange", () => currentRender());
logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  location.reload();
});

// ---- boot ----
(async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  showLoggedIn(true);
  renderProjectList();
})();

function showLoggedIn(on) {
  logoutBtn.style.display = on ? "" : "none";
}

// ---------- LOGIN ----------
function renderLogin() {
  showLoggedIn(false);
  currentRender = renderLogin;
  app.innerHTML = `
    <div class="login-box card">
      <h1 data-i18n="login_welcome">Welcome back</h1>
      <p class="sub" data-i18n="login_sub">Sign in to see your project progress.</p>
      <form id="loginForm">
        <label class="field">
          <span data-i18n="email">Email</span>
          <input id="email" type="email" autocomplete="email" required>
        </label>
        <label class="field">
          <span data-i18n="password">Password</span>
          <input id="password" type="password" autocomplete="current-password">
        </label>
        <div class="err" id="loginErr"></div>
        <button class="btn full" type="submit" data-i18n="sign_in">Sign in</button>
      </form>
      <p class="center" style="margin-top:14px">
        <button class="link-btn" id="magicBtn" type="button" data-i18n="magic_link">Email me a login link instead</button>
      </p>
      <p class="center" style="margin-top:18px">
        <a href="../index.html" data-i18n="home">← Back to site</a>
      </p>
    </div>`;
  applyI18n();

  const err = document.getElementById("loginErr");
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { err.textContent = error.message; return; }
    location.reload();
  });

  document.getElementById("magicBtn").addEventListener("click", async () => {
    err.textContent = "";
    const email = document.getElementById("email").value.trim();
    if (!email) { err.textContent = t("email"); return; }
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.href },
    });
    if (error) { err.textContent = error.message; return; }
    err.style.color = "#1B9C73";
    err.textContent = t("magic_sent");
  });
}

// ---------- PROJECT LIST ----------
async function renderProjectList() {
  currentRender = renderProjectList;
  rtUnsubscribeAll();
  app.innerHTML = `<p class="muted center" data-i18n="loading">Loading…</p>`;
  applyI18n();

  const { data: projects, error } = await sb
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) { app.innerHTML = `<div class="card err">${escapeHtml(error.message)}</div>`; return; }

  const emoji = { graphics: "🎨", video: "🎬", landing: "🖥️" };
  let html = `<div class="section-h"><h2 data-i18n="my_projects">My projects</h2></div>`;

  if (!projects.length) {
    html += `<p class="empty" data-i18n="no_projects"></p>`;
  } else {
    html += `<div class="plist">` + projects.map((p) => {
      const done = p.stage >= 3;
      return `<button class="pitem" data-id="${p.id}">
        <span class="emoji">${emoji[p.service_type] || "📦"}</span>
        <span class="pmain">
          <span class="ptitle">${escapeHtml(p.title)}</span>
          <span class="psub">${serviceLabel(p.service_type)} · ${t("updated")} ${fmtDate(p.updated_at)}</span>
        </span>
        <span class="badge ${done ? "done" : ""}">${stageLabel(p.stage)}</span>
      </button>`;
    }).join("") + `</div>`;
  }
  app.innerHTML = html;
  applyI18n();
  app.querySelectorAll(".pitem").forEach((el) =>
    el.addEventListener("click", () => renderProject(el.dataset.id))
  );
}

// ---------- PROJECT DETAIL ----------
async function renderProject(id) {
  currentRender = () => renderProject(id);
  rtUnsubscribeAll();
  app.innerHTML = `<p class="muted center" data-i18n="loading">Loading…</p>`;
  applyI18n();

  const [{ data: p }, { data: files }, { data: comments }, { data: { user } }] =
    await Promise.all([
      sb.from("projects").select("*").eq("id", id).single(),
      sb.from("project_files").select("*").eq("project_id", id).order("created_at"),
      sb.from("comments_with_author").select("*").eq("project_id", id).order("created_at"),
      sb.auth.getUser(),
    ]);

  if (!p) { app.innerHTML = `<div class="card empty">—</div>`; return; }

  app.innerHTML = `
    <button class="link-btn" id="backBtn" data-i18n="back">← Back</button>
    <div class="section-h"><h2>${escapeHtml(p.title)}</h2>
      <span class="spacer"></span>
      <span class="badge ${p.stage >= 3 ? "done" : ""}">${serviceLabel(p.service_type)}</span>
    </div>

    <div class="card">
      <div class="section-h" style="margin-top:0"><h3 data-i18n="progress">Progress</h3></div>
      ${stepsHtml(p.stage)}
      ${p.notes ? `<p class="muted" style="margin-top:14px">${escapeHtml(p.notes)}</p>` : ""}
    </div>

    <div class="card">
      <div class="section-h" style="margin-top:0"><h3 data-i18n="files">Files & previews</h3></div>
      ${filesHtml(files || [])}
    </div>

    <div class="card">
      <div class="section-h" style="margin-top:0"><h3 data-i18n="comments">Messages</h3></div>
      <div class="clist" id="clist">${commentsHtml(comments || [], user.id)}</div>
      <div class="composer">
        <textarea id="cbody" rows="1" data-i18n-ph="write_message"></textarea>
        <button class="btn sm" id="csend" data-i18n="send">Send</button>
      </div>
      <div class="err" id="cerr"></div>
    </div>`;
  applyI18n();

  document.getElementById("backBtn").addEventListener("click", renderProjectList);
  await loadThumbs(files || []);

  const myId = user.id;
  document.getElementById("csend").addEventListener("click", async () => {
    const ta = document.getElementById("cbody");
    const body = ta.value.trim();
    const cerr = document.getElementById("cerr");
    cerr.textContent = "";
    if (!body) return;
    const { error } = await sb.from("comments").insert({
      project_id: id, author_id: myId, body,
    });
    if (error) { cerr.textContent = error.message; return; }
    ta.value = "";
    refreshThread(id, myId);
  });

  // Live updates: new messages from the studio appear without refreshing.
  rtSubscribe("thread", `project_id=eq.${id}`, () => refreshThread(id, myId));
}

async function refreshThread(id, myId) {
  const { data } = await sb.from("comments_with_author")
    .select("*").eq("project_id", id).order("created_at");
  const host = document.getElementById("clist");
  if (host) { host.innerHTML = commentsHtml(data || [], myId); applyI18n(); host.scrollTop = host.scrollHeight; }
}

function stepsHtml(stage) {
  return `<div class="steps">` + STAGES.map((s, i) => {
    const cls = i < stage ? "done" : i === stage ? "current" : "";
    return `<div class="step ${cls}">
      <div class="dot">${i < stage ? "✓" : i + 1}</div>
      <div class="lbl">${stageLabel(i)}</div>
    </div>`;
  }).join("") + `</div>`;
}

function filesHtml(files) {
  if (!files.length) return `<p class="empty" data-i18n="no_files"></p>`;
  return `<div class="fgrid">` + files.map((f) => `
    <div class="ftile" data-path="${escapeHtml(f.storage_path)}">
      <div class="thumb"><span class="ph">📄</span></div>
      <div class="finfo">
        <div class="fkind">${f.kind === "final" ? t("kind_final") : t("kind_preview")}</div>
        <div class="fname">${escapeHtml(f.file_name)}</div>
        <a class="fmeta dl" href="#" data-i18n="download">Download</a>
      </div>
    </div>`).join("") + `</div>`;
}

function commentsHtml(comments, myId) {
  if (!comments.length) return `<p class="empty" data-i18n="no_comments"></p>`;
  return comments.map((c) => {
    const mine = c.author_id === myId;
    const who = c.author_role === "admin" ? t("studio") : (mine ? t("you") : escapeHtml(c.author_name || ""));
    return `<div class="cmsg ${mine ? "me" : "them"}">
      <div class="who">${who}</div>
      <div>${escapeHtml(c.body)}</div>
      <div class="time">${fmtDate(c.created_at)}</div>
    </div>`;
  }).join("");
}

// Fetch signed URLs for each file → enable download + image thumbnails.
async function loadThumbs(files) {
  for (const f of files) {
    const { data } = await sb.storage.from(FILES_BUCKET).createSignedUrl(f.storage_path, 3600);
    if (!data) continue;
    const tile = app.querySelector(`.ftile[data-path="${cssEscape(f.storage_path)}"]`);
    if (!tile) continue;
    const dl = tile.querySelector(".dl");
    if (dl) { dl.href = data.signedUrl; dl.setAttribute("download", f.file_name); dl.target = "_blank"; }
    if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.file_name)) {
      tile.querySelector(".thumb").innerHTML = `<img src="${data.signedUrl}" alt="">`;
    }
  }
}
function cssEscape(s) { return s.replace(/["\\]/g, "\\$&"); }
