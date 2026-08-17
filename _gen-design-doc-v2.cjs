/**
 * 生成 TripMate Lite《详细设计说明书》v2（暗色强调样式）。
 * 临时脚本：生成后删除，不写入 package.json。
 */
const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  PageBreak,
} = require("docx");

const INK = "0F172A";
const SLATE = "1E293B";
const ACCENT = "38BDF8";
const PAPER = "F8FAFC";
const COL1 = "E2E8F0";
const BODY = "1E293B";
const MUTED = "64748B";
const LINE = "CBD5E1";
const WHITE = "FFFFFF";
const CONTENT = 9026;
const A4W = 11906;
const A4H = 16838;
const FONT = "微软雅黑";

const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const noBorders = { top: none, bottom: none, left: none, right: none };
const noCellMargins = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * @param {string} text
 * @param {object} [o]
 * @returns {TextRun}
 */
function run(text, o = {}) {
  return new TextRun({
    text: text == null ? "" : String(text),
    font: FONT,
    size: o.size ?? 20,
    bold: o.bold ?? false,
    color: o.color ?? BODY,
    italics: o.italics ?? false,
  });
}

/**
 * @param {string|TextRun[]} content
 * @param {object} [o]
 * @returns {Paragraph}
 */
function p(content, o = {}) {
  const children = Array.isArray(content)
    ? content
    : [run(content, { size: o.size, bold: o.bold, color: o.color })];
  return new Paragraph({
    spacing: {
      line: 360,
      lineRule: LineRuleType.AUTO,
      before: o.before ?? 0,
      after: o.after ?? 80,
    },
    alignment: o.align,
    indent: o.indent,
    border: o.border,
    children,
  });
}

/**
 * @param {string} text
 * @param {typeof HeadingLevel[keyof typeof HeadingLevel]} level
 * @param {number} size
 * @returns {Paragraph}
 */
function heading(text, level, size) {
  return new Paragraph({
    heading: level,
    spacing: {
      line: 360,
      lineRule: LineRuleType.AUTO,
      before: 280,
      after: 140,
    },
    children: [run(text, { size, bold: true, color: INK })],
  });
}

/** @param {string} t @returns {Paragraph} */
function h1(t) {
  return heading(t, HeadingLevel.HEADING_1, 32);
}
/** @param {string} t @returns {Paragraph} */
function h2(t) {
  return heading(t, HeadingLevel.HEADING_2, 28);
}
/** @param {string} t @returns {Paragraph} */
function h3(t) {
  return heading(t, HeadingLevel.HEADING_3, 24);
}

/** @param {string} t @returns {Paragraph} */
function label(t) {
  return p(t, { size: 22, bold: true, color: INK, before: 160, after: 80 });
}

/**
 * @param {string[]} lines
 * @returns {Paragraph}
 */
function codePara(lines) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
    spacing: { line: 276, lineRule: LineRuleType.AUTO, before: 40, after: 40 },
    children: [run(lines.join(" "), { size: 16, color: SLATE })],
  });
}

/**
 * @param {string} text
 * @param {object} o
 * @returns {TableCell}
 */
function cell(text, o) {
  const paras = (Array.isArray(text) ? text : [text]).map((line) =>
    new Paragraph({
      spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 40 },
      children: [
        run(line, {
          size: o.size ?? 20,
          bold: o.bold ?? false,
          color: o.color ?? (o.header ? WHITE : BODY),
        }),
      ],
    }),
  );
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    shading: {
      type: ShadingType.CLEAR,
      fill: o.fill ?? WHITE,
    },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    borders,
    columnSpan: o.span,
    children: paras.length ? paras : [p("")],
  });
}

/**
 * @param {string[]} headers
 * @param {(string|string[])[][]} rows
 * @param {number[]} widths
 * @param {object} [opt]
 * @returns {Table}
 */
function grid(headers, rows, widths, opt = {}) {
  const size = opt.size ?? 20;
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      cell(h, {
        w: widths[i],
        fill: SLATE,
        header: true,
        bold: true,
        size,
        color: WHITE,
      }),
    ),
  });
  const body = rows.map((row, ri) => {
    const stripe = ri % 2 === 1 ? "F8FAFC" : WHITE;
    return new TableRow({
      children: row.map((c, i) =>
        cell(c, {
          w: widths[i],
          fill: stripe,
          size,
          valign: VerticalAlign.TOP,
        }),
      ),
    });
  });
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...body],
  });
}

/**
 * 逻辑说明两列表。
 * @param {{ item: string, lines: string[] }[]} rows
 * @returns {Table}
 */
function logicTable(rows) {
  const w1 = 2400;
  const w2 = 6626;
  const header = new TableRow({
    children: [
      cell("项目", { w: w1, fill: SLATE, header: true, bold: true, size: 16 }),
      cell("说明", { w: w2, fill: SLATE, header: true, bold: true, size: 16 }),
    ],
  });
  const body = rows.map((r) => {
    const rightParas = r.lines.map(
      (line) =>
        new Paragraph({
          spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 40 },
          children: [run(line, { size: 16, color: BODY })],
        }),
    );
    return new TableRow({
      children: [
        new TableCell({
          width: { size: w1, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          shading: { type: ShadingType.CLEAR, fill: COL1 },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          borders,
          children: [
            new Paragraph({
              spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 0 },
              children: [run(r.item, { size: 16, bold: true, color: INK })],
            }),
          ],
        }),
        new TableCell({
          width: { size: w2, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          shading: { type: ShadingType.CLEAR, fill: WHITE },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          borders,
          children: rightParas,
        }),
      ],
    });
  });
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [w1, w2],
    rows: [header, ...body],
  });
}

/**
 * @param {string} title
 * @param {string[]} uiLines
 * @param {{ item: string, lines: string[] }[]} logicRows
 * @returns {(Paragraph|Table)[]}
 */
function feature(title, uiLines, logicRows) {
  return [
    h3(title),
    label("【界面】"),
    ...uiLines.map((line) => p(line, { size: 20 })),
    label("【逻辑说明】"),
    logicTable(logicRows),
    p(""),
  ];
}

/**
 * @returns {Table}
 */
