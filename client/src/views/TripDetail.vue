<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getTrip } from '../api/trips.js';
import {
  createSpot,
  deleteSpot,
  listSpots,
  updateSpot,
} from '../api/spots.js';
import {
  createExpense,
  deleteExpense,
  getSummary,
  listExpenses,
} from '../api/expenses.js';
import { calcTripDays, formatMoney, todayYmd } from '../utils/format.js';

const route = useRoute();
const router = useRouter();

const SPOT_TYPES = ['景点', '餐饮', '交通', '其他'];
const SPOT_STATUSES = ['待去', '已去'];
const EXPENSE_CATEGORIES = ['交通', '住宿', '餐饮', '门票', '其他'];

/** @type {import('vue').Ref<object|null>} */
const trip = ref(null);
/** @type {import('vue').Ref<object[]>} */
const spots = ref([]);
/** @type {import('vue').Ref<object[]>} */
const expenses = ref([]);
/** @type {import('vue').Ref<object|null>} */
const summary = ref(null);
/** @type {import('vue').Ref<boolean>} */
const loading = ref(false);
/** @type {import('vue').Ref<string>} */
const activeTab = ref('spots');

/** @type {import('vue').Ref<boolean>} */
const spotDialogVisible = ref(false);
/** @type {import('vue').Ref<boolean>} */
const spotSubmitting = ref(false);
/** @type {import('vue').Ref<import('element-plus').FormInstance|null>} */
const spotFormRef = ref(null);
const spotForm = reactive({
  name: '',
  type: '景点',
  estimatedCost: 0,
  status: '待去',
});
const spotRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度为 1–50 个字符', trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  estimatedCost: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback(new Error('请输入预计花费'));
          return;
        }
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
          callback(new Error('预计花费不能小于 0'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

/** @type {import('vue').Ref<boolean>} */
const expenseDialogVisible = ref(false);
/** @type {import('vue').Ref<boolean>} */
const expenseSubmitting = ref(false);
/** @type {import('vue').Ref<import('element-plus').FormInstance|null>} */
const expenseFormRef = ref(null);
const expenseForm = reactive({
  name: '',
  amount: 0,
  category: '交通',
  spendDate: todayYmd(),
});
const expenseRules = {
  name: [
    { required: true, message: '请输入费用名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度为 1–50 个字符', trigger: 'blur' },
  ],
  amount: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback(new Error('请输入金额'));
          return;
        }
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
          callback(new Error('金额不能小于 0'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  spendDate: [{ required: true, message: '请选择发生日期', trigger: 'change' }],
};

/** 正在切换状态的景点 ID 集合，避免连点 */
const statusUpdatingIds = ref(/** @type {Set<number>} */ (new Set()));

const tripDays = computed(() => {
  if (!trip.value) return 0;
  return calcTripDays(trip.value.startDate, trip.value.endDate);
});

const usagePercent = computed(() => {
  const rate = Number(summary.value?.usageRate ?? 0);
  if (Number.isNaN(rate)) return 0;
  return Math.round(rate * 10000) / 100;
});

const progressStatus = computed(() => {
  if (!summary.value) return undefined;
  if (summary.value.overBudget) return 'exception';
  if (Number(summary.value.usageRate) >= 0.8) return 'warning';
  return 'success';
});

const overspendAmount = computed(() => {
  if (!summary.value) return 0;
  const spent = Number(summary.value.totalSpent);
  const budget = Number(summary.value.budget);
  return Math.round((spent - budget) * 100) / 100;
});

const nearBudgetLimit = computed(() => {
  if (!summary.value) return false;
  return !summary.value.overBudget && Number(summary.value.usageRate) >= 0.8;
});

/**
 * 当前行程 ID。
 * @returns {string}
 */
function getTripId() {
  return String(route.params.id);
}

/**
 * 景点类型对应 Tag 颜色。
 * @param {string} type 类型
 * @returns {string}
 */
function spotTypeTagType(type) {
  const map = {
    景点: 'success',
    餐饮: 'warning',
    交通: 'info',
    其他: '',
  };
  return map[type] ?? '';
}

/**
 * 费用类别对应 Tag 颜色。
 * @param {string} category 类别
 * @returns {string}
 */
function expenseCategoryTagType(category) {
  const map = {
    交通: 'info',
    住宿: 'primary',
    餐饮: 'warning',
    门票: 'success',
    其他: '',
  };
  return map[category] ?? '';
}

/**
 * 已去行增加灰色样式。
 * @param {{ row: { status: string } }} param0 行数据
 * @returns {string}
 */
function spotRowClassName({ row }) {
  return row.status === '已去' ? 'spot-row--done' : '';
}

/**
 * 费用表格合计行。
 * @param {{ columns: object[], data: object[] }} param0 表格上下文
 * @returns {string[]}
 */
function expenseSummaries({ columns, data }) {
  const sums = [];
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计';
      return;
    }
    if (column.property === 'amount') {
      const total = data.reduce((acc, row) => acc + Number(row.amount || 0), 0);
      sums[index] = formatMoney(total);
      return;
    }
    sums[index] = '';
  });
  return sums;
}

