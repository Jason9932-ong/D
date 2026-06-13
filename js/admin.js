/* D.STUDIO — admin dashboard (Shopall-style).
   Sidebar + topbar shell with Dashboard / Projects / Clients / Messages views.
   All writes are admin-only (enforced by RLS); the UI also checks the role. */

const shell = document.getElementById("shell");
const loginScreen = document.getElementById("loginScreen");
const view = document.getElementById("view");
const crumbEl = document.getElementById("crumb");

let CLIENTS = [];
let PROJECTS = [];
let SEARCH = "";
let TAB = "all";                 // recent/all table filter by stage
let ME = null;
let currentView = renderDashboard;

const VIEWS = {
  dashboard: { fn: renderDashboard, i18n: "nav_dashboard" },
  projects:  { fn: renderProjects,  i18n: "nav_projects" },
  clients:   { fn: renderClients,   i18n: "nav_clients" },
  messages:  { fn: renderMessages,  i18n: "nav_messages" },
};

initLangToggle();
window.addEventListener("langchange", () => currentView());

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await sb.auth.signOut(); location.reload();
});
document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});
document.getElementById("search").addEventListener("input", (e) => {
  SEARCH = e.target.value.trim().toLowerCase();
  if (currentView === renderProjects || currentView === renderDashboard) currentView();
});

function switchView(name) {
  const v = VIEWS[name]; if (!v) return;
  TAB = "all";
  document.querySelectorAll(".nav-item[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name));
  crumbEl.setAttribute("data-i18n", v.i18n);
  crumbEl.textContent = t(v.i18n);
  currentView = v.fn;
  v.fn();
}

// ---------- boot ----------
(async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  const { data: prof } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (!prof || prof.role !== "admin") {
    shell.style.display = "none"; loginScreen.style.display = "flex";
    loginScreen.innerHTML = `<div class="card center" style="max-width:380px">
      <p class="muted" data-i18n="not_admin"></p>
      <p style="margin-top:14px"><button class="btn soft sm" id="lo2" data-i18n="logout"></button></p></div>`;
    applyI18n();
    document.getElementById("lo2").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
    return;
  }
  ME = { ...session.user, ...prof };
  loginScreen.style.display = "none"; shell.style.display = "flex";
  setUserChrome();
  await loadData();
  switchView("dashboard");
})();

function setUserChrome() {
  const name = ME.full_name || ME.email || "Admin";
  const ini = initials(name);
  document.getElementById("userName").textContent = name;
  document.getElementById("userMail").textContent = ME.email || "";
  document.getElementById("userAv").textContent = ini;
  document.getElementById("avTop").textContent = ini;
}

async function loadData() {
  const [{ data: clients }, { data: projects }] = await Promise.all([
    sb.from("profiles").select("*").eq("role", "client").order("created_at"),
    sb.from("projects").select("*").order("updated_at", { ascending: false }),
  ]);
  CLIENTS = clients || [];
  PROJECTS = projects || [];
  document.getElementById("cntProjects").textContent = PROJECTS.length;
  document.getElementById("cntClients").textContent = CLIENTS.length;
}

