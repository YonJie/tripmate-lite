# TripMate Lite · AI 个人旅行助手

单用户本地旅行助手 MVP：管理行程、景点清单与费用，并用 DeepSeek（可 Mock 降级）生成结构化行程建议。无登录。

**技术栈**：Express 4 · PostgreSQL · Vue 3 · Vite · Element Plus · DeepSeek API

---

## 功能概览

| 模块 | 说明 |
|------|------|
| 行程管理 | 行程增删改查；名称、目的地、起止日期、预算、备注 |
| 景点/活动清单 | 挂在行程下；类型与「待去/已去」状态；支持 AI 建议一键批量导入 |
| 费用记录 | 新增/删除记账；按类别汇总；预算进度与超支提醒（无编辑接口，改费用=删旧建新） |
| AI 行程助手 | 调用 DeepSeek 生成日程与预算拆分；失败自动 Mock 降级；页面用徽章标明来源 |

> 截图占位（可选自行补充）：  
> `docs/screenshots/trips.png` · `docs/screenshots/trip-detail.png` · `docs/screenshots/assistant.png`

---

## 环境要求

| 软件 | 要求 | 本项目验证版本 |
|------|------|----------------|
| Node.js | >= 18 | 22.x |
| PostgreSQL | >= 14 | 18.x |
| npm | 随 Node 安装即可 | — |

另需本机可执行 `psql`（PostgreSQL 客户端，且已加入 PATH）。

---

## 快速开始

以下命令面向 **Windows PowerShell**。预计 5 分钟内可打开主界面。

### 1. 克隆仓库

```powershell
git clone https://github.com/YonJie/tripmate-lite.git
cd tripmate-lite
```

（若已配置 SSH，也可用：`git clone git@github.com:YonJie/tripmate-lite.git`）

### 2. 创建数据库

用超级用户登录 PostgreSQL（将密码换成你的；若本机信任连接可省略 `PGPASSWORD`）：

```powershell
$env:PGPASSWORD = "你的postgres密码"
psql -U postgres -c "CREATE DATABASE tripmate;"
psql -U postgres -c "CREATE DATABASE tripmate_test;"
```

`tripmate` 为开发库；`tripmate_test` 仅跑自动化测试时使用。

### 3. 配置环境变量

```powershell
Copy-Item .env.example .env
notepad .env
```

至少把 `DATABASE_URL` / `TEST_DATABASE_URL` 里的 `PASSWORD` 改成真实密码，例如：

```env
PORT=3000
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/tripmate
TEST_DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/tripmate_test
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT_MS=15000
```

`DEEPSEEK_API_KEY` 可先留空，不影响启动与主流程（详见下文）。

### 4. 安装依赖

在项目根目录：

```powershell
npm install
npm run install:all
```

（根目录 `npm install` 安装 `concurrently`；`install:all` 分别安装 `server/` 与 `client/` 依赖。）

### 5. 初始化数据库

仍建议设置 `PGPASSWORD`（与 `db:init` 所用的 `-U postgres` 一致）：

```powershell
$env:PGPASSWORD = "你的postgres密码"
npm run db:init
```

该命令会对 `tripmate` 执行 `server/db/schema.sql`（建表）与 `server/db/seed.sql`（写入示例行程/景点/费用）。可重复执行（会先删表再建）。

### 6. 启动

```powershell
npm run dev
```

会同时拉起后端（默认 `http://localhost:3000`）与前端（Vite，`http://localhost:5173`，`/api` 已代理到后端）。

### 7. 访问

浏览器打开：

**http://localhost:5173**

默认进入行程列表；可点进示例行程，或从顶栏进入「AI 助手」。

---

## 环境变量说明

根目录 `.env`（由 `.env.example` 复制；**不要提交 `.env`**，已在 `.gitignore` 中忽略）。

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `PORT` | 否 | `3000` | 后端监听端口 |
| `DATABASE_URL` | **是** | 无（示例见 `.env.example`） | 开发库连接串，指向 `tripmate` |
| `TEST_DATABASE_URL` | 跑测试时**是** | 无 | 测试库连接串，指向 `tripmate_test`；`npm test` 必填 |
| `DEEPSEEK_API_KEY` | 否 | 空 | DeepSeek API Key；留空则 AI 走 Mock |
| `DEEPSEEK_BASE_URL` | 否 | `https://api.deepseek.com` | DeepSeek API 根地址 |
| `DEEPSEEK_MODEL` | 否 | `deepseek-chat` | 模型名 |
| `DEEPSEEK_TIMEOUT_MS` | 否 | `15000` | 调用超时（毫秒） |

### 关于 `DEEPSEEK_API_KEY`

- **配置有效 Key**：AI 模块走真实调用，页面显示绿色「DeepSeek 真实调用」徽章。
- **留空、填错或网络失败**：系统自动降级到 Mock，页面显示橙色「Mock 降级」徽章，并展示降级原因（`fallbackReason`）。
- **无论是否配置，AI 功能页都能正常使用**，不会阻塞行程 / 景点 / 费用主流程。
- 密钥只存在于本地 `.env`，已被 `.gitignore` 忽略，**未提交到仓库**。

