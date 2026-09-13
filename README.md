# ChaosVault（学习工作台）

以 **Markdown 为数据源** 的个人学习/消遣进度工作台。纯静态前端，无构建步骤，可进 Git，也可直接部署为网站。

## 快速开始

```bash
npm run dev
# 打开 http://127.0.0.1:5173/
```

或用任意静态服务器打开项目根目录（需能正确提供 `content/*.md`）。

首次访问会从 `content/` 读取 Markdown；之后改动保存在浏览器 localStorage。侧边栏可：

- **连接 content 文件夹**（Chrome/Edge + localhost）：读写本地 `content/`
- **从 Markdown 重载**
- **导出 JSON / content 捆绑**

## 目录结构

```
.
├── index.html          # 入口
├── css/main.css
├── js/
│   ├── main.js         # 启动与路由
│   ├── config.js       # 领域定义、工具
│   ├── state.js        # localStorage
│   ├── markdown.js     # MD 序列化 / 解析
│   ├── storage.js      # fetch content / File System Access
│   └── ui/             # 视图与弹层
├── content/            # ★ 数据源（进 Git / 可部署）
│   ├── 00-首页.md
│   ├── 03-收集箱.md
│   ├── 01-技能/<领域>/00-总览.md · 材料.md · 清单.md
│   └── 02-媒体/<类别>.md
└── scripts/serve.cjs   # 本地静态服务
```

## 技术方案

| 层 | 选型 | 说明 |
|---|---|---|
| 前端 | 原生 HTML/CSS/ES Modules | 无框架、无打包，降低维护成本 |
| 数据 | `content/**/*.md` | Git 可 diff；人可直接改；未来 SSG 可复用 |
| 本地读写 | fetch + File System Access API | 服务端读 md；授权后写回文件夹 |
| 会话缓存 | localStorage | 未连文件夹时的编辑暂存 |
| 部署 | 任意静态托管 | GitHub Pages / Cloudflare Pages / Nginx |

### 读写约定

- **读**：`loadFromContentTree()` 拉取 `content/` 下固定路径并解析。
- **写**：改动 → localStorage；若已连接文件夹则同步写回 md。
- **形态**：技能 = 总览/材料/清单三文件；媒体 = 单文件三段（在看/想看/看完）。

### 后续做成网站（待定）

静态部署即可上线（只读）。若要多端写入，可再加：

1. 对象存储 + 签名上传，或
2. 极简后端（Cloudflare Workers / Vercel Functions）维护同一套 md 结构。

当前仓库已按「md 即 API 契约」组织，不必重写数据层。

## 领域

- **技能**：大模型 · 日语 · 虚幻引擎 · 声乐 · 六爻 · 健身 · 素描
- **媒体**：动漫 · 书籍 · 电影 · 小说 · 音乐 · 游戏

游戏追踪页为 `content/02-媒体/游戏.md`（想玩 / 在玩 / 通关）；完整 3D 修仙游戏盘点见 `content/02-媒体/_修仙游戏目录.md`（下划线前缀 = 参考文件，写回时不覆盖）。

## 约定

- 日期 `YYYY-MM-DD`
- 勾选 `[x]` / `[ ]`
- 完成材料 ≠ 学会；清单勾选表示动作完成
