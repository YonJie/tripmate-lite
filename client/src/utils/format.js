/**
 * 将金额格式化为带千分位的人民币字符串，如 `¥1,234.56`；负数为 `-¥1,234.56`。
 * @param {number|string|null|undefined} amount 金额
 * @returns {string}
 */
export function formatMoney(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return '¥0.00';
  }
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = value < 0 ? '-' : '';
  return `${prefix}¥${withComma}.${decPart}`;
}

/**
 * 计算含首尾的行程天数。
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 * @returns {number}
 */
export function calcTripDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

/**
 * 返回今天的 YYYY-MM-DD。
 * @returns {string}
 */
export function todayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