// ---------- LOGIN ----------
function renderLogin() {
  shell.style.display = "none"; loginScreen.style.display = "flex";
  currentView = renderLogin;
  loginScreen.innerHTML = `
    <div class="login-box card" style="margin:0">
      <h1 data-i18n="brand_admin">Admin</h1>
      <p class="sub" data-i18n="login_sub"></p>
      <form id="loginForm">
        <label class="field"><span data-i18n="email">Email</span>
          <input id="email" type="email" autocomplete="email" required></label>
        <label class="field"><span data-i18n="password">Password</span>
          <input id="password" type="password" autocomplete="current-password" required></label>
        <div class="err" id="loginErr"></div>
        <button class="btn full" type="submit" data-i18n="sign_in">Sign in</button>
      </form>
      <p class="center" style="margin-top:14px">
        <button class="link-btn" id="langLogin" type="button">中文 / EN</button></p>
    </div>`;
  applyI18n();
  document.getElementById("langLogin").addEventListener("click", () =>
    setLang(getLang() === "en" ? "zh" : "en"));
  const err = document.getElementById("loginErr");
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); err.textContent = "";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    });
    if (error) { err.textContent = error.message; return; }
    location.reload();
  });
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const byStage = [0, 1, 2, 3].map((s) => PROJECTS.filter((p) => p.stage === s).length);
  const active = byStage[1] + byStage[2];
  const recent = filterProjects(PROJECTS).slice(0, 6);

  view.innerHTML = `
    <div class="promo">
      <div class="ptxt">
        <span class="ptag">✦ <span data-i18n="promo_tag"></span></span>
        <h3 data-i18n="promo_title"></h3>
        <p data-i18n="promo_sub"></p>
      </div>
      <a class="btn" style="background:#fff;color:var(--lav-d);box-shadow:none" href="../portal/" target="_blank" data-i18n="open">Open</a>
    </div>

    <div class="page-head"><h1 data-i18n="overview">Overview</h1></div>

    <div class="stat-grid">
      ${statCard("💼", "#EDEAFB", "var(--lav-d)", t("stat_projects"), PROJECTS.length)}
      ${statCard("⏳", "#FFF4E0", "#D99500", t("stat_active"), active)}
      ${statCard("✅", "#E2F7EE", "#1B9C73", t("stat_delivered"), byStage[3])}
      ${statCard("👥", "#E6F1FF", "#2E86E0", t("stat_clients"), CLIENTS.length)}
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2 data-i18n="by_stage">Projects by stage</h2></div>
        ${barChart(byStage)}
      </div>
      <div class="panel">
        <div class="panel-head"><h2 data-i18n="recent_messages">Recent messages</h2></div>
        <div id="dashMsgs" class="muted" data-i18n="loading">Loading…</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2 data-i18n="recent_projects">Recent projects</h2>
        <span class="spacer"></span>
        <button class="btn soft sm" id="goProjects" data-i18n="all_projects">All projects</button></div>
      ${tabsHtml()}
      <div id="tableHost">${projectsTableHtml(recent)}</div>
    </div>`;
  applyI18n();
  wireTabs(() => filterProjects(PROJECTS).slice(0, 6));
  wireRows();
  document.getElementById("goProjects").addEventListener("click", () => switchView("projects"));
  loadDashMessages();
}

async function loadDashMessages() {
  const host = document.getElementById("dashMsgs"); if (!host) return;
  const { data } = await sb.from("comments_with_author")
    .select("*").order("created_at", { ascending: false }).limit(5);
  if (!data || !data.length) { host.innerHTML = `<p class="empty" data-i18n="no_messages"></p>`; applyI18n(); return; }
  const titleOf = (pid) => { const p = PROJECTS.find((x) => x.id === pid); return p ? p.title : "—"; };
  host.innerHTML = data.map((c) => {
    const who = c.author_role === "admin" ? t("studio") : (c.author_name || "");
    return `<div style="padding:10px 0;border-bottom:1px solid var(--line2)">
      <div style="font-size:13px"><b>${escapeHtml(who)}</b> <span class="muted">· ${escapeHtml(titleOf(c.project_id))}</span></div>
      <div class="muted" style="font-size:13px">${escapeHtml(c.body).slice(0, 90)}</div>
    </div>`;
  }).join("");
}

// ---------- PROJECTS ----------
function renderProjects() {
  const list = filterProjects(PROJECTS);
  view.innerHTML = `
    <div class="page-head"><h1 data-i18n="nav_projects">Projects</h1></div>

    <div class="panel">
      <div class="panel-head"><h2 data-i18n="new_project">New project</h2></div>
      <div class="row">
        <label class="field"><span data-i18n="client">Client</span>
          <select id="npClient"><option value="" data-i18n="pick_client"></option>
            ${CLIENTS.map((c) => `<option value="${c.id}">${escapeHtml(c.full_name || c.email)}</option>`).join("")}
          </select></label>
        <label class="field"><span data-i18n="service">Service</span>
          <select id="npService">${SERVICE_TYPES.map((s) => `<option value="${s.key}">${getLang() === "zh" ? s.zh : s.en}</option>`).join("")}</select></label>
      </div>
      <label class="field"><span data-i18n="title">Project title</span><input id="npTitle" type="text"></label>
      ${CLIENTS.length ? "" : `<p class="empty" data-i18n="no_clients"></p>`}
      <div class="err" id="npErr"></div>
      <button class="btn" id="npCreate" data-i18n="create">Create project</button>
    </div>

    <div class="panel">
      <div class="panel-head"><h2 data-i18n="all_projects">All projects</h2>
        <span class="spacer"></span>
        <button class="btn soft sm" id="refreshBtn" data-i18n="refresh">Refresh</button></div>
      ${tabsHtml()}
      <div id="tableHost">${projectsTableHtml(list)}</div>
    </div>`;
  applyI18n();
  wireTabs(() => filterProjects(PROJECTS));
  wireRows();
  document.getElementById("refreshBtn").addEventListener("click", async () => { await loadData(); renderProjects(); });
  document.getElementById("npCreate").addEventListener("click", createProject);
}

