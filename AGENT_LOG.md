# Agent 协作日志

本项目采用「一人 + 多 Agent」协同开发。下文按时间顺序记录每个 Agent 角色的任务、输入指令摘要、产出与验收结果。

---

<!-- 记录格式示例（复制后填写）：

### [角色代号] 任务标题
- **时间**：HH:MM
- **Prompt 摘要**：
- **产出文件**：
- **关键决策**：
- **自检结果**：
- **交接条件**：

-->

### [P] 撰写 PRD.md（需求与规划文档）
- **时间**：16:36
- **Prompt 摘要**：作为规划 Agent 撰写提交项目经理评审的 `docs/PRD.md`；覆盖背景目标、四模块范围与红线、三实体字段硬约束、依赖与 P0/P1/P2、180 分钟时间盒、五 Agent 协同与目录边界、可勾选验收标准、风险应对；完成后追加本日志。
- **产出文件**：`docs/PRD.md`
- **关键决策**：
  - 费用 MVP 明确不做编辑接口（删旧建新），写入范围边界防误判缺功能
  - 采用「阶段性并行 + 契约门禁」；A 只做后端 AI，`Assistant.vue` 归 F；Q 仅脚手架最小改动；B 阶段 5 可改根 `package.json` 的 db:* scripts
  - P0 不可砍；P1 可砍「导入」保生成+Mock 标识；P2 可全砍
  - 实体字段按指令硬约束未改动；级联删除 trip → spots/expenses
- **自检结果**：八章齐全；四模块表格与范围红线含「3 小时放弃理由」；验收条含行程/景点/费用/AI（含 DeepSeek 与 Mock 标识）；风险 ≥4 条且含 NUMERIC 与契约不一致；未改任何业务代码
- **交接条件**：项目经理评审通过后，P 下一步输出并冻结 `docs/API-CONTRACT.md`，再通知 B/F/A 按目录隔离开工

### [B] 创建数据库层（schema + seed + db 脚本）
- **时间**：16:45
- **Prompt 摘要**：按 API-CONTRACT / PRD 实体定义创建 `server/db/schema.sql` 与 `seed.sql`；更新根 `package.json` 的 `db:init`/`db:reset`；确认 `db.js` 已注册 NUMERIC→number 解析。
- **产出文件**：`server/db/schema.sql`、`server/db/seed.sql`、根 `package.json`（仅 scripts）、`AGENT_LOG.md`
- **关键决策**：
  - 三表字段/CHECK/级联与契约及任务说明逐字对齐；`estimated_cost` DEFAULT 0 对齐「未传=0」
  - schema 开头 `DROP ... CASCADE` 保证可重复执行；`spots.trip_id` / `expenses.trip_id` 建索引；表与关键列加 COMMENT
  - seed 用子查询取最新成都行程 id，避免硬编码 SERIAL，保证 schema 后可独立执行
  - `db:init`/`db:reset` 均用 `psql -U postgres -d tripmate` 依次执行 schema+seed；密码依赖 `PGPASSWORD` 或 pgpass
  - `server/src/db.js` 已有 OID 1700 `parseFloat` 解析器与 JSDoc，未改动
- **自检结果**：表结构与 PRD 3.1–3.3 / 契约枚举一致；仅改允许的 scripts；未改 `client/`、未改 dependencies、未创建 `.env`
- **交接条件**：本地需已建库 `tripmate` 且 `psql` 可用；执行 `npm run db:init`（或 `db:reset`）后即可进入 trips/spots/expenses API 实现

### [B] 修复 db:init Windows 中文编码错误
- **时间**：16:48
- **Prompt 摘要**：`npm run db:init` 报 GBK→UTF8 字符无对应值；修复 schema/seed 与 db 脚本编码。
- **产出文件**：`server/db/schema.sql`、`server/db/seed.sql`、根 `package.json`（仅 db:* scripts）、`AGENT_LOG.md`
- **关键决策**：
  - SQL 文件开头增加 `SET client_encoding TO 'UTF8';`
  - `db:init`/`db:reset` 增加 `PGCLIENTENCODING=UTF8`（cmd `set`），并加 `-v ON_ERROR_STOP=1` 避免半成功继续执行
- **自检结果**：根因与终端 L81–L102 编码错误对齐；本环境 psql 可能因缺密码挂起未复跑成功，需用户本机再执行 `npm run db:init`
- **交接条件**：用户在项目根目录重跑 `npm run db:init`，应无 GBK 编码报错；成功后三表+种子数据就绪

### [P] 撰写并冻结 API-CONTRACT.md（v1）
- **时间**：16:37
- **Prompt 摘要**：撰写前后端唯一事实来源 `docs/API-CONTRACT.md`；覆盖全局约定与全量接口；日志须明确「契约已冻结，版本 v1」。
- **产出文件**：`docs/API-CONTRACT.md`
- **关键决策**：
  - **契约已冻结，版本 v1**
  - 成功响应无 envelope；失败统一 `{ error: { code, message } }`
  - AI `suggest`：请求体优先于 tripId 补齐；模型失败一律 200 + Mock；tips 至少 3 条
