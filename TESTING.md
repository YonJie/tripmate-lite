# TripMate Lite —— 测试说明（TESTING.md）

> 维护角色：测试 Agent（Q）  
> 对齐：`docs/API-CONTRACT.md` v1、`docs/PRD.md` §7 与附录 A 演示抽检（对应赛题第九节 5 条抽检口径）

---

## 1. 测试策略

| 选择 | 说明 |
|------|------|
| **以后端 API 集成测试为主** | 3 小时 MVP 时间盒下，API 层投入产出比最高：一次覆盖契约字段、状态码、金额类型、级联删除与 AI 降级硬约束，且不依赖浏览器。 |
| **不做 Playwright E2E** | 需下载浏览器与额外依赖，CI/演示环境不稳定，超时风险不可接受；UI 验收改由下文「手工验收清单」覆盖。 |
| **测试库隔离** | 全部自动化跑在独立库 `tripmate_test`（`TEST_DATABASE_URL`），**绝不**读写开发库 `tripmate`。`NODE_ENV=test` 时 `db.js` 切换连接串；每个文件 `beforeAll` 执行 `schema.sql`，`afterEach` `TRUNCATE … CASCADE`，用例互相独立。 |

框架：**Vitest + Supertest**。Express `app` 导出供注入，测试环境不 `listen`。

---

## 2. 环境准备

### 2.1 创建测试库

在 PostgreSQL 中执行（一次性）：

```sql
CREATE DATABASE tripmate_test;
```

### 2.2 环境变量

根目录 `.env`（参考 `.env.example`）至少包含：

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/tripmate
TEST_DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/tripmate_test
```

可选（AI 真调；自动化降级用例会 stub 掉 Key）：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT_MS=15000
```

### 2.3 依赖

```bash
npm run install:all
# 或至少
npm --prefix server install
```

---

## 3. 运行方式

在项目根目录：

```bash
npm test
```

或在 `server/` 下：

```bash
npm test
```

**预期输出（摘要）**：4 个测试文件全部通过，例如：

```text
 ✓ tests/trips.test.js
 ✓ tests/expenses.test.js
 ✓ tests/spots.test.js
 ✓ tests/ai.test.js
 Test Files  4 passed
```

失败时优先检查：`tripmate_test` 是否存在、`TEST_DATABASE_URL` 是否指向该库、Postgres 是否可达。

---

## 4. 用例清单表格

| 用例 ID | 所属模块 | 验证点 | 对应赛题验收 / 抽检口径 |
|---------|----------|--------|-------------------------|
| T-01 | 行程 | 创建 201，字段与请求一致 | 第九节① / PRD §7.1 新建可见 |
| T-02 | 行程 | 创建后列表可查到 | 同上 |
| T-03 | 行程 | **startDate/endDate 严格等于请求 YYYY-MM-DD（无时区偏移）** | 防日期偏移；支撑刷新后数据正确 |
| T-04 | 行程 | 更新后再查字段已变 | 第九节① / §7.1 编辑持久化 |
| T-05 | 行程 | 删除 204，再查 404 | 第九节⑤ / §7.1 删除 |
| T-06 | 行程 | 空名称 → 400 `VALIDATION_ERROR` | 契约校验 |
| T-07 | 行程 | endDate &lt; startDate → 400 | 契约校验 |
| T-08 | 行程 | 负数预算 → 400 | 契约校验 |
| T-09 | 行程 | 不存在 id → 404 | 契约 |
| E-01 | 费用 | 三笔费用 `totalSpent===900` 且 **typeof number** | 第九节③ / §7.3 合计（防 NUMERIC 字符串） |
| E-02 | 费用 | `remaining===100`，`overBudget===false`，`byCategory` 三类正确 | 第九节③ 预算概览 |
| E-03 | 费用 | 再加 500 → 合计 1400、剩余 -400、超支 true | 第九节④ 超支警告 |
| E-04 | 费用 | 删除一笔后合计回退 | §7.3 删费用同步 |
| E-05 | 费用 | 无费用 summary：`totalSpent===0`，`byCategory===[]` | 空态不报错 |
| S-01 | 景点 | 新增 2 条；PATCH「已去」后查询仍已去 | 第九节② / §7.2 |
| S-02 | 景点 | 非法 type → 400 | 契约枚举 |
| S-03 | 景点/级联 | 删行程后 DB 中 spots/expenses 行数为 0 | 第九节⑤ / §7.1 级联 |
| A-01 | AI | 无 Key → **HTTP 200**、`source==='mock'`、`fallbackReason` 非空 | 第九节④ AI 降级 / §7.4 |
| A-02 | AI | `data.days.length===days`，`tips.length>=3`，首日 title 含目的地 | Mock 与入参相关、非固定文案 |
| A-03 | AI | days=0 或 20 → 400 | 契约 days∈[1,15] |