function coverTable() {
  const inner = [
    p("TripMate Lite", {
      size: 56,
      bold: true,
      color: PAPER,
      align: AlignmentType.CENTER,
      after: 80,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280, before: 40 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 1 },
      },
      children: [run("详细设计说明书", { size: 32, color: ACCENT })],
    }),
    p("AI 个人旅行助手 MVP", {
      size: 22,
      color: "94A3B8",
      align: AlignmentType.CENTER,
      after: 480,
    }),
    p("部门　　—", { size: 20, color: PAPER, align: AlignmentType.CENTER, after: 60 }),
    p("编写　　caiyonjie", { size: 20, color: PAPER, align: AlignmentType.CENTER, after: 60 }),
    p("日期　　2026-08-17", { size: 20, color: PAPER, align: AlignmentType.CENTER, after: 60 }),
    p("审核　　—", { size: 20, color: PAPER, align: AlignmentType.CENTER, after: 60 }),
    p("批准　　—", { size: 20, color: PAPER, align: AlignmentType.CENTER, after: 60 }),
  ];
  return new Table({
    width: { size: A4W, type: WidthType.DXA },
    columnWidths: [A4W],
    rows: [
      new TableRow({
        height: { value: A4H, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            width: { size: A4W, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, fill: INK },
            borders: noBorders,
            margins: { top: 0, bottom: 0, left: 1440, right: 1440 },
            children: inner,
          }),
        ],
      }),
    ],
  });
}

/**
 * @param {string} fill
 * @param {Paragraph[]} children
 * @returns {Table}
 */
function bar(fill, children) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill },
            borders: noBorders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children,
          }),
        ],
      }),
    ],
  });
}

const header = new Header({
  children: [
    bar(INK, [
      new Paragraph({
        spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 0 },
        children: [
          run("TripMate Lite", { size: 18, bold: true, color: PAPER }),
          run("    详细设计说明书", { size: 18, color: "94A3B8" }),
        ],
      }),
    ]),
  ],
});

const footer = new Footer({
  children: [
    bar(INK, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 0 },
        children: [
          run("", { size: 16, color: PAPER }),
          new TextRun({
            font: FONT,
            size: 16,
            color: PAPER,
            children: [PageNumber.CURRENT],
          }),
        ],
      }),
    ]),
  ],
});

const W4 = [2200, 1600, 2400, 2826];
const W5 = [1800, 1600, 1400, 1800, 2426];
const W8 = [900, 1100, 900, 900, 1100, 1600, 1200, 1326];
const W2 = [2400, 6626];
const W6 = [1400, 1400, 1400, 1400, 1400, 2026];

