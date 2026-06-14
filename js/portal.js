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

// When the user clicks a password-reset email link, Supabase signs them in with
// a recovery session and fires this event — show the "set new password" form.
let recovering = false;
sb.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") { recovering = true; renderResetPassword(); }
});

// ---- boot ----
(async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (recovering) return;            // recovery flow has taken over
  if (!session) return renderLogin();
  rtAuth(session.access_token);
  showLoggedIn(true);
  renderProjectList();
})();

function showLoggedIn(on) {
  logoutBtn.style.display = on ? "" : "none";
}

// ---------- LOGIN ----------
function renderLogin() {
  showLoggedIn(false);
  rtUnsubscribeAll(); stopPoll();
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
      <p class="center" style="margin-top:8px">
        <button class="link-btn" id="forgotBtn" type="button" data-i18n="forgot_password">Forgot password?</button>
      </p>
      <p class="center" style="margin-top:18px">
        <a href="../index.html" data-i18n="home">← Back to site</a>
      </p>
    </div>`;
  applyI18n();

  document.getElementById("forgotBtn").addEventListener("click", async () => {
    const errEl = document.getElementById("loginErr");
    errEl.style.color = ""; errEl.textContent = "";
    const email = document.getElementById("email").value.trim();
    if (!email) { errEl.textContent = t("enter_email_first"); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
    if (error) { errEl.textContent = error.message; return; }
    errEl.style.color = "#1B9C73"; errEl.textContent = t("reset_sent");
  });

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

// ---------- RESET PASSWORD (after clicking the email link) ----------
function renderResetPassword() {
  showLoggedIn(false);
  rtUnsubscribeAll(); stopPoll();
  currentRender = renderResetPassword;
  app.innerHTML = `
    <div class="login-box card">
      <h1 data-i18n="set_new_password">Set a new password</h1>
      <form id="resetForm" style="margin-top:18px">
        <label class="field">
          <span data-i18n="new_password">New password</span>
          <input id="newPass" type="password" autocomplete="new-password" required>
        </label>
        <div class="err" id="resetErr"></div>
        <button class="btn full" type="submit" data-i18n="save_password">Save password</button>
      </form>
    </div>`;
  applyI18n();
  const err = document.getElementById("resetErr");
  document.getElementById("resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    err.style.color = ""; err.textContent = "";
    const password = document.getElementById("newPass").value;
    if (password.length < 6) { err.textContent = t("pass_short"); return; }
    const { error } = await sb.auth.updateUser({ password });
    if (error) { err.textContent = error.message; return; }
    recovering = false;
    err.style.color = "#1B9C73"; err.textContent = t("password_updated");
    showLoggedIn(true);
    setTimeout(renderProjectList, 900);
  });
}

// ---------- PROJECT LIST ----------
async function renderProjectList() {
  currentRender = renderProjectList;
  rtUnsubscribeAll(); stopPoll();
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
      <div class="clegend"><span><i class="i-studio"></i> D.STUDIO</span><span><i class="i-client"></i> <span data-i18n="client_one">Client</span></span></div>
      <div class="clist" id="clist">${commentsHtml(comments || [], user.id)}</div>
      <div class="composer">
        <textarea id="cbody" rows="1" data-i18n-ph="write_message"></textarea>
        <button class="btn sm" id="csend" data-i18n="send">Send</button>
      </div>
      <div class="err" id="cerr"></div>
    </div>`;
  applyI18n();
  document.getElementById("clist").dataset.sig = commentsSig(comments || []);

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

  // Live updates: realtime push + polling fallback.
  rtSubscribe("thread", `project_id=eq.${id}`, () => refreshThread(id, myId));
  startPoll(() => refreshThread(id, myId), 4000);
}

async function refreshThread(id, myId) {
  const host = document.getElementById("clist"); if (!host) return;
  const { data } = await sb.from("comments_with_author")
    .select("*").eq("project_id", id).order("created_at");
  const sig = commentsSig(data); if (host.dataset.sig === sig) return; host.dataset.sig = sig;
  host.innerHTML = commentsHtml(data || [], myId); applyI18n(); host.scrollTop = host.scrollHeight;
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
    const isStudio = c.author_role === "admin";
    const who = isStudio ? t("studio") : (escapeHtml(c.author_name || "") || t("client_one"));
    return `<div class="cmsg ${mine ? "right" : "left"} ${isStudio ? "studio" : "client"}">
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