- **自检结果**：接口齐全；示例为合法 JSON；未改业务代码
- **交接条件**：B / F / A 可按目录隔离并行开发

### [P] 契约 v1 正式冻结确认
- **时间**：16:39
- **Prompt 摘要**：契约核对通过；正式冻结 `docs/API-CONTRACT.md` 为 v1；顶部加冻结声明；后续变更须明确指令并记入变更记录表。
- **产出文件**：`docs/API-CONTRACT.md`（顶部冻结声明 + §8 时间落定）
- **关键决策**：
  - **契约 v1 冻结**（冻结时间 2026-08-10 16:39 UTC+8）
  - **后端 Agent（B）与前端 Agent（F）可以开始并行开发**
  - 后续契约变更必须由负责人明确指令，由 P 更新并记入变更记录与本日志
- **自检结果**：顶部含冻结声明与时间；未改业务代码、未改接口正文
- **交接条件**：B / F 按契约并行开发；有歧义回 P

### [B] 实现行程模块完整后端 API
- **时间**：16:50
- **Prompt 摘要**：按 API-CONTRACT 实现 trips 五接口；分层 tripRepo / tripController / routes/trips，并挂载到 index.js。
- **产出文件**：`server/src/repositories/tripRepo.js`、`server/src/controllers/tripController.js`、`server/src/routes/trips.js`、`server/src/index.js`、`AGENT_LOG.md`
- **关键决策**：
  - repository `mapTripRow` 统一 snake→camel；DATE 用 UTC 格式化为 `YYYY-MM-DD` 防时区偏移；budget 四舍五入到分
  - 手写校验：name/destination trim 后 1–50；日期 YYYY-MM-DD 且日历合法；endDate>=startDate；budget 为有限 number 且 >=0；note 空串存 null
  - 错误经 `next(err)`（status/code）；DELETE 204 无 body；路由挂在 404 之前
- **自检结果**：`node --check` 通过；字段与契约 §2.1–2.5 对齐；参数化 SQL；未改 client/
- **交接条件**：`npm run db:init` 后启动 server，可用 curl 验五接口；后续可接 spots/expenses

### [B] 实现景点与费用模块（含 summary）
- **时间**：16:55
- **Prompt 摘要**：按契约实现 spots/expenses/summary；PATCH 白名单动态 SET；bulk 事务；summary 一条 GROUP BY SQL；注意路由挂载顺序。
- **产出文件**：`server/src/repositories/spotRepo.js`、`expenseRepo.js`、`controllers/spotController.js`、`expenseController.js`、`routes/spots.js`、`routes/expenses.js`、`server/src/index.js`、`AGENT_LOG.md`
- **关键决策**：
  - 嵌套路由先于 `/api/trips` 挂载：`/:tripId/spots|expenses|summary`，再挂 spots/expenses 资源路由
  - bulk 用 `pool.connect` + BEGIN/COMMIT/ROLLBACK；PATCH 列名仅出自白名单映射
  - summary：`usageRate` 按契约（budget>0 两位小数；budget=0 时无支出为 0、有支出为 1）；金额 `Math.round(n*100)/100`；COUNT `parseInt`
- **自检结果**：`node --check` 通过；字段/枚举/状态码与契约 §3–§4 对齐；未改 client/
- **交接条件**：db 就绪后启动 server，用 curl 验 spots/expenses/summary（重点确认 `/api/trips/1/summary` 返回汇总对象）

### [B] 修复 ESM 下 dotenv 加载过晚导致 SASL 报错
- **时间**：17:02
- **Prompt 摘要**：重启后仍 `client password must be a string`；排查并修复。
- **产出文件**：`server/src/env.js`、`server/src/db.js`、`server/src/index.js`、`AGENT_LOG.md`
- **关键决策**：
  - 根因：ESM `import` 提升导致 `db.js` 建 Pool 早于 `dotenv.config()`，`DATABASE_URL` 为 undefined
  - 新增 `env.js` 并在 `db.js`/`index.js` 首行 import；缺 URL 时启动即抛错
- **自检结果**：`import { query } from db.js` 可查出种子行程 id=1；未改 `.env`、未改 client/
- **交接条件**：重启 `npm --prefix server run dev` 后，GET spots/summary 应不再 SASL；PowerShell POST 请用 `ConvertTo-Json` 或 `@file`

### [F] 实现整体布局与行程模块前端
- **时间**：16:50
- **Prompt 摘要**：按契约实现 trips API 封装、App 布局、路由、TripList 卡片 CRUD；Assistant 占位；删除 Home.vue；详情页基础展示。
- **产出文件**：`client/src/api/trips.js`、`client/src/App.vue`、`client/src/main.js`、`client/src/router/index.js`、`client/src/views/TripList.vue`、`client/src/views/TripDetail.vue`、`client/src/views/Assistant.vue`、`client/src/styles/theme.css`、`client/package.json`（新增 `@element-plus/icons-vue`）、删除 `client/src/views/Home.vue`、`AGENT_LOG.md`
- **关键决策**：
  - 接口路径与字段严格对齐契约 camelCase；金额展示 `¥` + 两位小数；日期区间 `value-format="YYYY-MM-DD"`
  - 列表用卡片网格而非 el-table；删除二次确认文案含级联提示
  - TripDetail 仅展示行程基础信息，景点/费用留后续任务；Assistant 占位「AI 助手开发中」
