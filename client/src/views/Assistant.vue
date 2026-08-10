<script setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { listTrips } from '../api/trips.js';
import { getSuggestion } from '../api/ai.js';
import { bulkCreateSpots } from '../api/spots.js';
import { calcTripDays, formatMoney } from '../utils/format.js';

const router = useRouter();

/** @type {import('vue').Ref<object[]>} */
const trips = ref([]);
/** @type {import('vue').Ref<number|null>} */
const selectedTripId = ref(null);
/** @type {import('vue').Ref<import('element-plus').FormInstance|null>} */
const formRef = ref(null);

const form = reactive({
  destination: '',
  days: 2,
  budget: 1000,
});

const formRules = {
  destination: [
    { required: true, message: '请输入目的地', trigger: 'blur' },
    { min: 1, max: 50, message: '目的地长度为 1–50 个字符', trigger: 'blur' },
  ],
  days: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback(new Error('请输入出行天数'));
          return;
        }
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > 15
        ) {
          callback(new Error('天数须为 1–15 的整数'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  budget: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback(new Error('请输入预算'));
          return;
        }
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
          callback(new Error('预算不能小于 0'));
          return;
        }
        callback();
      },
      trigger: 'change',
    },
  ],
};

/** @type {import('vue').Ref<boolean>} */
const generating = ref(false);
/** @type {import('vue').Ref<object|null>} */
const result = ref(null);
/** @type {import('vue').Ref<boolean>} */
const hasError = ref(false);
/** @type {import('vue').Ref<string>} */
const errorMessage = ref('');

/** @type {import('vue').Ref<boolean>} */
const importDialogVisible = ref(false);
/** @type {import('vue').Ref<number|null>} */
const importTripId = ref(null);
/** @type {import('vue').Ref<string[]>} */
const importCheckedKeys = ref([]);
/** @type {import('vue').Ref<boolean>} */
const importing = ref(false);

const hasResult = computed(() => Boolean(result.value?.data));

/**
 * 将日程 items 展平为可勾选导入列表。
 * @returns {Array<{ key: string, name: string, type: string, estimatedCost: number, day: number, time: string }>}
 */
const flatImportItems = computed(() => {
  const days = result.value?.data?.days;
  if (!Array.isArray(days)) return [];
  /** @type {Array<{ key: string, name: string, type: string, estimatedCost: number, day: number, time: string }>} */
  const list = [];
  days.forEach((day) => {
    (day.items || []).forEach((item, index) => {
      list.push({
        key: `${day.day}-${index}-${item.name}`,
        name: item.name,
        type: item.type,
        estimatedCost: Number(item.estimatedCost ?? 0),
        day: day.day,
        time: item.time,
      });
    });
  });
  return list;
});

/**
 * 景点类型 Tag 颜色。
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
 * 格式化 ISO 时间为本地可读字符串。
 * @param {string} iso ISO 8601
 * @returns {string}
 */
function formatGeneratedAt(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { hour12: false });
}

/**
 * 加载行程选项。
 * @returns {Promise<void>}
 */
async function loadTrips() {
  try {
    trips.value = await listTrips();
  } catch {
    trips.value = [];
  }
}

/**
 * 从已有行程带入表单字段。
 * @param {number|null} tripId 行程 ID
 * @returns {void}
 */
function handleTripSelect(tripId) {
  if (tripId == null) return;
  const trip = trips.value.find((item) => item.id === tripId);
  if (!trip) return;
  form.destination = trip.destination;
  form.days = calcTripDays(trip.startDate, trip.endDate);
  form.budget = Number(trip.budget);
  formRef.value?.clearValidate();
}

/**
 * 调用 AI 生成建议。
 * @returns {Promise<void>}
 */
async function generateSuggestion() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  generating.value = true;
  hasError.value = false;
  errorMessage.value = '';
  result.value = null;

  /** @type {{ destination: string, days: number, budget: number, tripId?: number }} */
  const payload = {
    destination: form.destination.trim(),
    days: Number(form.days),
    budget: Number(form.budget),
  };
  if (selectedTripId.value != null) {
    payload.tripId = Number(selectedTripId.value);
  }

  try {
    result.value = await getSuggestion(payload);
  } catch (error) {
    hasError.value = true;
    errorMessage.value =
      error?.response?.data?.error?.message ||
      error?.message ||
      '网络异常，请稍后重试';
  } finally {
    generating.value = false;
  }
}

/**
 * 打开一键导入对话框。
 * @returns {void}
 */
function openImportDialog() {
  importTripId.value = selectedTripId.value;
  importCheckedKeys.value = flatImportItems.value.map((item) => item.key);
  importDialogVisible.value = true;
}

/**
 * 确认批量导入景点。
 * @returns {Promise<void>}
 */
