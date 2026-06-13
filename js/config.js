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