/**
 * 重置景点表单。
 * @returns {void}
 */
function resetSpotForm() {
  spotForm.name = '';
  spotForm.type = '景点';
  spotForm.estimatedCost = 0;
  spotForm.status = '待去';
  spotFormRef.value?.clearValidate();
}

/**
 * 重置费用表单。
 * @returns {void}
 */
function resetExpenseForm() {
  expenseForm.name = '';
  expenseForm.amount = 0;
  expenseForm.category = '交通';
  expenseForm.spendDate = todayYmd();
  expenseFormRef.value?.clearValidate();
}

/**
 * 并行加载行程、景点、费用与汇总。
 * @returns {Promise<void>}
 */
async function loadAll() {
  const tripId = getTripId();
  loading.value = true;
  try {
    const [tripData, spotsData, expensesData, summaryData] = await Promise.all([
      getTrip(tripId),
      listSpots(tripId),
      listExpenses(tripId),
      getSummary(tripId),
    ]);
    trip.value = tripData;
    spots.value = spotsData;
    expenses.value = expensesData;
    summary.value = summaryData;
  } catch {
    trip.value = null;
    spots.value = [];
    expenses.value = [];
    summary.value = null;
  } finally {
    loading.value = false;
  }
}

/**
 * 仅刷新费用列表与预算汇总。
 * @returns {Promise<void>}
 */
async function refreshExpensesAndSummary() {
  const tripId = getTripId();
  const [expensesData, summaryData] = await Promise.all([
    listExpenses(tripId),
    getSummary(tripId),
  ]);
  expenses.value = expensesData;
  summary.value = summaryData;
}

/**
 * 返回行程列表。
 * @returns {void}
 */
function goBack() {
  router.push('/trips');
}

/**
 * 打开新增景点对话框。
 * @returns {void}
 */
function openSpotDialog() {
  resetSpotForm();
  spotDialogVisible.value = true;
}

/**
 * 提交新增景点。
 * @returns {Promise<void>}
 */
async function submitSpot() {
  if (!spotFormRef.value) return;
  const valid = await spotFormRef.value.validate().catch(() => false);
  if (!valid) return;

  spotSubmitting.value = true;
  try {
    await createSpot(getTripId(), {
      name: spotForm.name.trim(),
      type: spotForm.type,
      estimatedCost: Number(spotForm.estimatedCost),
      status: spotForm.status,
    });
    ElMessage.success('添加成功');
    spotDialogVisible.value = false;
    spots.value = await listSpots(getTripId());
  } catch {
    // 错误已由 http 拦截器提示
  } finally {
    spotSubmitting.value = false;
  }
}

