/**
 * 校验 AI suggest 的 data 结构是否满足契约（含 tips >= 3）。
 * @param {unknown} data - 模型或 Mock 返回的 data
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateSuggestData(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'data 须为对象' };
  }

  const { summary, days, budgetPlan, tips } = data;

  if (typeof summary !== 'string' || summary.trim().length === 0) {
    return { ok: false, reason: 'summary 无效' };
  }

  if (!Array.isArray(days) || days.length < 1) {
    return { ok: false, reason: 'days 须为非空数组' };
  }

  const spotTypes = new Set(['景点', '餐饮', '交通', '其他']);
  const times = new Set(['上午', '下午', '晚上']);
  const categories = new Set(['交通', '住宿', '餐饮', '门票', '其他']);

  for (const day of days) {
    if (day == null || typeof day !== 'object') {
      return { ok: false, reason: 'days 项无效' };
    }
    if (!Number.isInteger(day.day) || day.day < 1) {
      return { ok: false, reason: 'day 编号无效' };
    }
    if (typeof day.title !== 'string') {
      return { ok: false, reason: 'day.title 无效' };
    }
    if (!Array.isArray(day.items)) {
      return { ok: false, reason: 'day.items 须为数组' };
    }
    for (const item of day.items) {
      if (item == null || typeof item !== 'object') {
        return { ok: false, reason: 'item 无效' };
      }
      if (!times.has(item.time)) {
        return { ok: false, reason: 'item.time 枚举非法' };
      }
      if (typeof item.name !== 'string' || item.name.trim().length === 0) {
        return { ok: false, reason: 'item.name 无效' };
      }
      if (!spotTypes.has(item.type)) {
        return { ok: false, reason: 'item.type 枚举非法' };
      }
      if (typeof item.estimatedCost !== 'number' || item.estimatedCost < 0) {
        return { ok: false, reason: 'item.estimatedCost 无效' };
      }
      if (typeof item.note !== 'string') {
        return { ok: false, reason: 'item.note 须为字符串' };
      }
    }
  }

  if (!Array.isArray(budgetPlan) || budgetPlan.length < 1) {
    return { ok: false, reason: 'budgetPlan 须为非空数组' };
  }

  for (const plan of budgetPlan) {
    if (plan == null || typeof plan !== 'object') {
      return { ok: false, reason: 'budgetPlan 项无效' };
    }
    if (!categories.has(plan.category)) {
      return { ok: false, reason: 'budgetPlan.category 枚举非法' };
    }
    if (typeof plan.amount !== 'number' || plan.amount < 0) {
      return { ok: false, reason: 'budgetPlan.amount 无效' };
    }
    if (typeof plan.percent !== 'number') {
      return { ok: false, reason: 'budgetPlan.percent 无效' };
    }
    if (typeof plan.note !== 'string') {
      return { ok: false, reason: 'budgetPlan.note 须为字符串' };
    }
  }

  if (!Array.isArray(tips) || tips.length < 3) {
    return { ok: false, reason: 'tips 至少 3 条' };
  }
  if (!tips.every((t) => typeof t === 'string' && t.trim().length > 0)) {
    return { ok: false, reason: 'tips 项须为非空字符串' };
  }

  return { ok: true };
}
