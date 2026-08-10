-- TripMate Lite 演示种子数据
-- 依赖：须在 schema.sql 执行之后运行；可独立于业务代码重复执行（会追加行）
-- 示例：成都 3 日游，预算 3000 元
SET client_encoding TO 'UTF8';

INSERT INTO trips (name, destination, start_date, end_date, budget, note)
VALUES (
  '成都三日悠闲游',
  '成都',
  '2026-04-10',
  '2026-04-12',
  3000.00,
  '春日逛宽窄巷子、看大熊猫，晚上吃火锅；交通以地铁/打车为主。'
);

-- 使用刚插入行程的 id，避免硬编码 SERIAL，保证 seed 在 schema 后可独立执行
INSERT INTO spots (trip_id, name, type, estimated_cost, status)
VALUES
  (
    (SELECT id FROM trips WHERE destination = '成都' ORDER BY id DESC LIMIT 1),
    '宽窄巷子',
    '景点',
    0.00,
    '待去'
  ),
  (
    (SELECT id FROM trips WHERE destination = '成都' ORDER BY id DESC LIMIT 1),
    '成都大熊猫繁育研究基地',
    '景点',
    55.00,
    '待去'
  ),
  (
    (SELECT id FROM trips WHERE destination = '成都' ORDER BY id DESC LIMIT 1),
    '蜀大侠火锅（春熙路店）',
    '餐饮',
    180.00,
    '待去'
  );

INSERT INTO expenses (trip_id, name, amount, category, spend_date)
VALUES
  (
    (SELECT id FROM trips WHERE destination = '成都' ORDER BY id DESC LIMIT 1),
    '往返高铁（重庆—成都）',
    320.00,
    '交通',
    '2026-04-10'
  ),
  (
    (SELECT id FROM trips WHERE destination = '成都' ORDER BY id DESC LIMIT 1),
    '锦里附近民宿两晚',
    560.00,
    '住宿',
    '2026-04-10'
  ),
  (
    (SELECT id FROM trips WHERE destination = '成都' ORDER BY id DESC LIMIT 1),
    '大熊猫基地门票',
    55.00,
    '门票',
    '2026-04-11'
  );
