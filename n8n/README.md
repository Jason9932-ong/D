# Meta Ads → 周 Leads 报表 → WhatsApp

每周一早上 09:00 (SGT) 自动拉上一个完整周 (Mon–Sun) 的 Meta 广告数据，
按 campaign 汇总 leads / 花费 / CPL 和周环比，存进 Google Sheet，
再把一条排版好的摘要发到 WhatsApp。

Workflow 文件：[`meta-leads-weekly-whatsapp.json`](./meta-leads-weekly-whatsapp.json)

---

## 分工：哪些已经做好了，哪些你要自己填

| | 内容 | 谁做 |
|---|---|---|
| ✅ | 9 个节点、连线、日期计算、Insights 取数、口径处理、周环比、消息排版、空数据兜底 | 已写好，导入即有 |
| ⚠️ | 3 个 **Credentials**（Meta / Google / Evolution） | **你**（密钥不能进 JSON） |
| ⚠️ | `Config` 节点里的 8 个值 | **你**（账户 ID、群 JID 这些只有你知道） |
| ⚠️ | Google Sheet 建表头 | **你**（复制粘贴一行） |

大约 15–20 分钟。

---

## 0. 前置条件

1. **一个 n8n 实例**
   - n8n Cloud：最省事，但注意它对 Code 节点访问 `$env` 有限制（本 workflow 不依赖 `$env`，所以没问题）。
   - 自托管 Docker：`docker run -d -p 5678:5678 -e GENERIC_TIMEZONE=Asia/Singapore -e TZ=Asia/Singapore -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n`

2. **一个跑着的 Evolution API 实例**，并且已经用**备用号**扫码登录。
   > 再强调一次：别用主号，也别用公司主号。非官方协议被封是**不可申诉**的。

3. **Meta 广告账户的 `ads_read` 权限**。

---

## 1. 导入 workflow

n8n 里 → `Workflows` → `Import from File...` → 选 `meta-leads-weekly-whatsapp.json`。
（或者直接把 JSON 全文复制，在画布上 `Ctrl+V`。）

导入后节点会显示红色错误标记 —— 正常，凭证还没配。

---

## 2. 建 3 个 Credentials

### 2.1 Meta（`Facebook Graph API` 类型）