- **自检结果**：路由无 Home；请求均经 `http.js`；表单必填/空态/loading/成功提示齐全；未改 `server/`
- **交接条件**：后端 trips CRUD 就绪后即可联调列表与详情；后续可在 TripDetail 接入景点/费用模块

### [F] 实现行程详情页（景点/费用/预算概览）
- **时间**：16:55
- **Prompt 摘要**：封装 spots/expenses API；重写 TripDetail（头部、预算概览、景点表、费用表）；统一 formatMoney；费用增删后刷新 summary。
- **产出文件**：`client/src/api/spots.js`、`client/src/api/expenses.js`、`client/src/utils/format.js`、`client/src/views/TripDetail.vue`、`client/src/views/TripList.vue`（改用共享 formatMoney）、`AGENT_LOG.md`
- **关键决策**：
  - onMounted 用 Promise.all 并行加载 trip/spots/expenses/summary
  - 预算卡：overBudget 红条+警告；usageRate>=0.8 橙条+「即将用完」；byCategory 用 el-tag
  - 景点状态 el-switch 即时 PATCH，失败回滚；已去行 row-class-name 置灰
  - 费用增删后必调 refreshExpensesAndSummary；金额统一 `¥1,234.56`
- **自检结果**：枚举与契约对齐；日期 value-format=YYYY-MM-DD；删除二次确认；未改 server/
- **交接条件**：后端 spots/expenses/summary 就绪后即可联调详情页全流程

### [Q] 搭建 Vitest 验收测试与 TESTING.md（成都三日游主路径）
- **时间**：17:10
- **Prompt 摘要**：按演示脚本 5 步验收（新建/改预算、景点已去持久化、费用合计与超支、级联删除）；遵守 50-qa 可写范围；发现业务 bug 只报告不改。
- **产出文件**：`server/tests/*`、`server/vitest.config.js`、`TESTING.md`；脚手架 `server/src/index.js`（导出 app、test 不 listen）、`server/src/db.js`（test 用 TEST_DATABASE_URL）；`AGENT_LOG.md`
- **关键决策**：
  - 主路径用 API 集成测试表达 UI 验收语义；UI 文案/进度条红条写入 `TESTING.md` 手测清单
  - Vitest：`setupFiles` 固定 `NODE_ENV=test`，`fileParallelism: false`；每文件 `beforeAll` schema、`afterEach` TRUNCATE
  - 必覆另含 trips CRUD、summary 金额、AI Mock（无 Key）
- **自检结果**：`npm test` → **4 通过 / 2 失败**：`acceptance-chengdu`（演示 5 步）与 `expenses-summary` 通过；`trips-crud` 因 **DATE 回读少一天**失败；`ai-suggest-mock` 因 **路由未挂载 404**失败。未改业务逻辑
- **交接条件**：
  - **→ B**：`tripRepo.formatDateOnly` 对 `Date` 用 UTC，在 UTC+8 下把写入的 `2026-08-16` 回读成 `2026-08-15`（`trips-crud.test.js` 可复现；spots/expenses 同类映射一并检查）；请改日期映射，勿动测试期望
  - **→ A**：`POST /api/ai/suggest` 尚未挂载（404）；实现后清空 Key 跑 `ai-suggest-mock.test.js` 应 200 + `source=mock`
  - 测试库须存在：`tripmate_test`，`.env` 配好 `TEST_DATABASE_URL`

### [Q+B/A] 修复 DATE 时区偏移与 AI suggest，测试全绿
- **时间**：17:13
- **Prompt 摘要**：修复并重新跑测试（此前 DATE 少一天、AI 404）。
- **产出文件**：`server/src/db.js`（DATE OID 1082 解析为字符串）、`tripRepo.js` / `expenseRepo.js`（formatDateOnly 优先字符串/本地日）、`server/src/ai/*`、`controllers/aiController.js`、`routes/ai.js`、`index.js`（挂载 `/api/ai`）、`AGENT_LOG.md`
- **关键决策**：
  - DATE：在驱动层保持 `YYYY-MM-DD` 字符串，避免 UTC+8 下 Date+getUTC* 少一天
  - AI：无 Key / 超时 / 非 2xx / JSON 或 schema 失败一律 200 + `source=mock` + `fallbackReason`；Mock 内容含 destination/days/budget
- **自检结果**：`npm test` → **4 files / 6 tests 全部通过**
- **交接条件**：可继续前端 AI 联调；真调需配置有效 `DEEPSEEK_API_KEY`

