<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit } from '@element-plus/icons-vue';
import {
  createTrip,
  deleteTrip,
  listTrips,
  updateTrip,
} from '../api/trips.js';
import { formatMoney } from '../utils/format.js';

const router = useRouter();

/** @type {import('vue').Ref<object[]>} */
const trips = ref([]);
/** @type {import('vue').Ref<boolean>} */
const loading = ref(false);
/** @type {import('vue').Ref<boolean>} */
const dialogVisible = ref(false);
/** @type {import('vue').Ref<boolean>} */
const submitting = ref(false);
/** @type {import('vue').Ref<number|null>} */
const editingId = ref(null);
/** @type {import('vue').Ref<import('element-plus').FormInstance|null>} */
const formRef = ref(null);

const form = reactive({
  name: '',
  destination: '',
  dateRange: /** @type {string[]|null} */ (null),
  budget: 0,
  note: '',
});

const formRules = {
  name: [
    { required: true, message: '请输入行程名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度为 1–50 个字符', trigger: 'blur' },
  ],
  destination: [
    { required: true, message: '请输入目的地', trigger: 'blur' },
    { min: 1, max: 50, message: '目的地长度为 1–50 个字符', trigger: 'blur' },
  ],
  dateRange: [
    {
      required: true,
      type: 'array',
      message: '请选择日期区间',
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

const dialogTitle = computed(() =>
  editingId.value == null ? '新建行程' : '编辑行程',
);

/**
 * 重置表单到初始状态。
 * @returns {void}
 */
function resetForm() {
  form.name = '';
  form.destination = '';
  form.dateRange = null;
  form.budget = 0;
  form.note = '';
  editingId.value = null;
  formRef.value?.clearValidate();
}

/**
 * 加载行程列表。
 * @returns {Promise<void>}
 */
async function loadTrips() {
  loading.value = true;
  try {
    trips.value = await listTrips();
  } catch {
    // 错误已由 http 拦截器提示
  } finally {
    loading.value = false;
  }
}

/**
 * 打开新建对话框。
 * @returns {void}
 */
function openCreateDialog() {
  resetForm();
  dialogVisible.value = true;
}

/**
 * 打开编辑对话框。
 * @param {object} trip 行程对象
 * @param {MouseEvent} event 点击事件
 * @returns {void}
 */
function openEditDialog(trip, event) {
  event.stopPropagation();
  editingId.value = trip.id;
  form.name = trip.name;
  form.destination = trip.destination;
  form.dateRange = [trip.startDate, trip.endDate];
  form.budget = Number(trip.budget);
  form.note = trip.note ?? '';
  dialogVisible.value = true;
}

/**
 * 提交新建或编辑表单。
 * @returns {Promise<void>}
 */
async function submitForm() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  const [startDate, endDate] = form.dateRange || [];
  const payload = {
    name: form.name.trim(),
    destination: form.destination.trim(),
    startDate,
    endDate,
    budget: Number(form.budget),
    note: form.note.trim() ? form.note.trim() : null,
  };

  submitting.value = true;
  try {
    if (editingId.value == null) {
      await createTrip(payload);
      ElMessage.success('创建成功');
    } else {
      await updateTrip(editingId.value, payload);
      ElMessage.success('更新成功');
    }
    dialogVisible.value = false;
    resetForm();
    await loadTrips();
  } catch {
    // 错误已由 http 拦截器提示
  } finally {
    submitting.value = false;
  }
}

/**
 * 删除行程（二次确认）。
 * @param {object} trip 行程对象
 * @param {MouseEvent} event 点击事件
 * @returns {Promise<void>}
 */
async function handleDelete(trip, event) {
  event.stopPropagation();
  try {
    await ElMessageBox.confirm(
      `确定删除「${trip.name}」吗？将同时删除该行程下的所有景点与费用记录。`,
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
    await deleteTrip(trip.id);
    ElMessage.success('删除成功');
    await loadTrips();
  } catch {
    // 错误已由 http 拦截器提示
  }
}

/**
 * 进入行程详情页。
 * @param {number} id 行程 ID
 * @returns {void}
 */
function goDetail(id) {
  router.push(`/trips/${id}`);
}

/**
 * 对话框关闭时重置表单。
 * @returns {void}
 */
function handleDialogClosed() {
  resetForm();
}

onMounted(() => {
  loadTrips();
});
</script>

<template>
  <div class="trip-list" v-loading="loading">
    <div class="trip-list__toolbar">
      <div>
        <h1 class="trip-list__title">我的行程</h1>
        <p class="trip-list__desc">规划旅行、管理预算，从这里开始</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">+ 新建行程</el-button>
    </div>

    <el-empty
      v-if="!loading && trips.length === 0"
      description="还没有行程，点击右上角创建你的第一次旅行"
    />

    <div v-else class="trip-grid">
      <article
        v-for="trip in trips"
        :key="trip.id"
        class="trip-card"
        @click="goDetail(trip.id)"
      >
        <div class="trip-card__actions">
          <el-button
            circle
            size="small"
            :icon="Edit"
            @click="openEditDialog(trip, $event)"
          />
          <el-button
            circle
            size="small"
            type="danger"
            plain
            :icon="Delete"
            @click="handleDelete(trip, $event)"
          />
        </div>
        <h2 class="trip-card__name">{{ trip.name }}</h2>
        <p class="trip-card__dest">{{ trip.destination }}</p>
        <p class="trip-card__dates">
          {{ trip.startDate }} ~ {{ trip.endDate }}
        </p>
        <p class="trip-card__budget">{{ formatMoney(trip.budget) }}</p>
      </article>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="88px"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="form.name"
            maxlength="50"
            show-word-limit
            placeholder="例如：周末青岛两日游"
          />
        </el-form-item>
        <el-form-item label="目的地" prop="destination">
          <el-input
            v-model="form.destination"
            maxlength="50"
            show-word-limit
            placeholder="例如：青岛"
          />
        </el-form-item>
        <el-form-item label="日期区间" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
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
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="可选"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.trip-list__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.trip-list__title {
  margin: 0;
  font-size: 24px;
  color: #1f2d2b;
}

.trip-list__desc {
  margin: 8px 0 0;
  color: #6b7f7b;
  font-size: 14px;
}

.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.trip-card {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 22px 20px 20px;
  box-shadow: 0 10px 28px rgba(31, 45, 43, 0.06);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  border: 1px solid rgba(14, 159, 142, 0.08);
}

.trip-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 32px rgba(14, 159, 142, 0.14);
}

.trip-card__actions {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  gap: 6px;
}

.trip-card__name {
  margin: 0 56px 10px 0;
  font-size: 18px;
  color: #1f2d2b;
  line-height: 1.35;
}

.trip-card__dest {
  margin: 0 0 8px;
  color: #0e9f8e;
  font-weight: 600;
}

.trip-card__dates {
  margin: 0 0 14px;
  color: #6b7f7b;
  font-size: 13px;
}

.trip-card__budget {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2d2b;
}
</style>
