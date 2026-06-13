/* Tiny bilingual (EN / 中文) helper.
   - Mark static text with  data-i18n="key"
   - Mark placeholders with data-i18n-ph="key"
   - Dynamic JS strings use t("key")
   - Dynamic renderers listen for the "langchange" window event. */

const I18N = {
  en: {
    // shared
    brand_portal: "D.STUDIO · Client Portal",
    brand_admin: "D.STUDIO · Admin",
    email: "Email",
    password: "Password",
    sign_in: "Sign in",
    magic_link: "Email me a login link instead",
    magic_sent: "Check your inbox for the login link ✉️",
    logout: "Log out",
    loading: "Loading…",
    back: "← Back",
    cancel: "Cancel",
    home: "← Back to site",

    // portal
    login_welcome: "Welcome back",
    login_sub: "Sign in to see your project progress.",
    my_projects: "My projects",
    no_projects: "No projects yet. We'll add yours here once we start.",
    progress: "Progress",
    files: "Files & previews",
    no_files: "No files shared yet.",
    download: "Download",
    comments: "Messages",
    no_comments: "No messages yet. Say hi 👋",
    write_message: "Write a message…",
    send: "Send",
    you: "You",
    studio: "D.STUDIO",
    updated: "Updated",

    // admin
    admin_title: "Projects",
    not_admin: "This account is not an admin. Ask the owner to grant access.",
    clients: "Clients",
    new_project: "New project",
    client: "Client",
    pick_client: "Select a client…",
    title: "Project title",
    service: "Service",
    stage: "Stage",
    create: "Create project",
    save: "Save",
    saved: "Saved ✓",
    upload: "Upload file",
    kind_preview: "Preview",
    kind_final: "Final",
    reply: "Reply…",
    delete: "Delete",
    confirm_delete: "Delete this?",
    no_clients: "No clients yet. Add one in Supabase → Authentication → Users.",
    refresh: "Refresh",
  },
  zh: {
    brand_portal: "D.STUDIO · 客户中心",
    brand_admin: "D.STUDIO · 管理后台",
    email: "邮箱",
    password: "密码",
    sign_in: "登录",
    magic_link: "改用邮箱链接登录",
    magic_sent: "登录链接已发到你的邮箱 ✉️",
    logout: "退出",
    loading: "加载中…",
    back: "← 返回",
    cancel: "取消",
    home: "← 回到官网",

    login_welcome: "欢迎回来",
    login_sub: "登录查看你的项目进度。",
    my_projects: "我的项目",
    no_projects: "暂时还没有项目。开始合作后会显示在这里。",
    progress: "进度",
    files: "文件与预览",
    no_files: "还没有分享文件。",
    download: "下载",
    comments: "留言",
    no_comments: "还没有留言，打个招呼吧 👋",
    write_message: "写点什么…",
    send: "发送",
    you: "你",
    studio: "D.STUDIO",
    updated: "更新于",

    admin_title: "项目",
    not_admin: "此账号不是管理员。请让站长授予权限。",
    clients: "客户",
    new_project: "新建项目",
    client: "客户",
    pick_client: "选择客户…",
    title: "项目名称",
    service: "服务类型",
    stage: "阶段",
    create: "创建项目",
    save: "保存",
    saved: "已保存 ✓",
    upload: "上传文件",
    kind_preview: "预览图",
    kind_final: "成品",
    reply: "回复…",
    delete: "删除",
    confirm_delete: "确定删除？",
    no_clients: "还没有客户。请在 Supabase → Authentication → Users 添加。",
    refresh: "刷新",
  },
};

function getLang() {
  return localStorage.getItem("dstudio_lang") || "en";
}
function setLang(l) {
  localStorage.setItem("dstudio_lang", l);
  applyI18n();
  // Tell dynamic renderers to rebuild their markup in the new language.
  window.dispatchEvent(new CustomEvent("langchange"));
}
function t(key) {
  const l = getLang();
  return (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
}
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
  });
  document.documentElement.lang = getLang() === "zh" ? "zh" : "en";
  const tg = document.getElementById("langToggle");
  if (tg) tg.textContent = getLang() === "en" ? "中文" : "EN";
}
function initLangToggle() {
  const tg = document.getElementById("langToggle");
  if (tg) tg.addEventListener("click", () => setLang(getLang() === "en" ? "zh" : "en"));
  applyI18n();
}
