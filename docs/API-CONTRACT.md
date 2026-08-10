# TripMate Lite —— API 契约（唯一事实来源）

> **【冻结声明】** 本文档 **v1 已正式冻结**。冻结时间：**2026-08-10 16:39**（UTC+8）。核对通过后生效。后端 Agent（B）与前端 Agent（F）可据此并行开发；AI Agent（A）、测试 Agent（Q）同样以本文为唯一口径。  
> **变更门禁**：后续任何路径、字段、状态码或语义变更，必须由负责人**明确指令**后，由规划 Agent（P）修改本文，并同步记入文末「契约变更记录」表与 `AGENT_LOG.md`；各实现角色不得私下假设或改契约。  
> **版本**：v1（已冻结）  
> **状态**：前后端 / AI Agent 必须以本文为准并行开发；未经明确指令不得擅自增删路径、字段或状态码。  
> **关联**：实体与范围见 `docs/PRD.md`。

---

## 0. 全局约定

| 项 | 约定 |
|----|------|
| Base URL | `/api` |
| 开发代理 | 前端 Vite proxy 将 `/api` 转发到 `http://localhost:3000`（同源，无 CORS） |
| Content-Type | 请求与响应均为 `application/json`，编码 UTF-8 |
| 成功响应 | **直接返回资源对象或数组**，不包裹 `{ data: ... }` 之类 envelope |
| 失败响应 | 统一为 `{ "error": { "code": "STRING_CODE", "message": "中文提示" } }` |
| 字段命名 | API 层一律 **camelCase**；数据库层 **snake_case**；转换在后端 repository 层完成；前端只见 camelCase |
| 金额 | JavaScript **number**，语义保留两位小数（入库/出库均四舍五入到分）；禁止以字符串返回金额 |
| 日期 | 一律 `YYYY-MM-DD` 字符串，不带时区（如 `"2026-08-10"`） |
| 时间戳 | `createdAt` / `generatedAt` 为 ISO 8601 字符串（如 `"2026-08-10T08:30:00.000Z"`） |
| 主键 id | 整数 `number`（PostgreSQL `SERIAL` / `integer`），由服务端生成 |
| 鉴权 | 无。单用户本地 MVP，不要求 Token / Cookie |

### 0.1 HTTP 状态码

| 状态码 | 含义 | 典型 `error.code` |
|--------|------|-------------------|
| 200 | 成功 | — |
| 201 | 创建成功 | — |
| 204 | 删除成功，无响应体 | — |
| 400 | 参数校验失败 | `VALIDATION_ERROR` |
| 404 | 资源不存在 | `NOT_FOUND` |
| 500 | 服务端未预期错误 | `INTERNAL_ERROR` |

> **例外（硬约束）**：`POST /api/ai/suggest` 在真调或 Mock 降级时**一律返回 200**，不得因 DeepSeek 失败返回 5xx。