1. 去 [Business Manager → 系统用户](https://business.facebook.com/settings/system-users)
2. 新建一个 System User → **Generate New Token**
3. App 选你的、权限勾 **`ads_read`**（只读就够，不要给 `ads_management`）
4. 复制 token → n8n `Credentials → New → Facebook Graph API` → 粘贴 → 命名 `Meta Ads (read)`
5. 回到 `Insights - Last Week` 和 `Insights - Previous Week` 两个节点，各自选上这个凭证

> System User token 默认长期有效，不像个人 token 60 天过期 —— 这是必须走 System User 的原因。

### 2.2 Google Sheets（`Google Sheets OAuth2 API` 类型）

按 n8n 官方向导走一遍即可（要在 Google Cloud Console 建 OAuth Client，
回调地址 n8n 界面上会直接给你）。配好后在 `Archive to Google Sheet` 节点选上。

### 2.3 Evolution API（`Header Auth` 类型）

`Credentials → New → Header Auth`：

| 字段 | 值 |
|---|---|
| Name | `apikey` |
| Value | 你的 Evolution `AUTHENTICATION_API_KEY` |

命名 `Evolution API`，在 `Send to WhatsApp` 节点选上。

---

## 3. 填 `Config` 节点

打开 `Config` 节点，把 8 个值换掉：

| 字段 | 从哪拿 |
|---|---|
| `adAccountId` | Ads Manager 左上角账户切换器里的数字，**要带 `act_` 前缀**，例如 `act_1234567890` |
| `graphVersion` | 见下方「常见坑」第 2 条，先用 `v23.0` 试 |
| `currency` | `SGD` |
| `sheetId` | Google Sheet URL 里 `/d/` 和 `/edit` 中间那一长串 |
| `sheetTab` | 工作表标签名，默认 `Weekly` |
| `evolutionBaseUrl` | 你的 Evolution 地址，例如 `https://evo.yourdomain.com`（**结尾不要带 `/`**） |
| `evolutionInstance` | 你在 Evolution 里建的 instance 名 |
| `waRecipient` | 群 JID 或个人号，见下 |
| `reportLink` | 可选。填了会在消息末尾附上 Looker Studio 链接；不要就留空 |

### 怎么拿群 JID

群的 JID 长这样：`120363043211234567@g.us`。用 Evolution 自己查：

```bash
curl -s "https://evo.yourdomain.com/group/fetchAllGroups/YOUR_INSTANCE?getParticipants=false" \
  -H "apikey: YOUR_API_KEY" | python3 -m json.tool
```

在返回里找你那个群的 `id` 字段。

发给个人的话，直接填国际格式号码不带 `+`，例如 `6591234567`。

---

## 4. 建 Google Sheet 表头

新建一个 Sheet，标签命名 `Weekly`，**第一行**粘贴这 20 个表头
（节点用的是 `autoMapInputData`，**字段名必须一字不差**）：

```
weekStart	weekEnd	campaignId	campaignName	spend	currency	impressions	clicks	ctr	leads	formLeads	pixelLeads	ctwaChats	cpl	prevLeads	leadsDelta	prevCpl	cplDeltaPct	leadsAggCheck	generatedAt
```

（这一行是 Tab 分隔的，直接复制粘进 A1 会自动分列。）

---

## 5. 测一次

先别激活。点 `Execute Workflow` 手动跑一次：

1. 看 `Insights - Last Week` 输出里有没有 `data` 数组 → 没有的话是 token 或账户 ID 问题
2. 看 `Aggregate by Campaign` 的行数和数字，跟 Ads Manager 同一时间段对一下
3. 看 `Build WhatsApp Message` 的 `message` 字段排版
4. 确认没问题了，再让它真的发出去

跑通后右上角切 **Active**。

---

## 6. 常见坑

**1. Evolution API v1 和 v2 的 body 结构不一样。**
本 workflow 用的是 **v2** 的扁平结构：

```json
{ "number": "...", "text": "..." }
```

如果你的实例是 v1，会报 400。改 `Send to WhatsApp` 节点的 JSON Body 为：

```
={{ JSON.stringify({ number: $('Config').first().json.waRecipient, textMessage: { text: $json.message } }) }}
```

**2. Graph API 版本会过期。**
Meta 大约每季度发一个新版，旧版约两年后停用。如果 Insights 节点报
`(#2635) You are calling a deprecated version`，去
[Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog)
查当前版本，改 `Config` 里的 `graphVersion` 一个值就行。

**3. leads 数字对不上 Ads Manager。**
按优先级排查：
- 归因窗口 —— 节点已带 `use_unified_attribution_setting=true`，会跟你账户设置一致
- 时区 —— Meta Insights 按**广告账户时区**切日，如果账户不是 SGT，边界那天会差
- 口径 —— 见下一条

**4. 不要把 `lead` 和另外两个 action type 相加。**
`onsite_conversion.lead_grouped`（站内表单）和 `offsite_conversion.fb_pixel_lead`（网站表单）
是两个来源，可以相加；而 `lead` 是 Meta 的聚合口径，**可能已经包含前两者**。
代码里把它单独存成 `leadsAggCheck` 只做对账，不参与求和。
Sheet 里如果发现 `leads ≠ leadsAggCheck`，说明你的账户口径需要单独确认一次。

**5. Click-to-WhatsApp 的对话数不是 lead。**
`ctwaChats` 单独一列。SG 车市很多 campaign 跑 CTWA，混进 leads 里会虚高。

**6. Meta 的 lead 记录 90 天后过期。**
这个 workflow 存的是**聚合数字**，不受影响。但如果你还要留 lead 明细（姓名/电话），
必须另外做实时同步，别指望事后补导。

**7. 超过 200 个 campaign 会漏数据。**
`limit=200` 且没做分页。RMG 规模应该远够，真到了就在 HTTP 节点开 Pagination。

**8. 时区。**
Workflow 已设 `Asia/Singapore`。自托管的话 n8n 容器也要设 `GENERIC_TIMEZONE=Asia/Singapore`，
否则 cron 会按 UTC 跑（差 8 小时，周一 09:00 会变成周一 17:00）。

---

## 7. 想换个发送渠道？

只需要替换最后一个节点，前面 8 个节点原封不动：

| 渠道 | 怎么改 | 封号风险 |
|---|---|---|
| **Telegram** | 换成 `Telegram` 节点，`Send Message`，填 bot token + chat ID | 零 |
| **Email** | 换成 `Gmail` / `Send Email` 节点 | 零 |
| **Slack** | 换成 `Slack` 节点 | 零 |
| **零风险 WhatsApp** | 换成 Telegram 节点发给你自己，你手动复制粘贴进群 | 零 |

最后一行不是玩笑话 —— 一周一次的动作，自动化省下的是 20 秒，
换来的是一个不可申诉的封号风险敞口。值不值得，你自己权衡。