自动化文件：`server/tests/trips.test.js`、`expenses.test.js`、`spots.test.js`、`ai.test.js`。

---

## 5. 手工验收清单（评审可照此点）

覆盖赛题第九节抽检口径（与 PRD 附录 A 演示脚本一致）。金额展示约定：`¥` + 千分位 + 两位小数。

### 抽检① 行程新建 / 编辑 / 刷新持久化

- [ ] 打开行程列表（无数据时）→ 空状态，不白屏。  
- [ ] 新建「成都三日游」（或「周末青岛两日游」），填齐名称、目的地、起止日期、预算 → 成功提示；列表可见。  
- [ ] 编辑预算为 **3500**（或其它新值）→ 保存成功 → **刷新页面**后仍为新值；起止日期展示无「少一天」。

### 抽检② 景点新增与「已去」持久化

- [ ] 进入行程详情 → 可见景点清单区域。  
- [ ] 新增「宽窄巷子」「都江堰」（或任意 2 条）→ 列表 2 条。  
- [ ] 将其中一条改为「已去」→ 界面立即更新 → **刷新**后仍为「已去」。

### 抽检③ 费用合计与预算概览

- [ ] 新增费用「高铁票 ¥620 交通」「民宿 ¥900 住宿」（或金额已知的两笔）→ 列表可见。  
- [ ] 合计 = 各笔金额之和（number 相加，非字符串拼接）；预算概览「已花费 / 剩余」合理（例：预算 3500 时已花 1520、剩余 1980）。

### 抽检④ 超支警告 + AI Mock 降级

- [ ] 再加一笔使合计 **大于预算**（例：购物 ¥2500）→ 合计更新 → 进度条变红 / 出现超支警告。  
- [ ] 打开 AI 助手；无 Key 或强制失败 → 页面标识 **Mock 降级**，仍可渲染建议，不白屏、不抛未捕获错误。

### 抽检⑤ 删除行程级联

- [ ] 返回列表 → 删除该行程 → 确认弹窗提示会**级联删除**景点与费用。  
- [ ] 确认后列表为空/该卡消失且不报错；再进详情应失败或回列表；其下景点与费用不可再查到。

> 删除确认文案参考：`确定删除「…」吗？将同时删除该行程下的所有景点与费用记录。`

---

## 6. 已知限制

| 未覆盖 | 为何当前可接受 |
|--------|----------------|
| 前端组件单测（Vue / Element Plus） | 时间盒内优先契约与金额正确性；UI 由手工清单覆盖主路径 |
| Playwright / 浏览器 E2E | 下载与环境风险高；与第 1 节策略一致 |
| DeepSeek **真调成功**路径自动化 | 依赖外网与真实 Key，不稳定；降级路径已强制覆盖（赛题特色） |
| 并发写入 / 压测 | 单用户本地 MVP，非范围 |
| 费用「编辑」接口 | 契约明确无 PUT/PATCH；改费用 = 删旧建新（手工清单已注明） |

---

## 7. 脚手架说明（Q 允许的最小改动）

| 文件 | 作用 |
|------|------|
| `server/src/index.js` | `export { app }`；`NODE_ENV === 'test'` 时不 `listen` |
| `server/src/db.js` | `NODE_ENV === 'test'` 时使用 `TEST_DATABASE_URL` |
| `server/vitest.config.js` | `setupFiles`、`fileParallelism: false`、`env.NODE_ENV=test` |

**禁止**：测试不得修改业务校验规则、SQL、AI Prompt。发现业务 bug → 报告对应角色（B/A/F/P），不自行改业务逻辑。