### 0.2 失败响应示例

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "行程名称不能为空"
  }
}
```

### 0.3 枚举常量（全文唯一口径）

| 枚举 | 允许值 |
|------|--------|
| Spot.type | `"景点"` \| `"餐饮"` \| `"交通"` \| `"其他"` |
| Spot.status | `"待去"` \| `"已去"` |
| Expense.category / budgetPlan.category | `"交通"` \| `"住宿"` \| `"餐饮"` \| `"门票"` \| `"其他"` |
| AI item.time | `"上午"` \| `"下午"` \| `"晚上"` |
| AI source | `"deepseek"` \| `"mock"` |

### 0.4 资源模型（响应字段）

#### Trip

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| name | string | 名称 |
| destination | string | 目的地 |
| startDate | string | `YYYY-MM-DD` |
| endDate | string | `YYYY-MM-DD` |
| budget | number | 预算 |
| note | string \| null | 备注；未传存 `null` |
| createdAt | string | ISO 8601 |

#### Spot

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| tripId | number | 所属行程 |
| name | string | 名称 |
| type | string | 见枚举 Spot.type |
| estimatedCost | number | 未传创建时为 `0` |
| status | string | 见枚举 Spot.status |
| createdAt | string | ISO 8601 |

#### Expense

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 主键 |
| tripId | number | 所属行程 |
| name | string | 名称 |
| amount | number | 金额 |
| category | string | 见枚举 Expense.category |
| spendDate | string | `YYYY-MM-DD` |
| createdAt | string | ISO 8601 |

> **费用模块无更新接口**：改一笔费用 = `DELETE` 旧记录 + `POST` 新记录。

---

## 1. 健康检查

### 1.1 GET /api/health

- **方法与路径**：`GET /api/health`
- **路径参数**：无
- **请求体**：无
- **成功**：`200`

**成功响应示例**：

```json
{
  "ok": true,
  "ts": "2026-08-10T08:30:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| ok | boolean | 服务可用时为 `true` |
| ts | string | 当前服务端时间，ISO 8601 |

**错误**：一般情况下不返回业务错误；进程异常时可能由基础设施返回非 JSON，实现侧应尽量保证本接口可用。

---

## 2. 行程模块

### 2.1 GET /api/trips

- **方法与路径**：`GET /api/trips`
- **路径参数**：无
- **请求体**：无
- **成功**：`200`，`Trip[]`，按 `createdAt` **倒序**（新在前）
- **空列表**：返回 `[]`

**成功响应示例**：

```json
[
  {
    "id": 2,
    "name": "周末青岛两日游",
    "destination": "青岛",
    "startDate": "2026-08-16",
    "endDate": "2026-08-17",
    "budget": 1500,
    "note": "海鲜别吃太多",
    "createdAt": "2026-08-10T08:30:00.000Z"
  },
  {
    "id": 1,
    "name": "杭州一日游",
    "destination": "杭州",
    "startDate": "2026-09-01",
    "endDate": "2026-09-01",
    "budget": 800,
    "note": null,
    "createdAt": "2026-08-09T12:00:00.000Z"
  }
]
```

**可能错误**：`500 INTERNAL_ERROR`（未预期服务端错误）。

---

### 2.2 POST /api/trips

- **方法与路径**：`POST /api/trips`
- **路径参数**：无
- **成功**：`201`，返回创建后的 `Trip`

**请求体字段**：

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| name | string | 是 | 非空，trim 后长度 1–50 | `"周末青岛两日游"` |
| destination | string | 是 | 非空，trim 后长度 1–50 | `"青岛"` |
| startDate | string | 是 | 匹配 `YYYY-MM-DD` | `"2026-08-16"` |
| endDate | string | 是 | 匹配 `YYYY-MM-DD`；不得早于 `startDate` | `"2026-08-17"` |
| budget | number | 是 | `>= 0`，保留两位小数 | `1500` |
| note | string | 否 | 若提供：长度 0–500；空串推荐存 `null` | `"海鲜别吃太多"` |

**请求体示例**：

```json
{
  "name": "周末青岛两日游",
  "destination": "青岛",
  "startDate": "2026-08-16",
  "endDate": "2026-08-17",
  "budget": 1500,
  "note": "海鲜别吃太多"
}
```

**成功响应示例**：

```json
{
  "id": 2,
  "name": "周末青岛两日游",
  "destination": "青岛",
  "startDate": "2026-08-16",
  "endDate": "2026-08-17",
  "budget": 1500,
  "note": "海鲜别吃太多",
  "createdAt": "2026-08-10T08:30:00.000Z"
}
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | 缺字段、名称超长、日期格式非法、`endDate < startDate`、`budget < 0` 等 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 2.3 GET /api/trips/:id

- **方法与路径**：`GET /api/trips/:id`
- **路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number（路径字符串解析为整数） | 行程 ID；非正整数视为校验失败 |

- **请求体**：无
- **成功**：`200` `Trip`

**成功响应示例**：

```json
{
  "id": 2,
  "name": "周末青岛两日游",
  "destination": "青岛",
  "startDate": "2026-08-16",
  "endDate": "2026-08-17",
  "budget": 1500,
  "note": "海鲜别吃太多",
  "createdAt": "2026-08-10T08:30:00.000Z"
}
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `id` 无法解析为正整数 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 2.4 PUT /api/trips/:id

- **方法与路径**：`PUT /api/trips/:id`
- **路径参数**：同 2.3（`id`）
- **成功**：`200`，返回更新后的完整 `Trip`
- **语义**：全量更新可写字段；请求体必须带齐必填字段（不是 PATCH）

**请求体字段**：与 `POST /api/trips` 相同（`name` / `destination` / `startDate` / `endDate` / `budget` 必填，`note` 选填）。

**请求体示例**：

```json
{
  "name": "青岛海滨两日游",
  "destination": "青岛",
  "startDate": "2026-08-16",
  "endDate": "2026-08-17",
  "budget": 1800,
  "note": null
}
```

**成功响应示例**：

```json
{
  "id": 2,
  "name": "青岛海滨两日游",
  "destination": "青岛",
  "startDate": "2026-08-16",
  "endDate": "2026-08-17",
  "budget": 1800,
  "note": null,
  "createdAt": "2026-08-10T08:30:00.000Z"
}
```

> `createdAt` 不因更新而改变。

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | 校验失败（同创建规则）或 `id` 非法 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 2.5 DELETE /api/trips/:id

- **方法与路径**：`DELETE /api/trips/:id`
- **路径参数**：同 2.3（`id`）
- **请求体**：无
- **成功**：`204`，无响应体
- **级联**：必须删除该行程下全部 `spots` 与 `expenses`（DB `ON DELETE CASCADE` 或等价事务）

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `id` 非法 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

## 3. 景点模块

### 3.1 GET /api/trips/:tripId/spots

- **方法与路径**：`GET /api/trips/:tripId/spots`
- **路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| tripId | number | 行程 ID |

- **请求体**：无
- **成功**：`200` `Spot[]`，按 `createdAt` **升序**（先创建在前）
- **空列表**：行程存在但无景点时返回 `[]`
- **前置**：`tripId` 对应行程必须存在，否则 `404`

**成功响应示例**：

```json
[
  {
    "id": 1,
    "tripId": 2,
    "name": "栈桥",
    "type": "景点",
    "estimatedCost": 0,
    "status": "已去",
    "createdAt": "2026-08-10T09:00:00.000Z"
  },
  {
    "id": 2,
    "tripId": 2,
    "name": "海底世界",
    "type": "景点",
    "estimatedCost": 130,
    "status": "待去",
    "createdAt": "2026-08-10T09:05:00.000Z"
  }
]
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `tripId` 非法 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 3.2 POST /api/trips/:tripId/spots

- **方法与路径**：`POST /api/trips/:tripId/spots`
- **路径参数**：`tripId`（行程必须存在）
- **成功**：`201` `Spot`

**请求体字段**：

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| name | string | 是 | 非空，长度 1–50 | `"栈桥"` |
| type | string | 是 | 枚举：景点/餐饮/交通/其他 | `"景点"` |
| estimatedCost | number | 否 | 若提供则 `>= 0`；**未传则入库为 `0`** | `0` |
| status | string | 否 | 枚举：待去/已去；**未传默认 `"待去"`** | `"待去"` |

**请求体示例**：

```json
{
  "name": "栈桥",
  "type": "景点",
  "estimatedCost": 0,
  "status": "待去"
}
```

**成功响应示例**：

```json
{
  "id": 1,
  "tripId": 2,
  "name": "栈桥",
  "type": "景点",
  "estimatedCost": 0,
  "status": "待去",
  "createdAt": "2026-08-10T09:00:00.000Z"
}
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | 字段校验失败 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 3.3 PATCH /api/spots/:id

- **方法与路径**：`PATCH /api/spots/:id`
- **路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 景点 ID |

- **成功**：`200`，返回更新后的完整 `Spot`
- **语义**：部分更新；**请求体字段全部可选**，但至少提供一个可写字段；未出现的字段保持原值

**请求体字段**：

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| name | string | 否 | 若提供：长度 1–50 | `"青岛海底世界"` |
| type | string | 否 | 若提供：须为 Spot.type 枚举 | `"景点"` |
| estimatedCost | number | 否 | 若提供：`>= 0` | `130` |
| status | string | 否 | 若提供：须为 Spot.status 枚举 | `"已去"` |

**请求体示例（仅改状态）**：

```json
{
  "status": "已去"
}
```

**成功响应示例**：

```json
{
  "id": 1,
  "tripId": 2,
  "name": "栈桥",
  "type": "景点",
  "estimatedCost": 0,
  "status": "已去",
  "createdAt": "2026-08-10T09:00:00.000Z"
}
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `id` 非法、请求体为空对象、枚举非法、金额 `< 0` 等 |
| 404 | NOT_FOUND | 景点不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 3.4 DELETE /api/spots/:id

- **方法与路径**：`DELETE /api/spots/:id`
- **路径参数**：`id`（景点 ID）
- **请求体**：无
- **成功**：`204`，无响应体

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `id` 非法 |
| 404 | NOT_FOUND | 景点不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 3.5 POST /api/trips/:tripId/spots/bulk

- **方法与路径**：`POST /api/trips/:tripId/spots/bulk`
- **路径参数**：`tripId`（行程必须存在）
- **用途**：AI 建议一键导入景点清单
- **成功**：`201` `Spot[]`（按创建顺序返回）
- **事务**：整批要么全部成功，要么全部失败回滚

**请求体字段**：

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| items | array | 是 | 长度 1–50；每一项校验同单条创建 | 见下 |

**items[] 元素字段**：

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| name | string | 是 | 长度 1–50 | `"八大关"` |
| type | string | 是 | Spot.type 枚举 | `"景点"` |
| estimatedCost | number | 否 | `>= 0`；未传为 `0` | `0` |
| status | string | 否 | Spot.status 枚举；未传默认 `"待去"` | `"待去"` |

> AI `data.days[].items[]` 中的 `note` / `time` **不写入** Spot；导入时只映射 `name` / `type` / `estimatedCost`。

**请求体示例**：

```json
{
  "items": [
    {
      "name": "八大关",
      "type": "景点",
      "estimatedCost": 0
    },
    {
      "name": "海鲜排挡",
      "type": "餐饮",
      "estimatedCost": 150,
      "status": "待去"
    }
  ]
}
```

**成功响应示例**：

```json
[
  {
    "id": 3,
    "tripId": 2,
    "name": "八大关",
    "type": "景点",
    "estimatedCost": 0,
    "status": "待去",
    "createdAt": "2026-08-10T10:00:00.000Z"
  },
  {
    "id": 4,
    "tripId": 2,
    "name": "海鲜排挡",
    "type": "餐饮",
    "estimatedCost": 150,
    "status": "待去",
    "createdAt": "2026-08-10T10:00:00.001Z"
  }
]
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `items` 缺失/空数组/超长，或任一项校验失败（整批失败，不做部分写入） |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

## 4. 费用模块

### 4.1 GET /api/trips/:tripId/expenses

- **方法与路径**：`GET /api/trips/:tripId/expenses`
- **路径参数**：`tripId`
- **成功**：`200` `Expense[]`，按 `spendDate` **倒序**；`spendDate` 相同则按 `createdAt` 倒序
- **空列表**：`[]`
- **前置**：行程必须存在，否则 `404`

**成功响应示例**：

```json
[
  {
    "id": 2,
    "tripId": 2,
    "name": "海底世界门票",
    "amount": 130,
    "category": "门票",
    "spendDate": "2026-08-17",
    "createdAt": "2026-08-10T11:00:00.000Z"
  },
  {
    "id": 1,
    "tripId": 2,
    "name": "高铁往返",
    "amount": 560,
    "category": "交通",
    "spendDate": "2026-08-16",
    "createdAt": "2026-08-10T10:30:00.000Z"
  }
]
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `tripId` 非法 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 4.2 POST /api/trips/:tripId/expenses

- **方法与路径**：`POST /api/trips/:tripId/expenses`
- **路径参数**：`tripId`（行程必须存在）
- **成功**：`201` `Expense`
- **无 PUT/PATCH**：本模块不提供编辑接口

**请求体字段**：

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| name | string | 是 | 非空，长度 1–50 | `"高铁往返"` |
| amount | number | 是 | `>= 0`，保留两位小数 | `560` |
| category | string | 是 | 枚举：交通/住宿/餐饮/门票/其他 | `"交通"` |
| spendDate | string | 是 | `YYYY-MM-DD` | `"2026-08-16"` |

**请求体示例**：

```json
{
  "name": "高铁往返",
  "amount": 560,
  "category": "交通",
  "spendDate": "2026-08-16"
}
```

**成功响应示例**：

```json
{
  "id": 1,
  "tripId": 2,
  "name": "高铁往返",
  "amount": 560,
  "category": "交通",
  "spendDate": "2026-08-16",
  "createdAt": "2026-08-10T10:30:00.000Z"
}
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | 字段校验失败 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 4.3 DELETE /api/expenses/:id

- **方法与路径**：`DELETE /api/expenses/:id`
- **路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 费用 ID |

- **请求体**：无
- **成功**：`204`，无响应体

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `id` 非法 |
| 404 | NOT_FOUND | 费用不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

---

### 4.4 GET /api/trips/:tripId/summary

- **方法与路径**：`GET /api/trips/:tripId/summary`
- **路径参数**：`tripId`
- **成功**：`200` 汇总对象
- **前置**：行程必须存在，否则 `404`

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| tripId | number | 行程 ID |
| budget | number | 行程预算（来自 trip） |
| totalSpent | number | 该行程下所有费用 `amount` 之和；无费用时为 `0` |
| remaining | number | `budget - totalSpent`（可为负数） |
| overBudget | boolean | `totalSpent > budget` 时为 `true`，否则 `false` |
| usageRate | number | 已用比例，保留两位小数。`budget > 0` 时为 `round(totalSpent / budget, 2)`（超支时可 `> 1`）；`budget === 0` 时：`totalSpent === 0` → `0`，否则 → `1` |
| byCategory | array | 按分类汇总；**仅包含有消费的分类**；按 `amount` 倒序 |

**byCategory[] 元素**：

| 字段 | 类型 | 说明 |
|------|------|------|
| category | string | Expense.category 枚举值 |
| amount | number | 该分类金额合计 |
| count | number | 该分类笔数（整数） |

**成功响应示例**：

```json
{
  "tripId": 2,
  "budget": 1500,
  "totalSpent": 690,
  "remaining": 810,
  "overBudget": false,
  "usageRate": 0.46,
  "byCategory": [
    {
      "category": "交通",
      "amount": 560,
      "count": 1
    },
    {
      "category": "门票",
      "amount": 130,
      "count": 1
    }
  ]
}
```

**超支示例**：

```json
{
  "tripId": 2,
  "budget": 500,
  "totalSpent": 690,
  "remaining": -190,
  "overBudget": true,
  "usageRate": 1.38,
  "byCategory": [
    {
      "category": "交通",
      "amount": 560,
      "count": 1
    },
    {
      "category": "门票",
      "amount": 130,
      "count": 1
    }
  ]
}
```

**可能错误**：

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | `tripId` 非法 |
| 404 | NOT_FOUND | 行程不存在 |
| 500 | INTERNAL_ERROR | 未预期服务端错误 |

> **实现注意**：PostgreSQL `NUMERIC` 可能以字符串返回；必须在 `db.js` 注册类型解析为 JS `number`，否则合计会错误。

---

## 5. AI 模块

### 5.1 POST /api/ai/suggest

- **方法与路径**：`POST /api/ai/suggest`
- **路径参数**：无
- **成功**：`200`（**无论 DeepSeek 真调还是 Mock 降级，一律 200；禁止因模型/网络失败返回 5xx**）
- **结构同构**：Mock 与真实调用返回**完全相同的字段结构**，前端共用同一套渲染组件

#### 5.1.1 请求体字段

| 字段 | 类型 | 必填 | 校验规则 | 示例值 |
|------|------|------|----------|--------|
| destination | string | 条件必填 | 见下方「参数优先级」；若最终需要则长度 1–50 | `"青岛"` |
| days | number | 条件必填 | 整数，取值 **1–15** | `2` |
| budget | number | 条件必填 | `>= 0` | `1500` |
| tripId | number | 否 | 若提供须为正整数；用于补齐**缺失**字段 | `2` |

**请求体示例（表单全量提交）**：

```json
{
  "destination": "青岛",
  "days": 2,
  "budget": 1500,
  "tripId": 2
}
```

**请求体示例（仅 tripId，由服务端补齐）**：

```json
{
  "tripId": 2
}
```

#### 5.1.2 参数优先级（禁止歧义）

1. 若请求体**显式提供**了 `destination` / `days` / `budget`（字段存在且非 `null`），**一律以请求体为准**，即使同时传了 `tripId`。  
2. `tripId` **仅用于补齐缺失字段**：从该行程读取 `destination`、`budget`；`days` = `endDate - startDate + 1`（按日期差，含首尾两天）。  
3. 前端「从已有行程带入」只是**预填表单**；用户提交时仍以表单字段为准（即规则 1）。  
4. 若提供了 `tripId` 但行程不存在 → **`404 NOT_FOUND`**（发生在调用模型之前）。  
5. 完成补齐后，若仍缺 `destination` / `days` / `budget` 任一 → **`400 VALIDATION_ERROR`**。  
6. 补齐或显式提供的 `days` 必须在 1–15，否则 `400`。

#### 5.1.3 响应体结构

| 字段 | 类型 | 说明 |
|------|------|------|
| source | string | `"deepseek"` 或 `"mock"` |
| fallbackReason | string \| null | 真调成功时为 `null`；降级时为中文原因说明 |
| generatedAt | string | ISO 8601 生成时间 |
| input | object | 服务端最终采用的入参回显：`{ destination, days, budget }` |
| data | object | 建议正文，见下 |

**data 对象**：

| 字段 | 类型 | 说明 |
|------|------|------|
| summary | string | 一句话总述 |
| days | array | 每日安排；长度应等于 `input.days` |
| budgetPlan | array | 预算拆分；各项 `category` 为费用枚举；各项 `amount` 之和应接近输入 `budget` |
| tips | string[] | 旅行提示；**至少 3 条**（真调与 Mock 统一口径） |

**data.days[]**：

| 字段 | 类型 | 说明 |
|------|------|------|
| day | number | 第几天，从 1 起 |
| title | string | 当日主题 |
| items | array | 当日活动 |

**data.days[].items[]**（刻意与 Spot 对齐，便于 bulk 导入）：

| 字段 | 类型 | 说明 |
|------|------|------|
| time | string | `"上午"` \| `"下午"` \| `"晚上"` |
| name | string | 活动名称 → 导入 Spot.name |
| type | string | Spot.type 枚举 → 导入 Spot.type |
| estimatedCost | number | → 导入 Spot.estimatedCost |
| note | string | 简短说明；**导入 Spot 时忽略** |

**data.budgetPlan[]**：

| 字段 | 类型 | 说明 |
|------|------|------|
| category | string | 交通/住宿/餐饮/门票/其他 |
| amount | number | 建议金额 |
| percent | number | 占预算比例，如 `30` 表示 30% |
| note | string | 说明 |

#### 5.1.4 降级触发条件（`source` 必须为 `"mock"`，且填 `fallbackReason`）

包括以下至少一类（不限于）：缺少 API Key、请求超时、HTTP 非 2xx、响应体 JSON 解析失败、字段 schema 校验不通过（含 `tips.length < 3` 等）。

#### 5.1.5 成功响应示例（真实调用）

```json
{
  "source": "deepseek",
  "fallbackReason": null,
  "generatedAt": "2026-08-10T12:00:00.000Z",
  "input": {
    "destination": "青岛",
    "days": 2,
    "budget": 1500
  },
  "data": {
    "summary": "两日海滨休闲：栈桥与老城漫步结合八大关与海鲜美食品鉴。",
    "days": [
      {
        "day": 1,
        "title": "海岸线与老城",
        "items": [
          {
            "time": "上午",
            "name": "栈桥",
            "type": "景点",
            "estimatedCost": 0,
            "note": "打卡合影，注意防晒"
          },
          {
            "time": "下午",
            "name": "劈柴院",
            "type": "餐饮",
            "estimatedCost": 120,
            "note": "尝尝海鲜水饺"
          },
          {
            "time": "晚上",
            "name": "地铁回酒店",
            "type": "交通",
            "estimatedCost": 8,
            "note": "避开晚高峰"
          }
        ]
      },
      {
        "day": 2,
        "title": "八大关与返程",
        "items": [
          {
            "time": "上午",
            "name": "八大关",
            "type": "景点",
            "estimatedCost": 0,
            "note": "骑行或步行游览"
          },
          {
            "time": "下午",
            "name": "海鲜排挡",
            "type": "餐饮",
            "estimatedCost": 200,
            "note": "控制人均预算"
          },
          {
            "time": "晚上",
            "name": "高铁返程",
            "type": "交通",
            "estimatedCost": 280,
            "note": "预留安检时间"
          }
        ]
      }
    ],
    "budgetPlan": [
      {
        "category": "交通",
        "amount": 560,
        "percent": 37.33,
        "note": "往返高铁为主"
      },
      {
        "category": "住宿",
        "amount": 400,
        "percent": 26.67,
        "note": "一晚海景或商圈酒店"
      },
      {
        "category": "餐饮",
        "amount": 320,
        "percent": 21.33,
        "note": "含海鲜与小吃"
      },
      {
        "category": "门票",
        "amount": 130,
        "percent": 8.67,
        "note": "可选景点"
      },
      {
        "category": "其他",
        "amount": 90,
        "percent": 6,
        "note": "机动与购物"
      }
    ],
    "tips": [
      "海边风大，备一件薄外套",
      "海鲜选择人气高的排挡，注意人均",
      "热门景点建议错峰出行"
    ]
  }
}
```

#### 5.1.6 成功响应示例（Mock 降级）

```json
{
  "source": "mock",
  "fallbackReason": "缺少 DEEPSEEK_API_KEY，已降级为 Mock",
  "generatedAt": "2026-08-10T12:05:00.000Z",
  "input": {
    "destination": "青岛",
    "days": 2,
    "budget": 1500
  },
  "data": {
    "summary": "（Mock）为青岛生成的 2 日行程草案，预算约 1500 元。",
    "days": [
      {
        "day": 1,
        "title": "抵达与海岸漫步",
        "items": [
          {
            "time": "上午",
            "name": "青岛站抵达",
            "type": "交通",
            "estimatedCost": 0,
            "note": "Mock：与目的地相关"
          },
          {
            "time": "下午",
            "name": "栈桥观海",
            "type": "景点",
            "estimatedCost": 0,
            "note": "Mock 示例活动"
          },
          {
            "time": "晚上",
            "name": "海鲜晚餐",
            "type": "餐饮",
            "estimatedCost": 150,
            "note": "控制预算"
          }
        ]
      },
      {
        "day": 2,
        "title": "经典街区与返程",
        "items": [
          {
            "time": "上午",
            "name": "八大关",
            "type": "景点",
            "estimatedCost": 0,
            "note": "Mock 示例活动"
          },
          {
            "time": "下午",
            "name": "咖啡与手信",
            "type": "其他",
            "estimatedCost": 80,
            "note": "留出机动时间"
          },
          {
            "time": "晚上",
            "name": "返程交通",
            "type": "交通",
            "estimatedCost": 280,
            "note": "预留时间"
          }
        ]
      }
    ],
    "budgetPlan": [
      {
        "category": "交通",
        "amount": 560,
        "percent": 37.33,
        "note": "Mock 预算拆分"
      },
      {
        "category": "住宿",
        "amount": 400,
        "percent": 26.67,
        "note": "Mock 预算拆分"
      },
      {
        "category": "餐饮",
        "amount": 320,
        "percent": 21.33,
        "note": "Mock 预算拆分"
      },
      {
        "category": "门票",
        "amount": 130,
        "percent": 8.67,
        "note": "Mock 预算拆分"
      },
      {
        "category": "其他",
        "amount": 90,
        "percent": 6,
        "note": "Mock 预算拆分"
      }
    ],
    "tips": [
      "Mock：青岛海边注意防晒与防风",
      "Mock：合理分配 1500 元预算",
      "Mock：2 日行程不宜安排过满"
    ]
  }
}
```

> Mock 内容必须与输入的 `destination` / `days` / `budget` 相关，禁止与入参无关的固定文案。

#### 5.1.7 本接口可能错误（仅参数/资源错误；模型失败不走此表）

| 状态码 | code | 触发条件 |
|--------|------|----------|
| 400 | VALIDATION_ERROR | 补齐后仍缺必填；`days` 越界；金额非法；`tripId` 格式非法等 |
| 404 | NOT_FOUND | 提供了 `tripId` 但行程不存在 |
| 200 | — | DeepSeek 失败 / 超时 / 无 Key / schema 不合格 → **降级 Mock，仍 200** |

---

## 6. 校验规则汇总

以下规则适用于所有写入接口（含 AI 入参的最终值）；错误统一 `400` + `VALIDATION_ERROR`。

| 规则 | 说明 |
|------|------|
| 名称类字段 | `Trip.name`、`Trip.destination`、`Spot.name`、`Expense.name`：非空，trim 后长度 **1–50** |
| 备注 | `Trip.note` 选填；若提供建议最长 500；空串推荐存 `null` |
| 金额 | 凡金额字段（`budget` / `estimatedCost` / `amount` 及 AI 中对应字段）必须为 number 且 **`>= 0`**，保留两位小数 |
| 日期先后 | `endDate` **不得早于** `startDate` |
| 日期格式 | 业务日期字段必须为 `YYYY-MM-DD` |
| Spot.type | 必须是：`景点` / `餐饮` / `交通` / `其他` |
| Spot.status | 必须是：`待去` / `已去` |
| Expense.category | 必须是：`交通` / `住宿` / `餐饮` / `门票` / `其他` |
| AI days | 整数，取值 **1–15** |
| 路径 ID | `:id` / `:tripId` 必须能解析为正整数 |
| bulk items | 数组长度 **1–50**；任一项失败则整批失败 |
| 默认值 | `Spot.estimatedCost` 未传 → `0`；`Spot.status` 未传 → `"待去"` |

---

## 7. 契约变更记录

| 时间 | 变更内容 | 原因 | 影响范围 |
|------|----------|------|----------|
| — | （初始为空，v1 冻结后如有变更在此追加） | — | — |

---

## 8. 冻结声明

- **契约版本**：v1  
- **冻结时间**：2026-08-10 16:39（UTC+8）  
- **生效规则**：B / F / A / Q 并行开发必须以本文为唯一事实来源；发现歧义先向 P 提出。  
- **变更门禁**：任何契约变更须由负责人明确指令，由 P 更新本文并填写「契约变更记录」，同步 `AGENT_LOG.md`；不得私下假设或改字段。