async function createProject() {
  const err = document.getElementById("npErr"); err.textContent = "";
  const client_id = document.getElementById("npClient").value;
  const service_type = document.getElementById("npService").value;
  const title = document.getElementById("npTitle").value.trim();
  if (!client_id || !title) { err.textContent = "!"; return; }
  const { error } = await sb.from("projects").insert({ client_id, service_type, title, stage: 0 });
  if (error) { err.textContent = error.message; return; }
  await loadData(); renderProjects();
}

// ---------- CLIENTS ----------
function renderClients() {
  view.innerHTML = `
    <div class="page-head"><h1 data-i18n="nav_clients">Clients</h1></div>
    <div class="panel">
      ${CLIENTS.length ? `<div class="cards-grid">` + CLIENTS.map((c) => {
        const n = c.full_name || c.email || "—";
        const count = PROJECTS.filter((p) => p.client_id === c.id).length;
        return `<div class="client-card">
          <span class="av">${initials(n)}</span>
          <div><div class="cname">${escapeHtml(n)}</div>
          <div class="cmail">${escapeHtml(c.email || "")}</div>
          <div class="cmail">${count} ${t("nav_projects").toLowerCase()}</div></div>
        </div>`;
      }).join("") + `</div>` : `<p class="empty" data-i18n="no_clients"></p>`}
    </div>`;
  applyI18n();
}

// ---------- MESSAGES ----------
async function renderMessages() {
  view.innerHTML = `<div class="page-head"><h1 data-i18n="nav_messages">Messages</h1></div>
    <div class="panel"><p class="muted" data-i18n="loading">Loading…</p></div>`;
  applyI18n();
  const { data } = await sb.from("comments_with_author")
    .select("*").order("created_at", { ascending: false }).limit(60);
  const titleOf = (pid) => { const p = PROJECTS.find((x) => x.id === pid); return p ? p.title : "—"; };
  const body = (!data || !data.length)
    ? `<p class="empty" data-i18n="no_messages"></p>`
    : data.map((c) => {
        const who = c.author_role === "admin" ? t("studio") : (c.author_name || "");
        return `<div class="msg-row" data-pid="${c.project_id}" style="padding:13px 0;border-bottom:1px solid var(--line2);cursor:pointer">
          <div style="font-size:13.5px"><b>${escapeHtml(who)}</b>
            <span class="muted">· ${escapeHtml(titleOf(c.project_id))} · ${fmtDate(c.created_at)}</span></div>
          <div class="muted" style="font-size:14px">${escapeHtml(c.body)}</div></div>`;
      }).join("");
  view.innerHTML = `<div class="page-head"><h1 data-i18n="nav_messages">Messages</h1></div>
    <div class="panel">${body}</div>`;
  applyI18n();
  view.querySelectorAll(".msg-row").forEach((r) =>
    r.addEventListener("click", () => openProject(r.dataset.pid)));
}

