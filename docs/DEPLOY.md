# 部署与外网访问方案

ChaosVault 是纯静态站（`index.html` + `css/` + `js/` + `content/`），无构建步骤。下文按「只读浏览」与「外网可写」两档说明。

## 0. 能力边界

| 模式 | 能做什么 | 不能做什么 |
|---|---|---|
| 本地 `start.bat` | 读写本机 `content/`（File System Access） | 外网默认访问不到 |
| 静态托管（只读） | 任何人打开网址浏览 Markdown | 改动不会写回仓库 |
| 静态 + 函数后端 | 外网提交后写 Git / 存储 | 需 Token、鉴权与防滥用 |

编辑闭环建议仍是：**本地改 md → `git push` → 托管自动更新**。

密钥：`content/01-技能/大模型/平台.keys.local.md` 已被 `.gitignore` 忽略，**不要**把 Key 写进会提交的 `平台.md`。

---

## 1. GitHub Pages（最省事）

1. 仓库 **Settings → Pages**
2. Source：`Deploy from a branch`；Branch：`main`，目录：`/ (root)`
3. 保存后等待 1～2 分钟
4. 访问：`https://sdzdrccc.github.io/chaos-vault/`

注意：

- 免费版 **Private 仓库不能用 Pages**，需 Public
- 相对路径 `./css`、`./content` 一般无需改配置
- 只读；线上改不了文件

---

## 2. Cloudflare Pages

### 控制台

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权并选择 `sdzdrccc/chaos-vault`
3. 构建设置：

   | 项 | 值 |
   |---|---|
   | Framework preset | None |
   | Build command | （空） |
   | Build output directory | `/` 或 `.` |

4. Deploy 后得到 `https://<项目名>.pages.dev`

### CLI

```powershell
npx wrangler login
cd F:\zxc\db\混沌宝库
npx wrangler pages deploy . --project-name=chaos-vault
```

`git push` 到 `main` 会自动重新部署。国内访问有时比 `github.io` 更稳。

---

## 3. Vercel

### 控制台

1. [vercel.com](https://vercel.com) 用 GitHub 登录
2. **Add New → Project** → 导入 `chaos-vault`
3. Framework Preset：**Other**；Build / Install / Output 均为空或 `/`、`.`
4. Deploy 得到 `https://<项目>.vercel.app`

### CLI

```powershell
cd F:\zxc\db\混沌宝库
npx vercel login
npx vercel --prod
```

Hobby 免费适合个人；非商用场景使用。

---

## 4. Netlify

### 控制台

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. 选 GitHub 仓库
3. Build command 空；Publish directory：`/` 或 `.`
4. Deploy 得到 `https://<站点>.netlify.app`

### CLI

```powershell
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --prod --dir .
```

免费额度相对更紧，个人只读站一般够用。

---

## 5. 方案对比（只读静态）

| | GitHub Pages | Cloudflare Pages | Vercel | Netlify |
|---|---|---|---|---|
| 构建配置 | 空 | 空 | 空 | 空 |
| 自动 push 部署 | 有 | 有 | 有 | 有 |
| 免费域名 | `*.github.io` | `*.pages.dev` | `*.vercel.app` | `*.netlify.app` |
| Private 仓库 | 免费版不行 | 可以 | 可以 | 可以 |
| 本项目推荐度 | ★★★ | ★★★ | ★★ | ★★ |

**建议**：先 GitHub Pages；国内不稳再换 Cloudflare Pages。

---

## 6. 若要外网可写（需后端）

GitHub Pages **没有**后端。可写方案：

### 路线 A：Pages/CF/Vercel + 函数代写 Git（仍用 Markdown）

```
浏览器 → Serverless Function → GitHub API → 更新 content/*.md → commit
```

| 平台 | 形态 | 免费额度（个人） |
|---|---|---|
| **Cloudflare Pages Functions / Workers** | 边缘函数 | 每天约 10 万请求级 |
| **Vercel Functions** | Node Serverless | Hobby 免费 |
| Netlify Functions | 同上 | 额度更紧 |

优点：数据仍是 md，与本地 Obsidian/编辑器一致。  
成本：Token 放服务端，必须加鉴权；并发写可能冲突。

### 路线 B：前端 + Supabase / Firebase

条目进数据库表，不再以「文件」为源。适合多端、登录；与「仓库即数据」分叉。

### 路线 C：常驻小服务（Railway / Render / Fly.io）

长期跑 Node 要注意免费层与休眠；**不建议**作为个人工作台首选。

### 上后端时的最小安全清单

1. Token / 密钥只放环境变量，绝不进前端仓库  
2. Function 校验密码、Cloudflare Access 或 share secret  
3. 只允许写 `content/**`，禁止任意路径  
4. Key 继续 gitignore；函数不要把密钥写进公开 md  

---

## 7. 推荐路径

| 阶段 | 做法 |
|---|---|
| 现在 | 本地 `start.bat` 编辑 + **GitHub Pages / Cloudflare Pages** 只读分享 |
| 要外网改 | Cloudflare Pages + Functions（或 Vercel Functions）写 GitHub |
| 要账号体系 | 再评估 Supabase，不必现在做 |

本仓库已按「md 即数据契约」组织，静态托管与后续函数后端可共用同一套 `content/` 路径。