const children = [
  p("说明：本文档字段、路径、枚举与状态码以 docs/API-CONTRACT.md v1（冻结于 2026-08-10 16:39）为唯一事实来源；若与 PRD 表述冲突，以契约为准。系统无登录鉴权。", {
    size: 20,
    color: MUTED,
    after: 200,
  }),

  h1("1 引言"),
  h2("1.1 编写目的"),
  p("本文档用于详细说明 TripMate Lite 系统的功能模块、业务逻辑、系统流程、数据库模型设计，指导开发人员进行系统搭建及编写代码。"),
  p("预期读者：系统设计者、系统开发员。"),

  h2("1.2 背景"),
  p("短途出行前，用户需要在短时间内把「去哪、玩什么、花多少」整理清楚，而现有旅游平台功能过重（登录、预订、社交、地图），对个人快速规划成本过高。"),
  p("TripMate Lite 面向单用户本地使用，无登录认证。用户在本地 Web 应用中完成「行程 → 景点清单 → 费用记账 → AI 建议」闭环：管理行程（名称、目的地、起止日期、预算、备注），维护景点/活动清单，记录实际费用并与预算对比，并调用 DeepSeek 生成结构化行程建议。"),
  p("Key 缺失或调用失败时自动 Mock 降级，页面以徽章标明来源。产品定位为可演示的 3 小时 MVP，而非完整旅游平台。"),
  p("明确不做：地图导航、支付订单、社交分享、多角色权限、RAG/向量检索、移动端原生。"),

  h2("1.3 参考资料"),
  grid(
    ["文档名称", "版本号", "文件"],
    [
      ["产品需求与规划文档（PRD）", "与仓库同步", "docs/PRD.md"],
      ["API 契约（唯一事实来源）", "v1 已冻结", "docs/API-CONTRACT.md"],
      ["测试说明", "与仓库同步", "TESTING.md"],
      ["项目说明", "与仓库同步", "README.md"],
      ["数据库结构", "与仓库同步", "server/db/schema.sql"],
      ["Agent 协作日志", "与仓库同步", "AGENT_LOG.md"],
    ],
    [3200, 2200, 3626],
  ),

  h2("1.4 专业术语、定义和缩略语"),
  grid(
    ["序号", "专业术语", "描述"],
    [
      ["1", "Mock 降级", "DeepSeek 不可用（无 Key、超时、非 2xx、JSON/schema 失败）时，POST /api/ai/suggest 仍返回 HTTP 200，source 为 mock，并填写 fallbackReason。"],
      ["2", "usageRate", "预算使用率。budget>0 时为 round(totalSpent/budget, 2)，可大于 1；budget 为 0 且无花费为 0，否则为 1。"],
      ["3", "overBudget", "totalSpent > budget 时为 true，前端展示超支警告。"],
      ["4", "snake_case / camelCase", "数据库列名 snake_case；API JSON 一律 camelCase，转换在 repository 层完成。"],
    ],
    [800, 2200, 6026],
  ),

  h1("2 方案架构设计"),
  h2("2.1 应用架构设计"),
  h3("2.1.1 应用集成"),
  p("本系统为单用户本地 MVP，无 OA、SSO、登录鉴权。唯一外部系统为 DeepSeek Chat Completions。"),
  grid(
    ["模块", "功能点", "交互方式", "方向", "外部应用", "外部功能名称/描述", "备注", "接口地址"],
    [
      [
        "AI 行程助手",
        "生成行程建议",
        "HTTPS JSON",
        "本系统→外部",
        "DeepSeek",
        "Chat Completions 生成结构化行程 JSON",
        "失败 Mock 降级，业务接口仍 200；不写 Key",
        "POST {DEEPSEEK_BASE_URL}/chat/completions",
      ],
    ],
    W8,
    { size: 16 },
  ),

  h2("2.2 数据架构设计"),
  h3("2.2.1 数据结构设计"),
  p("以下字段名同时给出库列（snake_case）与 API（camelCase）。金额 API 为 number，库列为 NUMERIC(10,2)。日期 API 为 YYYY-MM-DD 字符串。"),
  label("行程表（trips）"),
  grid(
    ["字段名", "类型", "约束", "说明"],
    [
      ["id / id", "SERIAL / number", "主键", "服务端生成"],
      ["name / name", "TEXT / string", "NOT NULL，API 1–50", "行程名称"],
      ["destination / destination", "TEXT / string", "NOT NULL，API 1–50", "目的地"],
      ["start_date / startDate", "DATE / YYYY-MM-DD", "NOT NULL", "开始日期"],
      ["end_date / endDate", "DATE / YYYY-MM-DD", "NOT NULL；CHECK end_date >= start_date", "结束日期"],
      ["budget / budget", "NUMERIC(10,2) / number", "NOT NULL DEFAULT 0；CHECK >= 0", "总预算，单位元"],
      ["note / note", "TEXT / string|null", "可空；API 0–500", "备注；空串存 null"],
      ["created_at / createdAt", "TIMESTAMPTZ / ISO 8601", "NOT NULL DEFAULT now()", "创建时间，更新不改变"],
    ],
    W4,
  ),
  label("景点/活动清单表（spots）"),
  grid(
    ["字段名", "类型", "约束", "说明"],
    [
      ["id / id", "SERIAL / number", "主键", "服务端生成"],
      ["trip_id / tripId", "INTEGER / number", "NOT NULL，FK → trips(id) ON DELETE CASCADE", "所属行程"],
      ["name / name", "TEXT / string", "NOT NULL，API 1–50", "清单项名称"],
      ["type / type", "TEXT / string", "CHECK IN 景点/餐饮/交通/其他", "类型枚举"],
      ["estimated_cost / estimatedCost", "NUMERIC(10,2) / number", "DEFAULT 0", "预计花费；未传入库为 0"],
      ["status / status", "TEXT / string", "NOT NULL DEFAULT 待去；CHECK 待去/已去", "状态枚举"],
      ["created_at / createdAt", "TIMESTAMPTZ / ISO 8601", "NOT NULL DEFAULT now()", "创建时间"],
    ],
    W4,
  ),
  label("费用记录表（expenses）"),
  grid(
    ["字段名", "类型", "约束", "说明"],
    [
      ["id / id", "SERIAL / number", "主键", "服务端生成"],
      ["trip_id / tripId", "INTEGER / number", "NOT NULL，FK → trips(id) ON DELETE CASCADE", "所属行程"],
      ["name / name", "TEXT / string", "NOT NULL，API 1–50", "费用名称"],
      ["amount / amount", "NUMERIC(10,2) / number", "NOT NULL；CHECK >= 0", "金额，单位元"],
      ["category / category", "TEXT / string", "CHECK IN 交通/住宿/餐饮/门票/其他", "分类枚举"],
      ["spend_date / spendDate", "DATE / YYYY-MM-DD", "NOT NULL", "发生日期"],
      ["created_at / createdAt", "TIMESTAMPTZ / ISO 8601", "NOT NULL DEFAULT now()", "创建时间"],
    ],
    W4,
  ),
  p("费用模块无更新接口：改一笔费用 = 删除旧记录 + 新建新记录。"),

  h3("2.2.2 数据关系图"),
  grid(
    ["父实体", "关系", "子实体", "约束"],
    [
      ["trips（行程）", "1:N", "spots（景点/活动）", "trip_id 外键，ON DELETE CASCADE；索引 idx_spots_trip_id"],
      ["trips（行程）", "1:N", "expenses（费用）", "trip_id 外键，ON DELETE CASCADE；索引 idx_expenses_trip_id"],
    ],
    [2200, 1200, 2400, 3226],
  ),
  p("基数说明：一个行程拥有多条景点清单与多条费用记录；景点与费用之间无直接外键。删除行程时，数据库级联删除其下全部 spots 与 expenses。"),

  h3("2.2.3 数据分布"),
  p("数据全部存放在本机 PostgreSQL 单实例中，无缓存、无对象存储、无多库分片。"),
  p("开发库名：tripmate（DATABASE_URL）。测试库名：tripmate_test（TEST_DATABASE_URL）；自动化测试 NODE_ENV=test 时切换，禁止读写开发库。"),
  p("前端无持久化（无 Pinia、无 localStorage 业务数据）。AI 建议结果仅驻留当前页面内存，导入成功后才写入 spots 表。"),

  h3("2.2.4 系统业务描述"),
  p("主路径："),
  p("1. 打开 Vite 开发页（默认 5173），进入行程列表 /trips。"),
  p("2. 新建行程（名称、目的地、起止日期、预算、可选备注），列表按创建时间倒序展示。"),
  p("3. 进入行程详情，并行加载行程、景点、费用与预算汇总。"),
  p("4. 在「景点 / 活动」Tab 添加清单项，可用开关将状态改为已去。"),
  p("5. 在「费用记录」Tab 记一笔，查看合计与预算进度；超支或使用率 ≥ 0.8 时告警。"),
  p("6. 打开 AI 助手，填写或从已有行程预填目的地/天数/预算，生成建议。"),
  p("7. 真调 DeepSeek 或 Mock 降级后，可勾选条目一键导入为景点清单（事务批量写入）。"),
  p("8. 删除行程时二次确认，数据库级联删除景点与费用。"),
  p("不做：地图导航、支付订单、社交分享、多角色权限、RAG/向量检索、移动端原生。"),

  h2("2.3 技术架构设计"),
  h3("2.3.1 技术选型总览"),
  grid(
    ["分类", "技术组件"],
    [
      ["运行时", "Node.js >= 18（本仓库验证 22.x）"],
      ["服务框架", "Express ^4.21.0（禁止 5.x），ESM"],
      ["数据存储", "PostgreSQL >= 14（验证 18.x）+ 原生 pg ^8.13.1，无 ORM"],
      ["前端", "Vue 3 ^3.4 + Vite ^6.0.7 + Vue Router ^4.5 + Element Plus ^2.9.3 全量引入"],
      ["HTTP 客户端", "axios ^1.7.9；全局 20s，AI 请求 25s"],
      ["外部 AI", "DeepSeek Chat Completions（fetch）；失败 Mock"],
      ["环境变量", "dotenv ^16.4.7，独立 env.js 最先加载"],
      ["测试", "Vitest ^3.0.5 + Supertest ^7.0.0"],
      ["鉴权 / CORS", "无。开发期 Vite proxy 同源转发 /api，未安装 cors"],
    ],
    [2400, 6626],
  ),

  h3("2.3.2 技术架构设计"),
  p("分层：浏览器 → 前端应用（Vue 3，Vite 5173）→ 开发代理（Vite proxy，将 /api 原路径转发到 http://localhost:3000，无 rewrite）→ API 服务（Express 3000）→ 数据库 PostgreSQL（tripmate / tripmate_test）与外部 DeepSeek。"),
  p("鉴权：无。单用户本地 MVP，不要求 Token / Cookie；赛后若公网部署须另补鉴权与限流，当前阶段禁止自行实现。"),
  p("成功响应直接返回资源对象或数组，不包裹 { data: ... } envelope。失败响应全局约定如下（后文功能点写「失败体见全局约定」）："),
  codePara([
    '{ "error": { "code": "VALIDATION_ERROR", "message": "行程名称不能为空" } }',
  ]),
  p("error.code 取值：VALIDATION_ERROR（400）、NOT_FOUND（404）、INTERNAL_ERROR（500）。例外：POST /api/ai/suggest 在真调或 Mock 降级时一律返回 200，不得因 DeepSeek 失败返回 5xx。"),
  p("金额：repository 层四舍五入到分；db.js 将 NUMERIC OID 1700 解析为 JS number。日期：DATE OID 1082 保持 YYYY-MM-DD 字符串，避免 UTC+8 少一天。"),
  p("路由挂载顺序：先挂 /api/trips/:tripId/spots|expenses|summary，再挂 /api/trips，避免 :id 误匹配嵌套路径。登录、OA、K8s、权限：无。"),

  h3("2.3.3 技术组件清单"),
  grid(
    ["组件名称", "描述", "使用备注"],
    [
      ["Express", "HTTP API", "^4.21；禁止 5.x"],
      ["pg", "PostgreSQL 驱动", "参数化 SQL；类型解析 NUMERIC/DATE"],
      ["dotenv + env.js", "环境变量", "须在 db.js 之前 import"],
      ["Vue 3", "前端框架", "JavaScript，禁止 TypeScript"],
      ["Vite", "开发构建与 /api 代理", "端口 5173"],
      ["Element Plus", "UI 组件库", "全量引入，禁止按需插件"],
      ["vue-router", "前端路由", "/trips、/trips/:id、/assistant"],
      ["axios", "调用 /api", "错误拦截提示"],
      ["DeepSeek", "行程建议生成", "response_format json_object；超时默认 15s"],
      ["Vitest / Supertest", "API 集成测试", "跑在 tripmate_test"],
    ],
    [2200, 2800, 4026],
  ),

  h2("2.4 部署架构设计"),
  h3("2.4.1 服务划分"),
  grid(
    ["服务名", "服务描述"],
    [
      ["client（Vite）", "Vue 3 前端；开发态 5173，proxy /api → localhost:3000"],
      ["server（Express）", "REST API；默认 PORT=3000；GET /api/health"],
      ["PostgreSQL", "开发库 tripmate、测试库 tripmate_test；本机实例"],
    ],
    [2400, 6626],
  ),

  h3("2.4.2 部署要求"),
  grid(
    ["运行服务", "节点数", "内存", "CPU", "网络", "部署环境"],
    [
      ["client Vite", "1", "本机开发，无强制配额", "本机开发，无强制配额", "本机 loopback", "本机开发"],
      ["server Express", "1", "本机开发，无强制配额", "本机开发，无强制配额", "本机 3000；出网访问 DeepSeek（可选）", "本机开发"],
      ["PostgreSQL", "1", "本机开发，无强制配额", "本机开发，无强制配额", "本机 5432", "本机开发"],
    ],
    W6,
    { size: 16 },
  ),

  h1("3 功能模块详细设计"),
  p("模块按真实页面划分。每个功能点含【界面】文字描述（无截图）与一张【逻辑说明】表。角色均为本地单用户（无登录）。"),

  h2("3.1 功能：行程列表"),
  p("对应路由 /trips，组件 client/src/views/TripList.vue。顶栏导航「行程列表」高亮。"),

  ...feature("3.1.1 行程列表展示", [
    "页面顶部左侧标题「我的行程」，副文案「规划旅行、管理预算，从这里开始」；右侧为新建按钮（见 3.1.2）。",
    "有数据时以卡片网格展示行程（自适应列，最小约 260px）；卡片右上角有编辑、删除圆形按钮（见 3.1.2 / 3.1.3），点击卡片进入 /trips/:id。",
    "无数据且非加载中时展示空态：「还没有行程，点击右上角创建你的第一次旅行」。加载中整页 v-loading。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["按创建时间倒序展示全部行程卡片，点击进入详情。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【名称】：卡片标题，点击卡片跳转 /trips/:id；",
        "【目的地】：绿色高亮展示；",
        "【日期区间】：startDate ~ endDate；",
        "【预算】：formatMoney，¥ + 千分位 + 两位小数；",
        "空态文案：还没有行程，点击右上角创建你的第一次旅行。",
      ],
    },
    { item: "按钮", lines: ["无（本功能点不含工具栏与行内按钮；新建/编辑/删除见后续功能点）。"] },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：GET /api/trips",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【列表】",
        "接口路径：/api/trips",
        "方法：GET",
        "逻辑：",
        "查询行程表（trips）全部行；",
        "按创建时间（created_at）倒序；",
        "repository 将 snake_case 映射为 camelCase，DATE 格式化为 YYYY-MM-DD，budget 四舍五入到分；",
        "空列表返回 []；失败体见全局约定。",
      ],
    },
    { item: "关联表", lines: ["trips"] },
  ]),

  ...feature("3.1.2 新建与编辑行程", [
    "工具栏「+ 新建行程」打开对话框，标题「新建行程」；卡片右上角编辑按钮阻止冒泡，打开同结构对话框，标题「编辑行程」并预填现有值。",
    "对话框宽度 520px，表单标签宽 88px，页脚「取消」「保存」。关闭时重置表单。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["通过同一对话框创建或全量更新行程。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【名称】：输入框，必填，1–50 字符，字数统计，占位「例如：周末青岛两日游」；",
        "【目的地】：输入框，必填，1–50 字符，占位「例如：青岛」；",
        "【日期区间】：日期范围选择器，分隔符「至」，value-format 为 YYYY-MM-DD，必填；",
        "【预算】：数字输入框，最小值 0，precision 2，步长 100，必填；",
        "【备注】：多行输入框，0–500，可选，占位「可选」，空串提交为 null；",
      ],
    },
    {
      item: "按钮",
      lines: [
        "【+ 新建行程】：打开空白对话框。",
        "【编辑】：圆形按钮，阻止冒泡，预填后打开对话框。",
        "【取消】：关闭对话框并重置。",
        "【保存】：校验失败停留并提示（请输入行程名称 / 名称长度为 1–50 个字符 / 请输入目的地 / 请选择日期区间 / 请输入预算 / 预算不能小于 0）；通过后新建提示「创建成功」，编辑提示「更新成功」，然后刷新列表。",
      ],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：POST /api/trips；PUT /api/trips/:id",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【新增】",
        "接口路径：/api/trips",
        "方法：POST",
        "逻辑：",
        "校验 name、destination trim 后长度 1–50，startDate/endDate 为 YYYY-MM-DD 且 endDate 不得早于 startDate，budget >= 0；note 可选，空串存 null；",
        "插入行程表（trips）的 name、destination、start_date、end_date、budget、note；",
        "budget 四舍五入到分；created_at 由数据库 now() 生成；",
        "返回 201 与映射后的 Trip；失败体见全局约定。",
        "【修改】",
        "接口路径：/api/trips/:id",
        "方法：PUT",
        "逻辑：",
        "路径 id 须为正整数，否则 400 VALIDATION_ERROR；",
        "按主键（id）查询行程表（trips），不存在则 404 NOT_FOUND；",
        "请求体校验规则与创建相同，全量更新可写字段；created_at 不变；",
        "返回 200 与更新后的完整 Trip；失败体见全局约定。",
      ],
    },
    { item: "关联表", lines: ["trips"] },
  ]),

  ...feature("3.1.3 删除行程", [
    "卡片右上角红色删除圆形按钮，点击阻止冒泡。弹出警告确认框，标题「删除确认」。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["删除行程并级联删除其下景点与费用。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【名称】：确认文案中回显行程名称；",
      ],
    },
    {
      item: "按钮",
      lines: [
        "【删除】（卡片）：打开确认框。",
        "【删除】（确认框）：文案「确定删除「{name}」吗？将同时删除该行程下的所有景点与费用记录。」确认后调用删除接口，成功提示「删除成功」并刷新列表。",
        "【取消】：关闭确认框，不请求接口。",
      ],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：DELETE /api/trips/:id",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【删除】",
        "接口路径：/api/trips/:id",
        "方法：DELETE",
        "逻辑：",
        "路径 id 须为正整数，否则 400 VALIDATION_ERROR；",
        "按主键（id）删除行程表（trips）对应行；不存在则 404 NOT_FOUND；",
        "数据库外键 ON DELETE CASCADE 同时删除景点表（spots）与费用表（expenses）中 trip_id 匹配的行；",
        "成功返回 204，无响应体；失败体见全局约定。",
      ],
    },
    { item: "关联表", lines: ["trips, spots, expenses"] },
  ]),

  h2("3.2 功能：行程详情"),
  p("对应路由 /trips/:id，组件 client/src/views/TripDetail.vue。进入时 Promise.all 并行请求行程、景点、费用、汇总。"),

  ...feature("3.2.1 行程信息与预算概览", [
    "行程不存在时整页空态：「未找到该行程」。",
    "头部面板：链接「← 返回列表」回到 /trips；展示名称、目的地、日期区间、天数（含首尾，前端 calcTripDays）、预算；有备注时显示「备注：…」。",
    "预算概览面板：overBudget 时橙色警告「已超出预算 ¥X.XX，请注意控制开支」；未超支且 usageRate >= 0.8 时「预算即将用完」。三栏展示预算 / 已花费 / 剩余（超支时剩余红色）。使用率进度条：超支 exception（红），即将用完 warning（橙），否则 success。有消费时按分类展示 Tag「{category} ¥amount」；否则「暂无分类消费」。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["展示单行程基本信息，并按费用汇总对比预算。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【名称】：行程名称；",
        "【目的地】：绿色高亮；",
        "【日期】：startDate ~ endDate；",
        "【天数】：含首尾的日历天数；",
        "【预算】：formatMoney；",
        "【备注】：有则展示；",
        "【已花费】：summary.totalSpent；",
        "【剩余】：summary.remaining，超支红色；",
        "【使用率】：进度条，百分比为 usageRate×100；",
        "【分类汇总】：byCategory 的 category 与 amount Tag；",
      ],
    },
    {
      item: "按钮",
      lines: ["【← 返回列表】：路由跳转 /trips。"],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：GET /api/trips/:id；GET /api/trips/:tripId/summary",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【详情】",
        "接口路径：/api/trips/:id",
        "方法：GET",
        "逻辑：",
        "路径 id 须为正整数，否则 400 VALIDATION_ERROR；",
        "按主键（id）查询行程表（trips）；",
        "不存在则 404 NOT_FOUND；",
        "映射 camelCase 后返回 200 Trip；失败体见全局约定。",
        "【汇总】",
        "接口路径：/api/trips/:tripId/summary",
        "方法：GET",
        "逻辑：",
        "路径 tripId 须为正整数；先按主键查询行程表（trips）的 id、budget，不存在则 404；",
        "按 trip_id 聚合费用表（expenses）：GROUP BY category，SUM(amount)、COUNT(*)；",
        "byCategory 仅含有消费的分类，按 amount 倒序；",
        "totalSpent 为各分类 amount 之和；remaining = budget - totalSpent（可为负）；overBudget = totalSpent > budget；",
        "usageRate：budget>0 时 round(totalSpent/budget, 2)；budget 为 0 且 totalSpent 为 0 则为 0，否则为 1；",
        "NUMERIC 经 db.js 解析为 number；失败体见全局约定。",
      ],
    },
    { item: "关联表", lines: ["trips, expenses"] },
  ]),

  ...feature("3.2.2 景点清单", [
    "详情页 Tab「景点 / 活动」。工具栏右侧「+ 添加景点」。无数据时空态：「还没有景点，添加第一个活动吧」。",
    "有数据时表格：名称、类型（Tag）、预计花费、状态（Switch：待去/已去，即时 PATCH，失败回滚）、操作删除。已去行灰色样式 spot-row--done。",
    "添加对话框标题「添加景点」，宽度 480px。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["维护行程下的景点/活动清单，支持新增、状态切换与删除。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【名称】：表格列 / 对话框输入框，必填 1–50；",
        "【类型】：Tag 展示；对话框下拉框，枚举 景点/餐饮/交通/其他，默认景点；",
        "【预计花费】：formatMoney；对话框数字输入，≥0，precision 2，默认 0；",
        "【状态】：开关，active 已去 / inactive 待去；对话框下拉，默认待去；",
        "空态文案：还没有景点，添加第一个活动吧。",
      ],
    },
    {
      item: "按钮",
      lines: [
        "【+ 添加景点】：打开对话框。",
        "【取消】：关闭添加对话框。",
        "【保存】：校验失败提示请输入名称 / 名称长度为 1–50 个字符 / 请选择类型 / 请输入预计花费 / 预计花费不能小于 0 / 请选择状态；成功提示「添加成功」并刷新景点列表。",
        "【状态开关】：PATCH 仅提交 status；成功提示「状态已更新」；失败将开关回滚。",
        "【删除】：确认「确定删除景点「{name}」吗？」，成功提示「删除成功」。",
      ],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：GET /api/trips/:tripId/spots；POST /api/trips/:tripId/spots；PATCH /api/spots/:id；DELETE /api/spots/:id",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【列表】",
        "接口路径：/api/trips/:tripId/spots",
        "方法：GET",
        "逻辑：",
        "校验行程存在，否则 404；",
        "查询景点表（spots），绑定行程 ID（trip_id），按创建时间（created_at）升序；",
        "空列表返回 []；失败体见全局约定。",
        "【新增】",
        "接口路径：/api/trips/:tripId/spots",
        "方法：POST",
        "逻辑：",
        "校验行程存在；name 1–50，type 为景点/餐饮/交通/其他，status 为待去/已去（默认待去），estimatedCost 未传为 0 且 >= 0；",
        "插入景点表（spots）的 trip_id、name、type、estimated_cost、status；",
        "返回 201 Spot；失败体见全局约定。",
        "【修改】",
        "接口路径：/api/spots/:id",
        "方法：PATCH",
        "逻辑：",
        "按主键（id）查询景点表（spots），不存在则 404；",
        "仅更新传入白名单字段（name/type/estimatedCost/status），禁止用请求体 key 直接拼 SQL；",
        "前端本功能点只传 status；返回更新后的 Spot；失败体见全局约定。",
        "【删除】",
        "接口路径：/api/spots/:id",
        "方法：DELETE",
        "逻辑：",
        "按主键（id）删除景点表（spots）；不存在则 404；成功 204。",
      ],
    },
    { item: "关联表", lines: ["spots, trips"] },
  ]),

  ...feature("3.2.3 费用记录", [
    "详情页 Tab「费用记录」。工具栏「+ 记一笔」。无数据时空态：「还没有费用记录」。",
    "有数据时表格：费用名称、类别 Tag、金额、发生日期、操作删除；show-summary 合计行在金额列本地求和。无编辑入口（改费用 = 删旧建新）。",
    "记一笔对话框宽度 480px，发生日期默认当天 YYYY-MM-DD。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["新增与删除实际费用，并刷新预算汇总。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【费用名称】：表格列 / 对话框输入框，必填 1–50；",
        "【类别】：Tag；对话框下拉，枚举 交通/住宿/餐饮/门票/其他，默认交通；",
        "【金额】：formatMoney；对话框数字输入 ≥0，precision 2；合计行本地 number 相加；",
        "【发生日期】：YYYY-MM-DD；对话框日期选择器，默认 todayYmd()；",
        "空态文案：还没有费用记录。",
      ],
    },
    {
      item: "按钮",
      lines: [
        "【+ 记一笔】：打开对话框。",
        "【取消】：关闭对话框。",
        "【保存】：校验失败提示请输入费用名称 / 名称长度为 1–50 个字符 / 请输入金额 / 金额不能小于 0 / 请选择类别 / 请选择发生日期；成功提示「记账成功」，并刷新费用列表与 summary。",
        "【删除】：确认「确定删除费用「{name}」吗？」，成功后同步刷新汇总。",
      ],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：GET /api/trips/:tripId/expenses；POST /api/trips/:tripId/expenses；DELETE /api/expenses/:id",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【列表】",
        "接口路径：/api/trips/:tripId/expenses",
        "方法：GET",
        "逻辑：",
        "校验行程存在，否则 404；",
        "查询费用表（expenses），绑定行程 ID（trip_id），按发生日期（spend_date）倒序，同日再按创建时间（created_at）倒序；",
        "空列表返回 []；失败体见全局约定。",
        "【新增】",
        "接口路径：/api/trips/:tripId/expenses",
        "方法：POST",
        "逻辑：",
        "校验行程存在；name 1–50，amount >= 0，category 为交通/住宿/餐饮/门票/其他，spendDate 为 YYYY-MM-DD；",
        "插入费用表（expenses）的 trip_id、name、amount、category、spend_date，amount 四舍五入到分；",
        "返回 201 Expense；无 PUT/PATCH；失败体见全局约定。",
        "【删除】",
        "接口路径：/api/expenses/:id",
        "方法：DELETE",
        "逻辑：",
        "按主键（id）删除费用表（expenses）；不存在则 404；成功 204。",
      ],
    },
    { item: "关联表", lines: ["expenses, trips"] },
  ]),

  h2("3.3 功能：AI 行程助手"),
  p("对应路由 /assistant，组件 client/src/views/Assistant.vue。顶栏导航「AI 助手」高亮。"),

  ...feature("3.3.1 生成行程建议", [
    "上方面板标题「AI 行程助手」，说明「填写目的地与预算，一键生成可落地的行程草案」。",
    "表单：可选「从已有行程带入」（可搜索、可清除）；目的地；出行天数 1–15；预算。提交时仍以表单字段为准，tripId 仅作补齐。",
    "生成中展示 Skeleton 与「正在调用 DeepSeek 生成建议，通常需要 10-20 秒」。网络/400/404 用 el-result「生成失败」可重试（Mock 降级不算错误）。未生成时空态：「填写上方表单，点击「生成行程建议」开始规划」。",
    "成功后：source=deepseek 绿色徽章「DeepSeek 真实调用」；否则橙色「Mock 降级」并展示 fallbackReason；显示 generatedAt、summary、每日 Timeline（time/name/type/estimatedCost/note）、预算分配进度条、tips 列表。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["按目的地、天数、预算生成结构化行程建议，失败自动 Mock 降级。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "<从已有行程带入>：下拉框，可清除，可过滤查询，选择后预填目的地/天数/预算，提交仍以表单为准",
        "<目的地>：输入框，必填，1–50",
        "<出行天数>：数字输入框，整数 1–15，必填",
        "<预算>：数字输入框，≥0，precision 2，必填",
        "显示字段：",
        "【来源】：徽章 DeepSeek 真实调用 或 Mock 降级；",
        "【fallbackReason】：降级时中文原因；",
        "【generatedAt】：本地格式化时间；",
        "【summary】：总述；",
        "【每日安排】：Timeline，项含 time、name、type Tag、estimatedCost、note；",
        "【预算分配】：category、amount、percent 进度条、note；",
        "【旅行贴士】：tips 列表，至少 3 条（契约口径）；",
      ],
    },
    {
      item: "按钮",
      lines: [
        "【生成行程建议】：loading 文案「AI 正在规划中…」；前端校验失败提示请输入目的地 / 目的地长度为 1–50 个字符 / 请输入出行天数 / 天数须为 1–15 的整数 / 请输入预算 / 预算不能小于 0。",
        "【重试】：仅参数或网络错误时出现，再次提交。",
      ],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：GET /api/trips；POST /api/ai/suggest",
        "【修改旧接口】：无",
        "【调用第三方接口】：POST {DEEPSEEK_BASE_URL}/chat/completions",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【列表】",
        "接口路径：/api/trips",
        "方法：GET",
        "逻辑：",
        "查询行程表（trips），按 created_at 倒序，供下拉预填；失败则前端下拉为空。",
        "【生成建议】",
        "接口路径：/api/ai/suggest",
        "方法：POST",
        "逻辑：",
        "显式提供的 destination/days/budget 优先于 tripId；tripId 仅补齐缺失项：从行程表（trips）读 destination、budget，days = end_date - start_date + 1；",
        "tripId 对应行程不存在则 404（发生在调模型之前）；补齐后仍缺字段或 days 不在 1–15 则 400；",
        "调用编排层：先 DeepSeek，捕获一切模型错误后 Mock；本接口成功一律 200；",
        "回显 input 与 generatedAt；source 为 deepseek 或 mock；失败体见全局约定（仅参数/资源错误）。",
        "【DeepSeek 真调】",
        "接口路径：{DEEPSEEK_BASE_URL}/chat/completions",
        "方法：POST",
        "逻辑：",
        "Authorization Bearer 来自环境变量，文档不写 Key；response_format 为 json_object，temperature 0.7，max_tokens 4096，超时默认 15000ms；",
        "无 Key、超时、HTTP 非 2xx（含 429）、JSON 解析失败、schema 失败（含 tips.length < 3、days.length !== input.days）则降级；",
        "Mock 生成与 destination/days/budget 相关的同构 data，并填写中文 fallbackReason。",
      ],
    },
    { item: "关联表", lines: ["trips（仅 tripId 补齐时读取）；建议结果不落库"] },
  ]),

  ...feature("3.3.2 一键导入景点清单", [
    "建议结果工具栏按钮「一键导入为景点清单」打开对话框。选择目标行程，勾选展平后的 days[].items（默认全选），展示「第N天 · 时段 · 名称」与类型 Tag。",
    "确认后映射 name/type/estimatedCost，status 固定「待去」，忽略 AI 的 time 与 note。成功 Message 含「查看行程详情」链接跳转 /trips/:id。",
  ], [
    { item: "角色", lines: ["本地单用户（无登录）"] },
    { item: "功能简介", lines: ["将 AI 建议中的活动批量写入目标行程的景点清单。"] },
    {
      item: "前端页面及交互说明",
      lines: [
        "筛选项：",
        "无",
        "显示字段：",
        "【导入到行程】：下拉框，可过滤，必选；",
        "【选择条目】：复选框组，默认全选，展示第N天、time、name、type；",
      ],
    },
    {
      item: "按钮",
      lines: [
        "【一键导入为景点清单】：打开对话框，默认勾选全部条目，预填当前选中行程。",
        "【取消】：关闭对话框。",
        "【确认导入】：未选行程提示「请选择要导入到的行程」；未勾选提示「请至少勾选一个条目」；成功提示「已导入 N 个景点」并可跳转详情。",
      ],
    },
    {
      item: "接口设计",
      lines: [
        "【新增接口】：无",
        "【调用旧接口】：GET /api/trips；POST /api/trips/:tripId/spots/bulk",
        "【修改旧接口】：无",
        "【调用第三方接口】：无",
      ],
    },
    {
      item: "后端逻辑",
      lines: [
        "【列表】",
        "接口路径：/api/trips",
        "方法：GET",
        "逻辑：",
        "查询行程表（trips）供导入目标下拉，按 created_at 倒序。",
        "【批量导入】",
        "接口路径：/api/trips/:tripId/spots/bulk",
        "方法：POST",
        "逻辑：",
        "校验行程存在，否则 404；items 长度 1–50，每项校验同单条创建；任一项失败则整批 400，不做部分写入；",
        "开启事务 BEGIN，逐条插入景点表（spots）的 trip_id、name、type、estimated_cost、status；",
        "任一条失败 ROLLBACK，全部成功 COMMIT；",
        "返回 201 Spot[]（创建顺序）；AI 的 time/note 不入库；失败体见全局约定。",
      ],
    },
    { item: "关联表", lines: ["spots, trips"] },
  ]),

  h1("4 设计与实现上的难点"),
  grid(
    ["难点", "影响", "处理方式"],
    [
      ["pg NUMERIC 默认返回 string", "费用合计字符串拼接或 NaN", "db.js types.setTypeParser(OID 1700, parseFloat)；测试 E-01 断言 typeof number"],
      ["DATE 经 JS Date 在 UTC+8 少一天", "startDate/endDate 回读偏移", "OID 1082 保持 YYYY-MM-DD 字符串；repo 避免 Date+getUTC*"],
      ["ESM 下 dotenv 加载过晚", "DATABASE_URL undefined，SASL 报错", "独立 server/src/env.js，在 db.js/index.js 首行 import"],
      ["AI 失败若返回 5xx", "助手页白屏或不可用", "编排层捕获模型错误，一律 200 + mock + fallbackReason"],
      ["删除行程残留子表", "spots/expenses 孤儿行", "FK ON DELETE CASCADE；确认文案明示级联"],
      ["Windows psql GBK", "schema 中文 CHECK 失败", "SET client_encoding UTF8；脚本 PGCLIENTENCODING=UTF8"],
      ["Express :id 抢先匹配嵌套路径", "spots/expenses/summary 404", "先挂 :tripId/spots|expenses|summary，再挂 /api/trips"],
      ["bulk 部分写入", "导入半途脏数据", "createSpotsBulk 使用 BEGIN/COMMIT/ROLLBACK"],
      ["tripId 覆盖用户已改表单", "预填后修改无效", "契约：显式字段优先，tripId 只补齐缺失项"],
      ["费用无编辑接口", "评审误判功能缺失", "PRD/契约写明改费用=DELETE+POST；前端无编辑按钮"],
    ],
    [2400, 2400, 4226],
    { size: 16 },
  ),

  h1("5 开发时间表"),
  p("下表按 AGENT_LOG.md 已发生阶段整理，备注标明「按仓库记录整理」。不写岗位人数。MVP 时间盒约 180 分钟（2026-08-10 16:36–17:36）。"),
  grid(
    ["工作计划内容", "计划开始时间", "计划完成时间", "人天", "备注"],
    [
      ["规划：PRD", "2026-08-10", "2026-08-10", "0.05", "16:36；按仓库记录整理"],
      ["规划：API 契约冻结 v1", "2026-08-10", "2026-08-10", "0.05", "16:37–16:39；门禁后再并行"],
      ["后端：schema / 行程 / 景点 / 费用 API", "2026-08-10", "2026-08-10", "0.15", "16:45 起，与前端并行"],
      ["前端：布局、行程列表与详情、费用与景点 UI", "2026-08-10", "2026-08-10", "0.15", "16:50 起，与后端并行"],
      ["AI：DeepSeek + Mock 降级与 Assistant 页", "2026-08-10", "2026-08-10", "0.08", "约 17:20–17:25"],
      ["测试：Vitest/Supertest 与 TESTING.md", "2026-08-10", "2026-08-10", "0.08", "约 17:28–17:35"],
      ["交付：README 与 AGENT_LOG 整理", "2026-08-10", "2026-08-10", "0.04", "17:36；按仓库记录整理"],
      ["详细设计说明书 v1", "—", "—", "0.20", "仓库记录 14:42；按仓库记录整理"],
      ["详细设计说明书 v2（本文档）", "2026-08-17", "2026-08-17", "0.25", "暗色强调样式；不覆盖 v1"],
    ],
    [2600, 1600, 1600, 800, 2426],
    { size: 16 },
  ),
];