// ---------- PROJECT DETAIL ----------
async function openProject(id) {
  currentView = () => openProject(id);
  view.innerHTML = `<p class="muted" data-i18n="loading">Loading…</p>`; applyI18n();

  const [{ data: p }, { data: files }, { data: comments }] = await Promise.all([
    sb.from("projects").select("*").eq("id", id).single(),
    sb.from("project_files").select("*").eq("project_id", id).order("created_at"),
    sb.from("comments_with_author").select("*").eq("project_id", id).order("created_at"),
  ]);
  if (!p) { view.innerHTML = `<div class="panel empty">—</div>`; return; }
  const cname = (() => { const c = CLIENTS.find((x) => x.id === p.client_id); return c ? (c.full_name || c.email) : "—"; })();

  view.innerHTML = `
    <button class="backlink" id="backBtn" data-i18n="back">← Back</button>
    <div class="page-head"><h1>${escapeHtml(p.title)}</h1><span class="spacer"></span>
      ${stageBadge(p.stage)}</div>
    <p class="muted" style="margin:-8px 0 18px">${escapeHtml(cname)} · ${serviceLabel(p.service_type)}</p>

    <div class="grid-2">
      <div>
        <div class="panel">
          <div class="panel-head"><h2 data-i18n="stage">Stage</h2></div>
          <label class="field"><span data-i18n="stage">Stage</span>
            <select id="stageSel">${STAGES.map((s, i) => `<option value="${i}" ${i === p.stage ? "selected" : ""}>${i + 1}. ${getLang() === "zh" ? s.zh : s.en}</option>`).join("")}</select></label>
          <label class="field"><span>Notes</span><textarea id="notes" rows="3">${escapeHtml(p.notes || "")}</textarea></label>
          <button class="btn sm" id="saveBtn" data-i18n="save">Save</button>
          <span class="ok" id="saveOk" style="display:none" data-i18n="saved"></span>
        </div>

        <div class="panel">
          <div class="panel-head"><h2 data-i18n="files">Files & previews</h2></div>
          <div class="fgrid" id="fgrid">${filesHtml(files || [])}</div>
          <hr>
          <div class="row">
            <label class="field"><span data-i18n="upload">Upload file</span><input id="fileInput" type="file"></label>
            <label class="field" style="max-width:160px"><span>&nbsp;</span>
              <select id="fileKind"><option value="preview" data-i18n="kind_preview"></option>
                <option value="final" data-i18n="kind_final"></option></select></label>
          </div>
          <button class="btn sm" id="upBtn" data-i18n="upload">Upload</button>
          <div class="err" id="upErr"></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2 data-i18n="comments">Messages</h2></div>
        <div class="clist">${commentsHtml(comments || [], ME.id)}</div>
        <div class="composer">
          <textarea id="cbody" rows="1" data-i18n-ph="reply"></textarea>
          <button class="btn sm" id="csend" data-i18n="send">Send</button>
        </div>
        <div class="err" id="cerr"></div>
      </div>
    </div>`;
  applyI18n();
  await loadThumbs(files || [], id);

  document.getElementById("backBtn").addEventListener("click", () => switchView("projects"));
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const stage = parseInt(document.getElementById("stageSel").value, 10);
    const notes = document.getElementById("notes").value;
    const { error } = await sb.from("projects").update({ stage, notes }).eq("id", id);
    if (error) { alert(error.message); return; }
    const ok = document.getElementById("saveOk"); ok.style.display = "";
    setTimeout(() => (ok.style.display = "none"), 1500);
    await loadData();
  });
  document.getElementById("upBtn").addEventListener("click", async () => {
    const upErr = document.getElementById("upErr"); upErr.textContent = "";
    const file = document.getElementById("fileInput").files[0]; if (!file) return;
    const kind = document.getElementById("fileKind").value;
    const path = `${id}/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await sb.storage.from(FILES_BUCKET).upload(path, file);
    if (up.error) { upErr.textContent = up.error.message; return; }
    const { error } = await sb.from("project_files").insert({ project_id: id, file_name: file.name, storage_path: path, kind });
    if (error) { upErr.textContent = error.message; return; }
    openProject(id);
  });
  document.getElementById("csend").addEventListener("click", async () => {
    const body = document.getElementById("cbody").value.trim(); if (!body) return;
    const { error } = await sb.from("comments").insert({ project_id: id, author_id: ME.id, body });
    if (error) { document.getElementById("cerr").textContent = error.message; return; }
    openProject(id);
  });
}

// ---------- table / tabs / charts ----------
function filterProjects(list) {
  let out = list;
  if (TAB !== "all") out = out.filter((p) => String(p.stage) === TAB);
  if (SEARCH) {
    out = out.filter((p) => {
      const c = CLIENTS.find((x) => x.id === p.client_id);
      const hay = `${p.title} ${serviceLabel(p.service_type)} ${c ? (c.full_name || c.email) : ""}`.toLowerCase();
      return hay.includes(SEARCH);
    });
  }
  return out;
}

function tabsHtml() {
  const counts = [0, 1, 2, 3].map((s) => PROJECTS.filter((p) => p.stage === s).length);
  const tab = (key, label, cnt) =>
    `<button class="tab ${TAB === key ? "active" : ""}" data-tab="${key}">${label}${cnt != null ? ` <span class="cnt">${cnt}</span>` : ""}</button>`;
  return `<div class="tabs2">
    ${tab("all", t("tab_all"), PROJECTS.length)}
    ${tab("0", stageLabel(0), counts[0])}
    ${tab("1", stageLabel(1), counts[1])}
    ${tab("2", stageLabel(2), counts[2])}
    ${tab("3", stageLabel(3), counts[3])}
  </div>`;
}

function wireTabs(getList) {
  view.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
    TAB = b.dataset.tab;
    view.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
    document.getElementById("tableHost").innerHTML = projectsTableHtml(getList());
    applyI18n(); wireRows();
  }));
}

function projectsTableHtml(list) {
  const emoji = { graphics: "🎨", video: "🎬", landing: "🖥️" };
  if (!list.length) return `<p class="empty" style="padding:18px 4px">—</p>`;
  const rows = list.map((p) => {
    const c = CLIENTS.find((x) => x.id === p.client_id);
    const cn = c ? (c.full_name || c.email) : "—";
    return `<tr data-id="${p.id}">
      <td><div class="who"><span class="av">${initials(cn)}</span>${escapeHtml(cn)}</div></td>
      <td class="muted-cell">${fmtDate(p.created_at)}</td>
      <td>${emoji[p.service_type] || "📦"} ${serviceLabel(p.service_type)}</td>
      <td class="truncate">${escapeHtml(p.title)}</td>
      <td>${stageBadge(p.stage)}</td>
    </tr>`;
  }).join("");
  return `<table class="dtable"><thead><tr>
    <th data-i18n="col_client">Client</th><th data-i18n="col_date">Date</th>
    <th data-i18n="col_service">Service</th><th data-i18n="col_project">Project</th>
    <th data-i18n="col_stage">Stage</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function wireRows() {
  view.querySelectorAll(".dtable tr[data-id]").forEach((r) =>
    r.addEventListener("click", () => openProject(r.dataset.id)));
}

function barChart(byStage) {
  const max = Math.max(1, ...byStage);
  return `<div class="barchart">` + byStage.map((v, i) => `
    <div class="barwrap">
      <div class="barval">${v}</div>
      <div class="bartrack"><div class="barfill" style="height:${Math.round((v / max) * 100)}%"></div></div>
      <div class="barlbl">${stageLabel(i)}</div>
    </div>`).join("") + `</div>`;
}

function stageBadge(stage) {
  return `<span class="sbadge sb-${stage}">${stageLabel(stage)}</span>`;
}

function statCard(icon, bg, color, label, value) {
  return `<div class="stat-card">
    <div class="stat-top"><span class="stat-ic" style="background:${bg};color:${color}">${icon}</span>${escapeHtml(label)}</div>
    <div class="stat-value">${value}</div>
  </div>`;
}

// ---------- shared (files + comments, mirror portal) ----------
function filesHtml(files) {
  if (!files.length) return `<p class="empty" data-i18n="no_files"></p>`;
  return files.map((f) => `
    <div class="ftile" data-path="${escapeHtml(f.storage_path)}" data-fid="${f.id}">
      <div class="thumb"><span class="ph">📄</span></div>
      <div class="finfo">
        <div class="fkind">${f.kind === "final" ? t("kind_final") : t("kind_preview")}</div>
        <div class="fname">${escapeHtml(f.file_name)}</div>
        <a class="fmeta dl" href="#" data-i18n="download">Download</a>
        &nbsp;·&nbsp;<a class="fmeta del" href="#" style="color:#D6336C" data-i18n="delete">Delete</a>
      </div></div>`).join("");
}
function commentsHtml(comments, myId) {
  if (!comments.length) return `<p class="empty" data-i18n="no_comments"></p>`;
  return comments.map((c) => {
    const mine = c.author_id === myId;
    const who = c.author_role === "admin" ? t("studio") : escapeHtml(c.author_name || "");
    return `<div class="cmsg ${mine ? "me" : "them"}"><div class="who">${who}</div>
      <div>${escapeHtml(c.body)}</div><div class="time">${fmtDate(c.created_at)}</div></div>`;
  }).join("");
}
async function loadThumbs(files, projectId) {
  for (const f of files) {
    const { data } = await sb.storage.from(FILES_BUCKET).createSignedUrl(f.storage_path, 3600);
    const tile = view.querySelector(`.ftile[data-path="${cssEscape(f.storage_path)}"]`);
    if (!tile) continue;
    if (data) {
      const dl = tile.querySelector(".dl");
      if (dl) { dl.href = data.signedUrl; dl.setAttribute("download", f.file_name); dl.target = "_blank"; }
      if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.file_name))
        tile.querySelector(".thumb").innerHTML = `<img src="${data.signedUrl}" alt="">`;
    }
    const del = tile.querySelector(".del");
    if (del) del.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!confirm(t("confirm_delete"))) return;
      await sb.storage.from(FILES_BUCKET).remove([f.storage_path]);
      await sb.from("project_files").delete().eq("id", f.id);
      openProject(projectId);
    });
  }
}

// ---------- utils ----------
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return (parts.map((p) => p[0] || "").join("") || "?").toUpperCase();
}
function cssEscape(s) { return s.replace(/["\\]/g, "\\$&"); }
