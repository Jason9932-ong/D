/* ============================================================
   D.STUDIO AUTO — Portfolio 作品集
   ============================================================
   在下面的数组里加一条 { ... } 就多一张作品卡片，改完 push 即可。

   每一项的字段：
     title : 作品标题（必填）
     tag   : 分类标签，如 "Graphics" / "Reels" / "Landing Page"
     desc  : 一句话说明（可选）
     img   : 图片（可选）。两种写法：
             1) 把图片放进 lab/images/ 文件夹 → "images/xxx.jpg"
             2) 或直接贴外部图片链接 → "https://..."
             不填 img 会显示自动生成的渐变占位图。
     link  : 点击卡片打开的链接（可选），如 TikTok 视频、IG 帖子
     emoji : 占位图上显示的 emoji（可选，默认 🏎️）

   示例（复制一份改内容即可）：
     { title: "Honda Civic 促销贴文", tag: "Graphics", desc: "48小时交付",
       img: "images/civic.jpg", link: "https://instagram.com/p/xxx" },
   ============================================================ */

window.PORTFOLIO = [
  {
    title: "Showroom launch teaser",
    tag: "Reels",
    desc: "3-second hook, 15s vertical edit",
    emoji: "🎬",
  },
  {
    title: "Weekend sale price cards",
    tag: "Graphics",
    desc: "Listing set × 6, delivered in 48h",
    emoji: "🚗",
  },
  {
    title: "Test-drive booking page",
    tag: "Landing Page",
    desc: "WhatsApp CTA + tracking",
    emoji: "🏁",
  },
];