---

## 如何验证降级机制

1. 编辑 `.env`，将 Key 改成无效值，例如：

```env
DEEPSEEK_API_KEY=sk-invalid
```

2. 停掉当前 `npm run dev`（Ctrl+C），再执行一次 `npm run dev` 重启（后端需重新读取环境变量）。
3. 打开 http://localhost:5173/assistant ，填写目的地 / 天数 / 预算后生成建议。
4. 预期：HTTP 仍成功；页面出现橙色「Mock 降级」徽章及原因说明；日程 / 预算拆分 / tips 结构与真实调用一致，页面不白屏。

把 Key 改回有效值并重启后，徽章应变为绿色「DeepSeek 真实调用」。

---

## 运行测试

先确保已创建 `tripmate_test`，且 `.env` 中 `TEST_DATABASE_URL` 正确。在项目根目录：

```powershell
npm test
```

**预期**：4 个测试文件通过，例如：

```text
 ✓ tests/trips.test.js
 ✓ tests/expenses.test.js
 ✓ tests/spots.test.js
 ✓ tests/ai.test.js
 Test Files  4 passed
```

详细策略、用例表与手工验收清单见 [TESTING.md](./TESTING.md)。

---

## 项目结构

```text
tripmate-lite/
├── client/                 # Vue 3 前端（Vite + Element Plus）
│   └── src/
│       ├── api/            # 按模块封装的 HTTP 调用
│       ├── router/         # 路由（行程列表/详情、AI 助手）
│       ├── views/          # 页面（含 Assistant.vue）
│       └── utils/          # 展示用工具（金额格式化等）
├── server/                 # Express 后端（ESM + pg）
│   ├── db/                 # schema.sql / seed.sql
│   ├── src/
│   │   ├── ai/             # DeepSeek 调用与 Mock 降级
│   │   ├── controllers/    # 请求处理
│   │   ├── repositories/   # SQL 与 camelCase 映射
│   │   ├── routes/         # /api 路由
│   │   ├── db.js           # 连接池（含 NUMERIC→number）
│   │   └── index.js        # 入口
│   └── tests/              # Vitest + Supertest
├── docs/
│   ├── PRD.md              # 需求与规划
│   └── API-CONTRACT.md     # 接口契约（v1 已冻结）
├── .env.example            # 环境变量模板
├── AGENT_LOG.md            # 多 Agent 协作日志
├── TESTING.md              # 测试与验收说明
├── package.json            # 根脚本：dev / install:all / db:* / test
└── README.md               # 本文件
```

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](./docs/PRD.md) | 需求与规划、范围红线、验收标准 |
| [docs/API-CONTRACT.md](./docs/API-CONTRACT.md) | 接口契约（v1 冻结，前后端唯一事实来源） |
| [docs/06-演示脚本.md](./docs/06-演示脚本.md) | 5 分钟现场演示台本（主链路 / 检查清单 / 答问预案） |
| [TESTING.md](./TESTING.md) | 自动化测试说明与手工验收清单 |
| [AGENT_LOG.md](./AGENT_LOG.md) | 多 Agent 协同任务留痕 |

---

## 常见问题

### 1. `psql` 命令找不到

PostgreSQL 客户端未加入 PATH。把安装目录下的 `bin`（例如 `C:\Program Files\PostgreSQL\18\bin`）加入系统或当前会话 PATH：

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
psql --version
```

或改用「SQL Shell (psql)」图形安装自带的终端执行建库与脚本。

### 2. 数据库连接失败

对照检查：

- PostgreSQL 服务是否已启动；
- `.env` 里 `DATABASE_URL` 的用户名、密码、端口（默认 `5432`）、库名是否为 `tripmate`；
- 是否已执行 `CREATE DATABASE tripmate;`；
- 跑 `npm run db:init` 前是否设置了 `$env:PGPASSWORD`（与 `-U postgres` 密码一致）。

可用下面命令探测：

```powershell
$env:PGPASSWORD = "你的postgres密码"
psql -U postgres -d tripmate -c "SELECT 1;"
```

### 3. 5173 端口被占用

换端口启动前端（代理仍指向 `/api` → 3000）：

```powershell
npm --prefix client run dev -- --host --port 5174
```

然后访问 http://localhost:5174 。若后端 3000 也被占用，在 `.env` 把 `PORT` 改成空闲端口，并确认 `client/vite.config.js` 的 proxy target 与之一致后重启。

### 4. AI 一直显示 Mock 降级

按顺序排查：

1. `.env` 中 `DEEPSEEK_API_KEY` 是否为有效 Key（无多余空格、引号）；
2. 修改 `.env` 后是否**重启**了 `npm run dev`；
3. 本机能否访问 `DEEPSEEK_BASE_URL`（公司代理/防火墙可能导致超时，超时会降级）；
4. 页面上的橙色徽章旁会显示 `fallbackReason`，以该文案为准（缺 Key、超时、非 2xx、JSON/schema 校验失败等都会触发 Mock）。

**说明**：一直 Mock 不代表系统坏了——主流程仍可用；只有要演示「绿色真实调用」时才需要有效 Key 与可达网络。
