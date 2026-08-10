/**
 * 金额四舍五入到分。
 * @param {number} n
 * @returns {number}
 */
function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * 按预算比例拆分，最后一项吃掉误差。
 * @param {number} budget
 * @param {Array<{ category: string, percent: number, note: string }>} parts
 * @returns {Array<{ category: string, amount: number, percent: number, note: string }>}
 */
function splitBudget(budget, parts) {
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
 * 生成与入参相关的 Mock 建议（结构与真调同构）。
 * @param {{ destination: string, days: number, budget: number }} input
 * @returns {{
 *   summary: string,
 *   days: Array<{ day: number, title: string, items: Array<object> }>,
 *   budgetPlan: Array<object>,
 *   tips: string[]
 * }}
 */
export function buildMockSuggestData(input) {
  const { destination, days, budget } = input;

  const dayPlans = [];
  for (let d = 1; d <= days; d += 1) {
    const isLast = d === days;
    dayPlans.push({
      day: d,
      title: isLast
        ? `${destination}·第 ${d} 日（返程准备）`
        : `${destination}·第 ${d} 日`,
      items: [
        {
          time: '上午',
          name: isLast ? `${destination}经典打卡` : `${destination}城区漫步`,
          type: '景点',
          estimatedCost: 0,
          note: `Mock：与${destination}相关`,
        },
        {
          time: '下午',
          name: isLast ? `${destination}特色小吃` : `${destination}本地餐饮`,
          type: '餐饮',
          estimatedCost: roundMoney(Math.min(150, budget * 0.08)),
          note: '控制人均预算',
        },
        {
          time: '晚上',
          name: isLast ? '返程交通' : `${destination}夜景/休整`,
          type: isLast ? '交通' : '其他',
          estimatedCost: isLast
            ? roundMoney(Math.min(280, budget * 0.15))
            : roundMoney(Math.min(50, budget * 0.03)),
          note: isLast ? '预留安检与路程时间' : '留出机动时间',
        },
      ],
    });
  }

  const budgetPlan = splitBudget(budget, [
    { category: '交通', percent: 37.33, note: `Mock：${destination} 交通预算` },
    { category: '住宿', percent: 26.67, note: `Mock：${destination} 住宿预算` },
    { category: '餐饮', percent: 21.33, note: `Mock：${destination} 餐饮预算` },
    { category: '门票', percent: 8.67, note: 'Mock：可选景点门票' },
    { category: '其他', percent: 6, note: 'Mock：机动与购物' },
  ]);

  return {
    summary: `（Mock）为${destination}生成的 ${days} 日行程草案，预算约 ${budget} 元。`,
    days: dayPlans,
    budgetPlan,
    tips: [
      `Mock：${destination}出行注意天气与防晒`,
      `Mock：合理分配 ${budget} 元预算，预留机动金`,
      `Mock：${days} 日行程不宜安排过满，注意休息`,
    ],
  };
}