const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 20, color: BODY },
        paragraph: {
          spacing: { line: 360, lineRule: LineRuleType.AUTO },
        },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        run: { font: FONT, size: 32, bold: true, color: INK },
        paragraph: {
          spacing: { before: 360, after: 160, line: 360, lineRule: LineRuleType.AUTO },
          outlineLevel: 0,
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        run: { font: FONT, size: 28, bold: true, color: INK },
        paragraph: {
          spacing: { before: 280, after: 120, line: 360, lineRule: LineRuleType.AUTO },
          outlineLevel: 1,
        },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickStyle: true,
        run: { font: FONT, size: 24, bold: true, color: INK },
        paragraph: {
          spacing: { before: 240, after: 100, line: 360, lineRule: LineRuleType.AUTO },
          outlineLevel: 2,
        },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: A4W, height: A4H },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      children: [coverTable()],
    },
    {
      properties: {
        page: {
          size: { width: A4W, height: A4H },
          margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
        },
      },
      headers: { default: header },
      footers: { default: footer },
      children: [
        p("版本记录", { size: 32, bold: true, color: INK, after: 200 }),
        grid(
          ["日期", "版本", "变更说明", "作者"],
          [["2026-08-17", "v2", "按仓库现状重写，采用暗色强调样式", "caiyonjie"]],
          [1800, 1200, 4026, 2000],
        ),
        new Paragraph({ children: [new PageBreak()] }),
        p("目录", { size: 32, bold: true, color: INK, after: 200 }),
        new TableOfContents("目录", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({ children: [new PageBreak()] }),
        ...children,
      ],
    },
  ],
});

const out = path.join(__dirname, "docs", "详细设计文档v2.docx");

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log("wrote", out, "bytes", buf.length);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