async function confirmImport() {
  if (importTripId.value == null) {
    ElMessage.warning('请选择要导入到的行程');
    return;
  }
  if (importCheckedKeys.value.length === 0) {
    ElMessage.warning('请至少勾选一个条目');
    return;
  }

  const keySet = new Set(importCheckedKeys.value);
  const items = flatImportItems.value
    .filter((item) => keySet.has(item.key))
    .map((item) => ({
      name: item.name,
      type: item.type,
      estimatedCost: item.estimatedCost,
      status: '待去',
    }));

  importing.value = true;
  try {
    const created = await bulkCreateSpots(importTripId.value, { items });
    const count = created.length;
    const targetId = importTripId.value;
    importDialogVisible.value = false;
    ElMessage({
      type: 'success',
      duration: 6000,
      message: h('span', { class: 'import-success-msg' }, [
        `已导入 ${count} 个景点 `,
        h(
          'a',
          {
            href: 'javascript:void(0)',
            style: 'color:#0e9f8e;margin-left:8px;font-weight:600;',
            onClick: (event) => {
              event.preventDefault();
              router.push(`/trips/${targetId}`);
            },
          },
          '查看行程详情',
        ),
      ]),
    });
  } catch {
    // 错误已由 http 拦截器提示
  } finally {
    importing.value = false;
  }
}

onMounted(loadTrips);
</script>