/**
 * 切换景点状态；失败时回滚 UI。
 * @param {object} row 景点行
 * @param {string} nextStatus 目标状态
 * @returns {Promise<void>}
 */
async function handleStatusChange(row, nextStatus) {
  const prevStatus = nextStatus === '已去' ? '待去' : '已去';
  if (statusUpdatingIds.value.has(row.id)) {
    row.status = prevStatus;
    return;
  }
  statusUpdatingIds.value.add(row.id);
  try {
    const updated = await updateSpot(row.id, { status: nextStatus });
    row.status = updated.status;
    ElMessage.success('状态已更新');
  } catch {
    row.status = prevStatus;
  } finally {
    statusUpdatingIds.value.delete(row.id);
  }
}

/**
 * 删除景点。
 * @param {object} row 景点行
 * @returns {Promise<void>}
 */
async function handleDeleteSpot(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除景点「${row.name}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  try {
    await deleteSpot(row.id);
    ElMessage.success('删除成功');
    spots.value = await listSpots(getTripId());
  } catch {
    // 错误已由 http 拦截器提示
  }
}

/**
 * 打开记一笔对话框。
 * @returns {void}
 */
function openExpenseDialog() {
  resetExpenseForm();
  expenseDialogVisible.value = true;
}

/**
 * 提交新增费用。
 * @returns {Promise<void>}
 */
async function submitExpense() {
  if (!expenseFormRef.value) return;
  const valid = await expenseFormRef.value.validate().catch(() => false);
  if (!valid) return;

  expenseSubmitting.value = true;
  try {
    await createExpense(getTripId(), {
      name: expenseForm.name.trim(),
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      spendDate: expenseForm.spendDate,
    });
    ElMessage.success('记账成功');
    expenseDialogVisible.value = false;
    await refreshExpensesAndSummary();
  } catch {
    // 错误已由 http 拦截器提示
  } finally {
    expenseSubmitting.value = false;
  }
}

/**
 * 删除费用并刷新汇总。
 * @param {object} row 费用行
 * @returns {Promise<void>}
 */
async function handleDeleteExpense(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除费用「${row.name}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  try {
    await deleteExpense(row.id);
    ElMessage.success('删除成功');
    await refreshExpensesAndSummary();
  } catch {
    // 错误已由 http 拦截器提示
  }
}

onMounted(loadAll);
watch(() => route.params.id, loadAll);
</script>

