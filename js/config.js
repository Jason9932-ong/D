/* D.STUDIO — shared Supabase config & constants.
   The anon key is safe to expose: all access is enforced by
   Row Level Security in the database. (Never put the service_role key here.) */

const SUPABASE_URL = "https://zuiwiahqdexvqcokknpn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aXdpYWhxZGV4dnFjb2trbnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDkxMTQsImV4cCI6MjA5NjkyNTExNH0.FEAohc1hgS9jjMgz7iu0KyzZrrQB6Z93oNBsd5dxQV8";

// Single shared client (window.supabase comes from the CDN UMD build).
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FILES_BUCKET = "project-files";

// The 4 stages of every project (index 0..3).
const STAGES = [
  { en: "Request received", zh: "收到需求" },
  { en: "Drafting",         zh: "草稿中"   },
  { en: "Revising",         zh: "修改中"   },
  { en: "Delivered",        zh: "完成交付" },
];

const SERVICE_TYPES = [
  { key: "graphics", en: "Promo Graphics",  zh: "宣传图"   },
  { key: "video",    en: "TikTok & Video",  zh: "短视频"   },
  { key: "landing",  en: "Landing Page",    zh: "落地页"   },
];

function stageLabel(i) {
  const s = STAGES[Math.max(0, Math.min(3, i))];
  return getLang() === "zh" ? s.zh : s.en;
}
function serviceLabel(key) {
  const s = SERVICE_TYPES.find((x) => x.key === key) || SERVICE_TYPES[0];
  return getLang() === "zh" ? s.zh : s.en;
}
function fmtDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(getLang() === "zh" ? "zh-SG" : "en-SG", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return ts; }
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---- Realtime helpers (live messages) ----
   Subscribes to INSERTs on public.comments. RLS still applies, so each user
   only receives changes for projects they're allowed to see. */
const _rtChannels = {};
function rtSubscribe(name, filter, cb) {
  rtUnsubscribe(name);
  const opts = { event: "INSERT", schema: "public", table: "comments" };
  if (filter) opts.filter = filter;
  _rtChannels[name] = sb.channel("rt-" + name).on("postgres_changes", opts, cb).subscribe();
}
function rtUnsubscribe(name) {
  if (_rtChannels[name]) { sb.removeChannel(_rtChannels[name]); delete _rtChannels[name]; }
}
function rtUnsubscribeAll() {
  Object.keys(_rtChannels).forEach(rtUnsubscribe);
}

/* Pass the logged-in user's token to Realtime so RLS-gated postgres_changes
   are actually delivered (a common reason live updates "don't work"). */
function rtAuth(token) {
  try { if (token) sb.realtime.setAuth(token); } catch (e) { /* ignore */ }
}

/* ---- Polling fallback ----
   Realtime may be disabled at the project level; polling guarantees the open
   thread / message list still updates on its own. Only one poll runs at a time. */
let _pollTimer = null;
function startPoll(fn, ms = 4000) { stopPoll(); _pollTimer = setInterval(fn, ms); }
function stopPoll() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

// Cheap change-signature for a comment list, to avoid needless re-renders.
function commentsSig(rows) {
  if (!rows || !rows.length) return "0";
  const last = rows[rows.length - 1];
  return rows.length + ":" + (last.id || last.created_at || "");
}
