/* D.STUDIO — admin panel.
   Only profiles with role='admin' can write (enforced by RLS); the UI
   also checks the role and refuses to render management tools otherwise. */

const app = document.getElementById("app");
const logoutBtn = document.getElementById("logoutBtn");
let currentRender = () => {};
let CLIENTS = [];   // cached list of client profiles

initLangToggle();
window.addEventListener("langchange", () => currentRender());
logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  location.reload();
});

(async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  // confirm admin role
  const { data: prof } = await sb.from("profiles").select("role").eq("id", session.user.id).single();
  if (!prof || prof.role !== "admin") {
    logoutBtn.style.display = "";
    app.innerHTML = `<div class="card center"><p class="muted" data-i18n="not_admin"></p>
      <p style="margin-top:14px"><button class="btn soft sm" id="lo2" data-i18n="logout"></button></p></div>`;
    applyI18n();
    document.getElementById("lo2").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
    return;
  }
  logoutBtn.style.display = "";
  renderDashboard();
})();

// ---------- LOGIN ----------
function renderLogin() {
  currentRender = renderLogin;
  app.innerHTML = `
    <div class="login-box card">
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
    </div>`;
  applyI18n();
  const err = document.getElementById("loginErr");
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    });
    if (error) { err.textContent = error.message; return; }
    location.reload();
  });
}

// ---------- DASHBOARD ----------
async function renderDashboard() {
  currentRender = renderDashboard;
  app.innerHTML = `<p class="muted center" data-i18n="loading">Loading…</p>`;
  applyI18n();

  const [{ data: clients }, { data: projects }] = await Promise.all([
    sb.from("profiles").select("*").eq("role", "client").order("created_at"),
    sb.from("projects").select("*").order("updated_at", { ascending: false }),
  ]);
  CLIENTS = clients || [];

  const clientName = (id) => {
    const c = CLIENTS.find((x) => x.id === id);
    return c ? (c.full_name || c.email) : "—";
  };
  const emoji = { graphics: "🎨", video: "🎬", landing: "🖥️" };

  let html = `
    <div class="section-h"><h2 data-i18n="new_project">New project</h2></div>
    <div class="card">
      <div class="row">
        <label class="field"><span data-i18n="client">Client</span>
          <select id="npClient">
            <option value="" data-i18n="pick_client"></option>
            ${CLIENTS.map((c) => `<option value="${c.id}">${escapeHtml(c.full_name || c.email)}</option>`).join("")}
          </select>
        </label>
        <label class="field"><span data-i18n="service">Service</span>
          <select id="npService">
            ${SERVICE_TYPES.map((s) => `<option value="${s.key}">${getLang() === "zh" ? s.zh : s.en}</option>`).join("")}
          </select>
        </label>
      </div>
      <label class="field"><span data-i18n="title">Project title</span>
        <input id="npTitle" type="text"></label>
      <div class="err" id="npErr"></div>
      ${CLIENTS.length ? "" : `<p class="empty" data-i18n="no_clients"></p>`}
      <button class="btn" id="npCreate" data-i18n="create">Create project</button>
    </div>

    <div class="section-h"><h2 data-i18n="admin_title">Projects</h2>
      <span class="spacer"></span>
      <button class="btn soft sm" id="refreshBtn" data-i18n="refresh">Refresh</button>
    </div>`;

  if (!projects || !projects.length) {
    html += `<p class="empty">—</p>`;
  } else {
    html += `<div class="plist">` + projects.map((p) => `
      <button class="pitem" data-id="${p.id}">
        <span class="emoji">${emoji[p.service_type] || "📦"}</span>
        <span class="pmain">
          <span class="ptitle">${escapeHtml(p.title)}</span>
          <span class="psub">${escapeHtml(clientName(p.client_id))} · ${serviceLabel(p.service_type)}</span>
        </span>
        <span class="badge ${p.stage >= 3 ? "done" : ""}">${stageLabel(p.stage)}</span>
      </button>`).join("") + `</div>`;
  }

  app.innerHTML = html;
  applyI18n();

  document.getElementById("refreshBtn").addEventListener("click", renderDashboard);
  document.getElementById("npCreate").addEventListener("click", createProject);
  app.querySelectorAll(".pitem").forEach((el) =>
    el.addEventListener("click", () => renderProject(el.dataset.id)));
}

async function createProject() {
  const err = document.getElementById("npErr");
  err.textContent = "";
  const client_id = document.getElementById("npClient").value;
  const service_type = document.getElementById("npService").value;
  const title = document.getElementById("npTitle").value.trim();
  if (!client_id || !title) { err.textContent = "!"; return; }
  const { error } = await sb.from("projects").insert({ client_id, service_type, title, stage: 0 });
  if (error) { err.textContent = error.message; return; }
  renderDashboard();
}