<template>
  <div class="trip-detail" v-loading="loading">
    <el-empty v-if="!loading && !trip" description="未找到该行程" />

    <template v-else-if="trip">
      <!-- A. 行程信息头部 -->
      <section class="panel trip-header">
        <router-link class="back-link" to="/trips">← 返回列表</router-link>
        <h1 class="trip-header__name">{{ trip.name }}</h1>
        <p class="trip-header__dest">{{ trip.destination }}</p>
        <div class="trip-header__meta">
          <div class="meta-item">
            <span class="meta-item__label">日期</span>
            <span class="meta-item__value"
              >{{ trip.startDate }} ~ {{ trip.endDate }}</span
            >
          </div>
          <div class="meta-item">
            <span class="meta-item__label">天数</span>
            <span class="meta-item__value">{{ tripDays }} 天</span>
          </div>
          <div class="meta-item">
            <span class="meta-item__label">预算</span>
            <span class="meta-item__value">{{ formatMoney(trip.budget) }}</span>
          </div>
        </div>
        <p v-if="trip.note" class="trip-header__note">备注：{{ trip.note }}</p>
      </section>

      <!-- B. 预算概览 -->
      <section v-if="summary" class="panel budget-panel">
        <el-alert
          v-if="summary.overBudget"
          class="budget-alert"
          type="warning"
          show-icon
          :closable="false"
          :title="`已超出预算 ${formatMoney(overspendAmount)}，请注意控制开支`"
        />
        <el-alert
          v-else-if="nearBudgetLimit"
          class="budget-alert"
          type="warning"
          show-icon
          :closable="false"
          title="预算即将用完"
        />

        <div class="budget-panel__title">预算概览</div>

        <div class="budget-stats">
          <div class="budget-stat">
            <div class="budget-stat__label">预算</div>
            <div class="budget-stat__value">
              {{ formatMoney(summary.budget) }}
            </div>
          </div>
          <div class="budget-stat">
            <div class="budget-stat__label">已花费</div>
            <div class="budget-stat__value">
              {{ formatMoney(summary.totalSpent) }}
            </div>
          </div>
          <div class="budget-stat">
            <div class="budget-stat__label">剩余</div>
            <div
              class="budget-stat__value"
              :class="{ 'is-negative': summary.overBudget }"
            >
              {{ formatMoney(summary.remaining) }}
            </div>
          </div>
        </div>

        <div class="budget-progress">
          <div class="budget-progress__label">
            <span>使用率</span>
            <span>{{ usagePercent }}%</span>
          </div>
          <el-progress
            :percentage="Math.min(usagePercent, 100)"
            :status="progressStatus"
            :stroke-width="14"
          />
        </div>

        <div v-if="summary.byCategory?.length" class="budget-tags">
          <el-tag
            v-for="item in summary.byCategory"
            :key="item.category"
            class="budget-tag"
            effect="plain"
            :type="expenseCategoryTagType(item.category)"
          >
            {{ item.category }} {{ formatMoney(item.amount) }}
          </el-tag>
        </div>
        <div v-else class="budget-tags budget-tags--empty">暂无分类消费</div>
      </section>

      <!-- C/D. 景点与费用 -->
      <section class="panel tabs-panel">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="景点 / 活动" name="spots">
            <div class="tab-toolbar">
              <el-button type="primary" @click="openSpotDialog"
                >+ 添加景点</el-button
              >
            </div>

            <el-empty
              v-if="spots.length === 0"
              description="还没有景点，添加第一个活动吧"
            />
            <el-table
              v-else
              :data="spots"
              stripe
              :row-class-name="spotRowClassName"
              style="width: 100%"
            >
              <el-table-column prop="name" label="名称" min-width="140" />
              <el-table-column label="类型" width="110">
                <template #default="{ row }">
                  <el-tag :type="spotTypeTagType(row.type)" effect="light">
                    {{ row.type }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="预计花费" width="120">
                <template #default="{ row }">
                  {{ formatMoney(row.estimatedCost) }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="150">
                <template #default="{ row }">
                  <el-switch
                    v-model="row.status"
                    inline-prompt
                    active-text="已去"
                    inactive-text="待去"
                    active-value="已去"
                    inactive-value="待去"
                    @change="(val) => handleStatusChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    link
                    @click="handleDeleteSpot(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="费用记录" name="expenses">
            <div class="tab-toolbar">
              <el-button type="primary" @click="openExpenseDialog"
                >+ 记一笔</el-button
              >
            </div>

            <el-empty
              v-if="expenses.length === 0"
              description="还没有费用记录"
            />
            <el-table
              v-else
              :data="expenses"
              stripe
              show-summary
              :summary-method="expenseSummaries"
              style="width: 100%"
            >
              <el-table-column prop="name" label="费用名称" min-width="140" />
              <el-table-column label="类别" width="110">
                <template #default="{ row }">
                  <el-tag
                    :type="expenseCategoryTagType(row.category)"
                    effect="light"
                  >
                    {{ row.category }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="amount"
                label="金额"
                width="120"
              >
                <template #default="{ row }">
                  {{ formatMoney(row.amount) }}
                </template>
              </el-table-column>
              <el-table-column prop="spendDate" label="发生日期" width="130" />
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    link
                    @click="handleDeleteExpense(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </section>
    </template>

    <!-- 新增景点 -->
    <el-dialog
      v-model="spotDialogVisible"
      title="添加景点"
      width="480px"
      destroy-on-close
      @closed="resetSpotForm"
    >
      <el-form
        ref="spotFormRef"
        :model="spotForm"
        :rules="spotRules"
        label-width="88px"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="spotForm.name"
            maxlength="50"
            show-word-limit
            placeholder="例如：栈桥"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="spotForm.type" style="width: 100%">
            <el-option
              v-for="item in SPOT_TYPES"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预计花费" prop="estimatedCost">
          <el-input-number
            v-model="spotForm.estimatedCost"
            :min="0"
            :precision="2"
            :step="10"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="spotForm.status" style="width: 100%">
            <el-option
              v-for="item in SPOT_STATUSES"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="spotDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="spotSubmitting"
          @click="submitSpot"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 记一笔 -->
    <el-dialog
      v-model="expenseDialogVisible"
      title="记一笔"
      width="480px"
      destroy-on-close
      @closed="resetExpenseForm"
    >
      <el-form
        ref="expenseFormRef"
        :model="expenseForm"
        :rules="expenseRules"
        label-width="88px"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="expenseForm.name"
            maxlength="50"
            show-word-limit
            placeholder="例如：高铁往返"
          />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="expenseForm.amount"
            :min="0"
            :precision="2"
            :step="10"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="类别" prop="category">
          <el-select v-model="expenseForm.category" style="width: 100%">
            <el-option
              v-for="item in EXPENSE_CATEGORIES"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="发生日期" prop="spendDate">
          <el-date-picker
            v-model="expenseForm.spendDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="expenseDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="expenseSubmitting"
          @click="submitExpense"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.trip-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 280px;
}

.panel {
  background: #fff;
  border-radius: 16px;
  padding: 22px 22px 20px;
  box-shadow: 0 10px 28px rgba(31, 45, 43, 0.06);
  border: 1px solid rgba(14, 159, 142, 0.08);
}

.back-link {
  display: inline-block;
  margin-bottom: 12px;
  color: #0e9f8e;
  text-decoration: none;
  font-size: 14px;
}

.back-link:hover {
  text-decoration: underline;
}

.trip-header__name {
  margin: 0 0 6px;
  font-size: 26px;
  color: #1f2d2b;
  line-height: 1.3;
}

.trip-header__dest {
  margin: 0 0 16px;
  color: #0e9f8e;
  font-weight: 600;
  font-size: 16px;
}

.trip-header__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.meta-item {
  background: linear-gradient(180deg, #f4fbf9 0%, #eef8f6 100%);
  border-radius: 12px;
  padding: 12px 14px;
}

.meta-item__label {
  display: block;
  font-size: 12px;
  color: #6b7f7b;
  margin-bottom: 4px;
}

.meta-item__value {
  font-size: 15px;
  color: #1f2d2b;
  font-weight: 600;
}

.trip-header__note {
  margin: 14px 0 0;
  color: #6b7f7b;
  font-size: 13px;
}

.budget-alert {
  margin-bottom: 14px;
}

.budget-panel__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2d2b;
  margin-bottom: 14px;
}

.budget-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.budget-stat {
  text-align: center;
  padding: 14px 10px;
  border-radius: 12px;
  background: #f7fbfa;
}

.budget-stat__label {
  font-size: 13px;
  color: #6b7f7b;
  margin-bottom: 6px;
}

.budget-stat__value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d2b;
}

.budget-stat__value.is-negative {
  color: #f56c6c;
}

.budget-progress__label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b7f7b;
  margin-bottom: 8px;
}

.budget-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.budget-tags--empty {
  color: #8a9c98;
  font-size: 13px;
}

.budget-tag {
  border-radius: 999px;
}

.tab-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

:deep(.spot-row--done) {
  color: #9aa8a5;
}

:deep(.spot-row--done .el-tag) {
  opacity: 0.75;
}

@media (max-width: 720px) {
  .trip-header__meta,
  .budget-stats {
    grid-template-columns: 1fr;
  }
}
</style>
