/**
 * 金额四舍五入到分。
 * @param {number} n - 原始金额
 * @returns {number}
 */
function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * 从候选池随机取一项。
 * @template T
 * @param {T[]} pool - 候选数组
 * @returns {T}
 */
function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 按固定比例拆分预算；最后一项吸收舍入误差。
 * @param {number} budget - 总预算
 * @returns {Array<{ category: string, amount: number, percent: number, note: string }>}
 */
function buildBudgetPlan(budget) {
  const parts = [
    { category: '交通', percent: 20, note: '往返与市内交通' },
    { category: '住宿', percent: 35, note: '酒店或民宿' },
    { category: '餐饮', percent: 25, note: '正餐与小吃' },
    { category: '门票', percent: 15, note: '景点门票' },
    { category: '其他', percent: 5, note: '机动与购物' },
  ];

  let allocated = 0;
  return parts.map((part, index) => {
    let amount;
    if (index === parts.length - 1) {
      amount = roundMoney(budget - allocated);
    } else {
      amount = roundMoney((budget * part.percent) / 100);
      allocated = roundMoney(allocated + amount);
    }
    return {
      category: part.category,
      amount: amount < 0 ? 0 : amount,
      percent: part.percent,
      note: part.note,
    };
  });
}

/**
 * 生成与入参强相关的 Mock 建议（结构与真调同构）。
 * @param {{ destination: string, days: number, budget: number }} input - 最终入参
 * @returns {{
 *   summary: string,
 *   days: Array<{
 *     day: number,
 *     title: string,
 *     items: Array<{
 *       time: string,
 *       name: string,
 *       type: string,
 *       estimatedCost: number,
 *       note: string
 *     }>
 *   }>,
 *   budgetPlan: Array<{ category: string, amount: number, percent: number, note: string }>,
 *   tips: string[]
 * }}
 */
export function buildMockSuggestion({ destination, days, budget }) {
  const morningPool = [
    `${destination}老城区漫步`,
    `${destination}博物馆`,
    `${destination}城市地标打卡`,
    `${destination}公园晨练/散步`,
  ];
  const afternoonPool = [
    `${destination}特色小吃街`,
    `${destination}本地风味午餐`,
    `${destination}市集淘宝`,
  ];
  const eveningPool = [
    `${destination}夜景观光`,
    `${destination}夜市小吃`,
    `${destination}返回住宿休整`,
  ];
  const themePool = [
    `${destination}·文化与街巷`,
    `${destination}·美食探索`,
    `${destination}·轻松漫游`,
    `${destination}·经典必去`,
  ];

  const perDayFood = roundMoney(Math.min(120, (budget * 0.25) / Math.max(days, 1) / 2));
  const perDayTicket = roundMoney(Math.min(80, (budget * 0.15) / Math.max(days, 1)));
  const perDayTransit = roundMoney(Math.min(40, (budget * 0.2) / Math.max(days, 1) / 2));

  /** @type {Array<{ day: number, title: string, items: Array<object> }>} */
  const dayPlans = [];
  for (let d = 1; d <= days; d += 1) {
    const isLast = d === days;
    dayPlans.push({
      day: d,
      title: isLast
        ? `${destination}·第 ${d} 日返程准备`
        : `${pick(themePool)}（第 ${d} 日）`,
      items: [
        {
          time: '上午',
          name: pick(morningPool),
          type: '景点',
          estimatedCost: d === 1 ? 0 : perDayTicket,
          note: `上午游览${destination}相关景点`,
        },
        {
          time: '下午',
          name: pick(afternoonPool),
          type: '餐饮',
          estimatedCost: perDayFood,
          note: `品尝${destination}本地风味`,
        },
        {
          time: '晚上',
          name: isLast ? `${destination}返程交通` : pick(eveningPool),
          type: isLast ? '交通' : pick(['交通', '其他', '餐饮']),
          estimatedCost: isLast
            ? roundMoney(Math.min(280, budget * 0.12))
            : perDayTransit,
          note: isLast ? '预留安检与路程时间' : `晚上在${destination}轻松活动`,
        },
      ],
    });
  }

  const tipPoolRelated = [
    `${destination}昼夜温差较大，建议携带外套`,
    `${days} 天行程建议将同区域景点安排在同一天以减少通勤`,
    `在${destination}用餐可优先选择人气高的本地店，注意人均与卫生`,
    `${destination}热门点位建议错峰出行，预留排队时间`,
    `本次 ${days} 日预算约 ${budget} 元，建议预留 5%–10% 机动金`,
  ];
  const tipPoolExtra = [
    '出行前确认门票预约与交通时刻表',
    '贵重物品分开放，注意公共场所防盗',
    '随身携带常用药品与充电宝',
  ];

  // 打乱后取前两条相关提示，确保至少 2 条提到目的地或天数
  const shuffledRelated = [...tipPoolRelated].sort(() => Math.random() - 0.5);
  const tips = [shuffledRelated[0], shuffledRelated[1], pick(tipPoolExtra)];

  return {
    summary: `（Mock）为${destination}规划的 ${days} 日行程草案，总预算约 ${budget} 元，兼顾景点、餐饮与交通节奏。`,
    days: dayPlans,
    budgetPlan: buildBudgetPlan(budget),
    tips,
  };
}
