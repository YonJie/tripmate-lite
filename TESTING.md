# TripMate Lite —— 测试与验收

> 维护角色：测试 Agent（Q）  
> 对齐：`docs/PRD.md` §7、`docs/API-CONTRACT.md` v1、演示脚本「成都三日游」

---

## 1. 自动化测试（API）

### 1.1 前置条件

1. 已安装依赖：`npm run install:all`（或至少 `npm --prefix server install`）
2. 本地 PostgreSQL 可用，并已创建**独立**测试库（勿与开发库 `tripmate` 混用）：

```sql
CREATE DATABASE tripmate_test;
```

3. 根目录 `.env` 已按 `.env.example` 配置，至少包含：

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/tripmate
TEST_DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/tripmate_test
```

> 自动化测试**只**读写 `TEST_DATABASE_URL`（`NODE_ENV=test`）。  
> 每个测试文件 `beforeAll` 会执行 `server/db/schema.sql` 重建表结构；`afterEach` 清空数据。

### 1.2 运行命令

在项目根目录：

```bash
npm test
```

或在 `server/` 下：

```bash
npm test
```

### 1.3 覆盖范围

| 文件 | 覆盖 |
|------|------|
| `server/tests/acceptance-chengdu.test.js` | 演示主路径步骤 1–5（行程/景点/费用汇总/超支/级联删除） |
| `server/tests/trips-crud.test.js` | 行程 CRUD 全链路 + 校验错误 |
| `server/tests/expenses-summary.test.js` | 费用合计为 number、超支 `overBudget`、删费用后汇总同步 |
| `server/tests/ai-suggest-mock.test.js` | 强制无 Key 时 `POST /api/ai/suggest` 仍 200 且 `source=mock` |

### 1.4 脚手架说明（Q 允许的最小改动）

| 文件 | 改动 |
|------|------|
| `server/src/db.js` | `NODE_ENV=test` 时使用 `TEST_DATABASE_URL` |
| `server/src/index.js` | `export { app }`；测试环境不 `listen` |
| `server/vitest.config.js` | `setupFiles` + `fileParallelism: false` |

**禁止**：测试不得修改业务校验、SQL、AI Prompt 等业务逻辑。

---

## 2. 手测清单（UI / 联调）

评审时逐条勾选。金额展示约定：`¥` + 千分位 + 两位小数（如 `¥1,520.00`）。

### 2.1 演示主路径 · 成都三日游

- [ ] **1** 新建行程「成都三日游」（目的地成都、起止日期填齐、预算可先填 3000）→ 列表可见该卡片。
- [ ] **1** 编辑将该行程预算改为 **3500** → 保存成功提示 → **刷新页面**后预算仍为 3500。
- [ ] **2** 进入详情 → 新增景点「宽窄巷子」「都江堰」→ 列表显示 2 条。
- [ ] **2** 将「宽窄巷子」改为「已去」→ 界面立即更新 → **刷新**后仍为「已去」。
- [ ] **3** 新增费用「高铁票 ¥620 交通」「民宿 ¥900 住宿」→ 费用合计显示 **¥1,520.00**。
- [ ] **3** 预算概览：已花费 **1520**、剩余 **1980**（预算 3500）；进度条非红色、无超支警告。
- [ ] **4** 再加「购物 ¥2500 其他」→ 合计 **¥4,020.00** → 进度条变红 → 出现超支警告文案。
- [ ] **5** 返回列表 → 删除该行程 → 确认弹窗提示会**级联删除**景点与费用 → 确认后列表为空且不报错。

> 删除确认文案参考（前端实现）：`确定删除「…」吗？将同时删除该行程下的所有景点与费用记录。`

### 2.2 对齐 PRD §7（补充）

#### 模块1 行程管理

- [ ] 打开行程列表（无数据）→ 空状态，不白屏。
- [ ] 新建必填齐全 → 成功提示；列表可见。
- [ ] 编辑名称/预算 → 保存成功；刷新仍为新值。
- [ ] 删除确认后列表消失；再访问详情应 404 / 回列表。
- [ ] 删除后其下 spots、expenses 不可再查到。

#### 模块2 景点/活动清单

- [ ] 详情页可见清单区域（可空态）。
- [ ] 新增 2 条 → 列表 2 条。
- [ ] 改「已去」→ 立即显示；刷新仍持久化。
- [ ] （可选）未传 `estimatedCost` → 回读为 0。

#### 模块3 费用记录

- [ ] 新增 2 笔 → 列表 2 条；合计 = 两笔 amount 之和（非字符串拼接）。
- [ ] 预算对比展示合理；超支有明确提醒。
- [ ] 删除一笔后合计与概览同步更新。
- [ ] 无「编辑费用」入口；改费用 = 删旧建新。

#### 模块4 AI 行程助手

- [ ] 有效 Key 真调成功 → 标识 DeepSeek（`source: deepseek`）。
- [ ] 无 Key / 强制失败 → 标识 Mock 降级（`source: mock`），HTTP 仍成功，页面不白屏。
- [ ] Mock 与真调字段同构，同一套 UI 可渲染。
- [ ] （P1）导入建议到清单；若已砍则标 N/A。

---

## 3. 发现缺陷时

1. **不要**由 Q 直接改业务逻辑（CRUD 规则、SQL、AI Prompt 等）。
2. 在对话中报告给对应角色：B（后端 API/SQL）、F（前端 UI）、A（AI）、P（契约歧义）。
3. 同步在 `AGENT_LOG.md` 留痕。
