-- TripMate Lite 数据库 schema
-- 可重复执行：先删后建，保证演示与本地重置一致
-- Windows 下 psql 默认客户端编码常为 GBK，须先切 UTF8 再读含中文的脚本
SET client_encoding TO 'UTF8';

DROP TABLE IF EXISTS expenses, spots, trips CASCADE;

-- ---------------------------------------------------------------------------
-- trips：行程主表
-- ---------------------------------------------------------------------------
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC(10, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trips_end_date_gte_start_date CHECK (end_date >= start_date),
  CONSTRAINT trips_budget_non_negative CHECK (budget >= 0)
);

COMMENT ON TABLE trips IS '行程主表：一次旅行的基本信息与总预算';
COMMENT ON COLUMN trips.id IS '主键，自增';
COMMENT ON COLUMN trips.name IS '行程名称';
COMMENT ON COLUMN trips.destination IS '目的地';
COMMENT ON COLUMN trips.start_date IS '开始日期（YYYY-MM-DD）';
COMMENT ON COLUMN trips.end_date IS '结束日期，须 >= start_date';
COMMENT ON COLUMN trips.budget IS '总预算金额，单位元，须 >= 0';
COMMENT ON COLUMN trips.note IS '备注；未传可为 NULL';
COMMENT ON COLUMN trips.created_at IS '创建时间（服务端生成）';

-- ---------------------------------------------------------------------------
-- spots：景点/活动清单项（归属某行程）
-- ---------------------------------------------------------------------------
CREATE TABLE spots (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('景点', '餐饮', '交通', '其他')),
  estimated_cost NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT '待去' CHECK (status IN ('待去', '已去')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spots_trip_id ON spots (trip_id);

COMMENT ON TABLE spots IS '景点/活动清单项：挂在行程下的待办/已办事项';
COMMENT ON COLUMN spots.id IS '主键，自增';
COMMENT ON COLUMN spots.trip_id IS '所属行程外键；删除行程时级联删除';
COMMENT ON COLUMN spots.name IS '清单项名称';
COMMENT ON COLUMN spots.type IS '类型枚举：景点/餐饮/交通/其他';
COMMENT ON COLUMN spots.estimated_cost IS '预估费用；请求未传时入库为 0（与 PRD 对齐）';
COMMENT ON COLUMN spots.status IS '状态枚举：待去/已去，默认待去';
COMMENT ON COLUMN spots.created_at IS '创建时间（服务端生成）';

-- ---------------------------------------------------------------------------
-- expenses：费用记录（归属某行程；MVP 不做编辑，改 = 删旧建新）
-- ---------------------------------------------------------------------------
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL CHECK (category IN ('交通', '住宿', '餐饮', '门票', '其他')),
  spend_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_trip_id ON expenses (trip_id);

COMMENT ON TABLE expenses IS '费用记录：行程下的实际支出，用于预算汇总对比';
COMMENT ON COLUMN expenses.id IS '主键，自增';
COMMENT ON COLUMN expenses.trip_id IS '所属行程外键；删除行程时级联删除';
COMMENT ON COLUMN expenses.name IS '费用名称';
COMMENT ON COLUMN expenses.amount IS '金额，单位元，须 >= 0';
COMMENT ON COLUMN expenses.category IS '分类枚举：交通/住宿/餐饮/门票/其他';
COMMENT ON COLUMN expenses.spend_date IS '消费日期（YYYY-MM-DD）';
COMMENT ON COLUMN expenses.created_at IS '创建时间（服务端生成）';