// ---------- PROJECT DETAIL (admin) ----------
async function renderProject(id) {
  currentRender = () => renderProject(id);
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
    <div class="section-h"><h2>${escapeHtml(p.title)}</h2></div>

    <div class="card">
      <label class="field"><span data-i18n="stage">Stage</span>
        <select id="stageSel">
          ${STAGES.map((s, i) => `<option value="${i}" ${i === p.stage ? "selected" : ""}>${i + 1}. ${getLang() === "zh" ? s.zh : s.en}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>Notes</span>
        <textarea id="notes" rows="2">${escapeHtml(p.notes || "")}</textarea></label>
      <button class="btn sm" id="saveBtn" data-i18n="save">Save</button>
      <span class="ok" id="saveOk" style="display:none" data-i18n="saved"></span>
    </div>

    <div class="card">
      <div class="section-h" style="margin-top:0"><h3 data-i18n="files">Files & previews</h3></div>
      <div class="fgrid" id="fgrid">${filesHtml(files || [])}</div>
      <hr>
      <div class="row">
        <label class="field"><span data-i18n="upload">Upload file</span>
          <input id="fileInput" type="file"></label>
        <label class="field" style="max-width:160px"><span>&nbsp;</span>
          <select id="fileKind">
            <option value="preview" data-i18n="kind_preview"></option>
            <option value="final" data-i18n="kind_final"></option>
          </select></label>
      </div>
      <button class="btn sm" id="upBtn" data-i18n="upload">Upload file</button>
      <div class="err" id="upErr"></div>
    </div>

    <div class="card">
      <div class="section-h" style="margin-top:0"><h3 data-i18n="comments">Messages</h3></div>
      <div class="clist">${commentsHtml(comments || [], user.id)}</div>
      <div class="composer">
        <textarea id="cbody" rows="1" data-i18n-ph="reply"></textarea>
        <button class="btn sm" id="csend" data-i18n="send">Send</button>
      </div>
      <div class="err" id="cerr"></div>
    </div>`;
  applyI18n();
  await loadThumbs(files || [], /*admin*/ true, id);

  document.getElementById("backBtn").addEventListener("click", renderDashboard);

  document.getElementById("saveBtn").addEventListener("click", async () => {
    const stage = parseInt(document.getElementById("stageSel").value, 10);
    const notes = document.getElementById("notes").value;
    const { error } = await sb.from("projects").update({ stage, notes }).eq("id", id);
    const ok = document.getElementById("saveOk");
    if (error) { alert(error.message); return; }
    ok.style.display = ""; setTimeout(() => (ok.style.display = "none"), 1500);
  });

  document.getElementById("upBtn").addEventListener("click", async () => {
    const upErr = document.getElementById("upErr");
    upErr.textContent = "";
    const input = document.getElementById("fileInput");
    const file = input.files[0];
    if (!file) return;
    const kind = document.getElementById("fileKind").value;
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${id}/${Date.now()}_${safeName}`;
    const up = await sb.storage.from(FILES_BUCKET).upload(path, file);
    if (up.error) { upErr.textContent = up.error.message; return; }
    const { error } = await sb.from("project_files").insert({
      project_id: id, file_name: file.name, storage_path: path, kind,
    });
    if (error) { upErr.textContent = error.message; return; }
    renderProject(id);
  });

  document.getElementById("csend").addEventListener("click", async () => {
    const body = document.getElementById("cbody").value.trim();
    if (!body) return;
    const { error } = await sb.from("comments").insert({ project_id: id, author_id: user.id, body });
    if (error) { document.getElementById("cerr").textContent = error.message; return; }
    renderProject(id);
  });
}

// ---- shared render helpers (mirror portal.js) ----
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
      </div>
    </div>`).join("");
}

function commentsHtml(comments, myId) {
  if (!comments.length) return `<p class="empty" data-i18n="no_comments"></p>`;
  return comments.map((c) => {
    const mine = c.author_id === myId;
    const who = c.author_role === "admin" ? t("studio") : escapeHtml(c.author_name || "");
    return `<div class="cmsg ${mine ? "me" : "them"}">
      <div class="who">${who}</div><div>${escapeHtml(c.body)}</div>
      <div class="time">${fmtDate(c.created_at)}</div></div>`;
  }).join("");
}

async function loadThumbs(files, isAdmin, projectId) {
  for (const f of files) {
    const { data } = await sb.storage.from(FILES_BUCKET).createSignedUrl(f.storage_path, 3600);
    const tile = app.querySelector(`.ftile[data-path="${cssEscape(f.storage_path)}"]`);
    if (!tile) continue;
    if (data) {
      const dl = tile.querySelector(".dl");
      if (dl) { dl.href = data.signedUrl; dl.setAttribute("download", f.file_name); dl.target = "_blank"; }
      if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f.file_name)) {
        tile.querySelector(".thumb").innerHTML = `<img src="${data.signedUrl}" alt="">`;
      }
    }
    const del = tile.querySelector(".del");
    if (del && isAdmin) {
      del.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!confirm(t("confirm_delete"))) return;
        await sb.storage.from(FILES_BUCKET).remove([f.storage_path]);
        await sb.from("project_files").delete().eq("id", f.id);
        renderProject(projectId);
      });
    }
  }
}
function cssEscape(s) { return s.replace(/["\\]/g, "\\$&"); }