<template>
  <div class="assistant">
    <!-- A. 输入区 -->
    <section class="panel">
      <h1 class="panel__title">AI 行程助手</h1>
      <p class="panel__desc">填写目的地与预算，一键生成可落地的行程草案</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="108px"
        class="assistant-form"
      >
        <el-form-item label="从已有行程带入">
          <el-select
            v-model="selectedTripId"
            clearable
            filterable
            placeholder="可选：选择行程自动填充"
            style="width: 100%"
            @change="handleTripSelect"
          >
            <el-option
              v-for="trip in trips"
              :key="trip.id"
              :label="`${trip.name}（${trip.destination}）`"
              :value="trip.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目的地" prop="destination">
          <el-input
            v-model="form.destination"
            maxlength="50"
            show-word-limit
            placeholder="例如：青岛"
          />
        </el-form-item>
        <el-form-item label="出行天数" prop="days">
          <el-input-number
            v-model="form.days"
            :min="1"
            :max="15"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="预算" prop="budget">
          <el-input-number
            v-model="form.budget"
            :min="0"
            :precision="2"
            :step="100"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="generating"
            :disabled="generating"
            @click="generateSuggestion"
          >
            {{ generating ? 'AI 正在规划中…' : '生成行程建议' }}
          </el-button>
        </el-form-item>
      </el-form>
    </section>

    <!-- B. 结果区 -->
    <section class="panel result-panel">
      <!-- 生成中 -->
      <div v-if="generating" class="result-loading">
        <el-skeleton :rows="8" animated />
        <p class="result-loading__hint">
          正在调用 DeepSeek 生成建议，通常需要 10-20 秒
        </p>
      </div>

      <!-- 网络错误 -->
      <el-result
        v-else-if="hasError"
        icon="error"
        title="生成失败"
        :sub-title="errorMessage || '网络异常，请稍后重试'"
      >
        <template #extra>
          <el-button type="primary" @click="generateSuggestion">重试</el-button>
        </template>
      </el-result>

      <!-- 未生成 -->
      <el-empty
        v-else-if="!hasResult"
        description="填写上方表单，点击「生成行程建议」开始规划"
      />

      <!-- 结果 -->
      <div v-else class="result-body">
        <div class="result-toolbar">
          <el-button type="primary" plain @click="openImportDialog">
            一键导入为景点清单
          </el-button>
        </div>

        <!-- 来源徽章 -->
        <div class="source-row">
          <el-tag
            v-if="result.source === 'deepseek'"
            type="success"
            effect="dark"
            size="large"
          >
            DeepSeek 真实调用
          </el-tag>
          <template v-else>
            <el-tag type="warning" effect="dark" size="large">Mock 降级</el-tag>
            <span v-if="result.fallbackReason" class="fallback-reason">
              {{ result.fallbackReason }}
            </span>
          </template>
          <span class="generated-at">
            {{ formatGeneratedAt(result.generatedAt) }}
          </span>
        </div>

        <!-- 总述 -->
        <p class="summary">{{ result.data.summary }}</p>

        <!-- 按天日程 -->
        <h2 class="section-title">每日安排</h2>
        <el-timeline>
          <el-timeline-item
            v-for="day in result.data.days"
            :key="day.day"
            :timestamp="`第 ${day.day} 天 · ${day.title}`"
            placement="top"
            color="#0e9f8e"
          >
            <div class="day-items">
              <div
                v-for="(item, index) in day.items"
                :key="`${day.day}-${index}`"
                class="day-item"
              >
                <div class="day-item__time">{{ item.time }}</div>
                <div class="day-item__main">
                  <div class="day-item__name">{{ item.name }}</div>
                  <div class="day-item__meta">
                    <el-tag
                      size="small"
                      effect="light"
                      :type="spotTypeTagType(item.type)"
                    >
                      {{ item.type }}
                    </el-tag>
                    <span class="day-item__cost">{{
                      formatMoney(item.estimatedCost)
                    }}</span>
                  </div>
                  <p v-if="item.note" class="day-item__note">{{ item.note }}</p>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>

        <!-- 预算分配 -->
        <h2 class="section-title">预算分配</h2>
        <div class="budget-plan">
          <div
            v-for="plan in result.data.budgetPlan"
            :key="plan.category"
            class="budget-plan__row"
          >
            <div class="budget-plan__head">
              <span class="budget-plan__cat">{{ plan.category }}</span>
              <span class="budget-plan__amount">{{
                formatMoney(plan.amount)
              }}</span>
            </div>
            <el-progress
              :percentage="Number(plan.percent) || 0"
              :stroke-width="12"
              color="#0e9f8e"
            />
            <p v-if="plan.note" class="budget-plan__note">{{ plan.note }}</p>
          </div>
        </div>

        <!-- 贴士 -->
        <h2 class="section-title">旅行贴士</h2>
        <ul class="tips">
          <li v-for="(tip, index) in result.data.tips" :key="index" class="tip">
            <span class="tip__icon">✓</span>
            <span>{{ tip }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- C. 一键导入 -->
    <el-dialog
      v-model="importDialogVisible"
      title="一键导入为景点清单"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="96px">
        <el-form-item label="导入到行程">
          <el-select
            v-model="importTripId"
            filterable
            placeholder="选择行程"
            style="width: 100%"
          >
            <el-option
              v-for="trip in trips"
              :key="trip.id"
              :label="`${trip.name}（${trip.destination}）`"
              :value="trip.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择条目">
          <el-checkbox-group v-model="importCheckedKeys" class="import-checks">
            <el-checkbox
              v-for="item in flatImportItems"
              :key="item.key"
              :label="item.key"
              :value="item.key"
            >
              第{{ item.day }}天 · {{ item.time }} · {{ item.name }}
              <el-tag
                size="small"
                class="import-type"
                :type="spotTypeTagType(item.type)"
              >
                {{ item.type }}
              </el-tag>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="importing"
          @click="confirmImport"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.assistant {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  background: #fff;
  border-radius: 16px;
  padding: 22px 22px 20px;
  box-shadow: 0 10px 28px rgba(31, 45, 43, 0.06);
  border: 1px solid rgba(14, 159, 142, 0.08);
}

.panel__title {
  margin: 0 0 6px;
  font-size: 22px;
  color: #1f2d2b;
}

.panel__desc {
  margin: 0 0 18px;
  color: #6b7f7b;
  font-size: 14px;
}

.assistant-form {
  max-width: 560px;
}

.result-panel {
  min-height: 280px;
}

.result-loading__hint {
  margin: 16px 0 0;
  text-align: center;
  color: #8a9c98;
  font-size: 13px;
}

.result-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.source-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.fallback-reason {
  color: #909399;
  font-size: 13px;
}

.generated-at {
  margin-left: auto;
  color: #8a9c98;
  font-size: 13px;
}

.summary {
  margin: 0 0 22px;
  font-size: 17px;
  line-height: 1.6;
  color: #1f2d2b;
  font-weight: 600;
}

.section-title {
  margin: 0 0 14px;
  font-size: 16px;
  color: #1f2d2b;
}

.day-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-item {
  display: flex;
  gap: 12px;
  background: #f7fbfa;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(14, 159, 142, 0.08);
}

.day-item__time {
  flex: 0 0 48px;
  color: #0e9f8e;
  font-weight: 700;
  font-size: 13px;
  padding-top: 2px;
}

.day-item__main {
  flex: 1;
  min-width: 0;
}

.day-item__name {
  font-weight: 600;
  color: #1f2d2b;
  margin-bottom: 6px;
}

.day-item__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.day-item__cost {
  font-size: 13px;
  color: #6b7f7b;
}

.day-item__note {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8a9c98;
}

.budget-plan {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 22px;
}

.budget-plan__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.budget-plan__cat {
  font-weight: 600;
  color: #1f2d2b;
}

.budget-plan__amount {
  color: #1f2d2b;
  font-weight: 600;
}

.budget-plan__note {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a9c98;
}

.tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #f7fbfa;
  border-radius: 12px;
  padding: 12px 14px;
  color: #1f2d2b;
  line-height: 1.5;
}

.tip__icon {
  color: #0e9f8e;
  font-weight: 700;
}

.import-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
  width: 100%;
}

.import-type {
  margin-left: 8px;
}

@media (max-width: 640px) {
  .generated-at {
    margin-left: 0;
    width: 100%;
  }
}
</style>
