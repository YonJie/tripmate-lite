const SPOT_TYPES = new Set(['景点', '餐饮', '交通', '其他']);
const EXPENSE_CATEGORIES = new Set(['交通', '住宿', '餐饮', '门票', '其他']);

/**
 * 校验 AI 建议 data 对象是否满足契约最小结构。
 * @param {unknown} data - DeepSeek 或 Mock 返回的 data
 * @returns {{ valid: boolean, reason: string | null }}
 */
export function validateSuggestion(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'data 须为对象' };
  }

  const { summary, days, budgetPlan, tips } = data;

  if (typeof summary !== 'string' || summary.trim().length === 0) {
    return { valid: false, reason: 'summary 须为非空字符串' };
  }

  if (!Array.isArray(days) || days.length < 1) {
    return { valid: false, reason: 'days 须为长度 >= 1 的数组' };
  }

  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    if (day == null || typeof day !== 'object' || Array.isArray(day)) {
      return { valid: false, reason: `days[${i}] 须为对象` };
    }
    if (typeof day.day !== 'number' || !Number.isFinite(day.day)) {
      return { valid: false, reason: `days[${i}].day 须为 number` };
    }
    if (typeof day.title !== 'string' || day.title.trim().length === 0) {
      return { valid: false, reason: `days[${i}].title 须为非空字符串` };
    }
    if (!Array.isArray(day.items)) {
      return { valid: false, reason: `days[${i}].items 须为数组` };
    }
    for (let j = 0; j < day.items.length; j += 1) {
      const item = day.items[j];
      if (item == null || typeof item !== 'object' || Array.isArray(item)) {
        return { valid: false, reason: `days[${i}].items[${j}] 须为对象` };
      }
      if (typeof item.name !== 'string' || item.name.trim().length === 0) {
        return { valid: false, reason: `item.name 须为非空字符串` };
      }
      if (typeof item.type !== 'string' || !SPOT_TYPES.has(item.type)) {
        return { valid: false, reason: `item.type 非法（须为景点/餐饮/交通/其他）` };
      }
      if (typeof item.estimatedCost !== 'number' || !Number.isFinite(item.estimatedCost)) {
        return { valid: false, reason: `item.estimatedCost 须为 number` };
      }
    }
  }

  if (!Array.isArray(budgetPlan) || budgetPlan.length < 1) {
    return { valid: false, reason: 'budgetPlan 须为长度 >= 1 的数组' };
  }

  for (let i = 0; i < budgetPlan.length; i += 1) {
    const plan = budgetPlan[i];
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return { valid: false, reason: `budgetPlan[${i}] 须为对象` };
    }
    if (typeof plan.category !== 'string' || !EXPENSE_CATEGORIES.has(plan.category)) {
      return { valid: false, reason: `budgetPlan[${i}].category 非法` };
    }
    if (typeof plan.amount !== 'number' || !Number.isFinite(plan.amount)) {
      return { valid: false, reason: `budgetPlan[${i}].amount 须为 number` };
    }
    if (typeof plan.percent !== 'number' || !Number.isFinite(plan.percent)) {
      return { valid: false, reason: `budgetPlan[${i}].percent 须为 number` };
    }
  }

  if (!Array.isArray(tips) || tips.length < 3) {
    return { valid: false, reason: 'tips 须为长度 >= 3 的字符串数组' };
  }
  if (!tips.every((t) => typeof t === 'string' && t.trim().length > 0)) {
    return { valid: false, reason: 'tips 每项须为非空字符串' };
  }

  return { valid: true, reason: null };
}
