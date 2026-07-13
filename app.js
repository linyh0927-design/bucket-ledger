const STORAGE_KEY = "bucket-budget-ledger-v1";

const defaultBuckets = [
  { id: "fixed", name: "固定開銷桶", monthlyAllocationAmount: 0, isRemainderBucket: false, priority: 1, active: true, initialBalance: 0, kind: "spending" },
  { id: "life", name: "生活桶", monthlyAllocationAmount: 90000, isRemainderBucket: false, priority: 2, active: true, initialBalance: 0, kind: "spending" },
  { id: "etf", name: "ETF", monthlyAllocationAmount: 50000, isRemainderBucket: false, priority: 3, active: true, initialBalance: 0, kind: "investment" },
  { id: "travel", name: "旅遊桶", monthlyAllocationAmount: 25000, isRemainderBucket: false, priority: 4, active: true, initialBalance: 0, kind: "spending" },
  { id: "large", name: "大額支出桶", monthlyAllocationAmount: 10000, isRemainderBucket: false, priority: 5, active: true, initialBalance: 0, kind: "spending" },
  { id: "savings", name: "儲蓄", monthlyAllocationAmount: 0, isRemainderBucket: true, priority: 6, active: true, initialBalance: 0, kind: "saving" },
];

const lifeCategories = ["房租", "孝親", "學貸", "飲食", "日用品", "交通", "水電瓦斯", "電話網路", "社交娛樂", "成長學習", "醫療", "其他"];

const categoryGroups = {
  fixed: {
    label: "固定開銷",
    defaultBucketId: "fixed",
    defaultCategory: "房租",
    categories: lifeCategories,
  },
  life: {
    label: "生活",
    defaultBucketId: "life",
    defaultCategory: "飲食",
    categories: lifeCategories,
  },
  travel: {
    label: "旅遊",
    defaultBucketId: "travel",
    defaultCategory: "交通",
    categories: ["交通", "住宿", "飲食", "購物", "娛樂", "其他"],
  },
  large: {
    label: "大額支出",
    defaultBucketId: "large",
    defaultCategory: "飲食",
    categories: lifeCategories,
  },
};

const state = {
  data: {
    buckets: structuredClone(defaultBuckets),
    incomes: [],
    expenses: [],
    transfers: [],
  },
  selectedMonth: "",
  pieRangeMode: "month",
  bucketDetailSort: "date",
  activeBucketDetailId: null,
  entryMode: "expense",
  editing: null,
  deferredInstallPrompt: null,
};

const els = {
  installBtn: document.querySelector("#installBtn"),
  selectedMonth: document.querySelector("#selectedMonth"),
  jumpCurrentMonth: document.querySelector("#jumpCurrentMonth"),
  monthIncome: document.querySelector("#monthIncome"),
  monthSpent: document.querySelector("#monthSpent"),
  monthAllocated: document.querySelector("#monthAllocated"),
  bucketAsOfLabel: document.querySelector("#bucketAsOfLabel"),
  bucketCards: document.querySelector("#bucketCards"),
  savingsBalance: document.querySelector("#savingsBalance"),
  etfInvested: document.querySelector("#etfInvested"),
  expenseForm: document.querySelector("#expenseForm"),
  incomeForm: document.querySelector("#incomeForm"),
  transferForm: document.querySelector("#transferForm"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseDate: document.querySelector("#expenseDate"),
  categoryGroup: document.querySelector("#categoryGroup"),
  categoryLabel: document.querySelector("#categoryLabel"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseBucket: document.querySelector("#expenseBucket"),
  expenseItem: document.querySelector("#expenseItem"),
  incomeAmount: document.querySelector("#incomeAmount"),
  incomeDate: document.querySelector("#incomeDate"),
  allocationPreview: document.querySelector("#allocationPreview"),
  transferAmount: document.querySelector("#transferAmount"),
  transferDate: document.querySelector("#transferDate"),
  fromBucket: document.querySelector("#fromBucket"),
  toBucket: document.querySelector("#toBucket"),
  transferNote: document.querySelector("#transferNote"),
  expenseSubmit: document.querySelector("#expenseSubmit"),
  incomeSubmit: document.querySelector("#incomeSubmit"),
  transferSubmit: document.querySelector("#transferSubmit"),
  expenseCancelEdit: document.querySelector("#expenseCancelEdit"),
  incomeCancelEdit: document.querySelector("#incomeCancelEdit"),
  transferCancelEdit: document.querySelector("#transferCancelEdit"),
  recentRecords: document.querySelector("#recentRecords"),
  historyRecords: document.querySelector("#historyRecords"),
  historyCount: document.querySelector("#historyCount"),
  reportMonthLabel: document.querySelector("#reportMonthLabel"),
  monthlyReport: document.querySelector("#monthlyReport"),
  categoryAnalysis: document.querySelector("#categoryAnalysis"),
  trendList: document.querySelector("#trendList"),
  bucketUsage: document.querySelector("#bucketUsage"),
  pieRangeLabel: document.querySelector("#pieRangeLabel"),
  customPieRange: document.querySelector("#customPieRange"),
  pieStartDate: document.querySelector("#pieStartDate"),
  pieEndDate: document.querySelector("#pieEndDate"),
  expensePie: document.querySelector("#expensePie"),
  settingsForm: document.querySelector("#settingsForm"),
  bucketSettings: document.querySelector("#bucketSettings"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  bucketDetailOverlay: document.querySelector("#bucketDetailOverlay"),
  bucketDetailClose: document.querySelector("#bucketDetailClose"),
  bucketDetailRange: document.querySelector("#bucketDetailRange"),
  bucketDetailTitle: document.querySelector("#bucketDetailTitle"),
  bucketDetailSummary: document.querySelector("#bucketDetailSummary"),
  bucketDetailContent: document.querySelector("#bucketDetailContent"),
  bucketDetailSort: document.querySelector("#bucketDetailSort"),
  emptyTemplate: document.querySelector("#emptyTemplate"),
};

const money = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return toLocalISO(new Date());
}

function currentMonth() {
  return todayISO().slice(0, 7);
}

function monthStart(month) {
  return `${month}-01`;
}

function monthEnd(month) {
  const [year, index] = month.split("-").map(Number);
  return toLocalISO(new Date(year, index, 0));
}

function shiftMonth(month, offset) {
  const [year, index] = month.split("-").map(Number);
  return toLocalISO(new Date(year, index - 1 + offset, 1)).slice(0, 7);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function cloneBuckets() {
  return structuredClone(defaultBuckets);
}

function normalizeData(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const savedBuckets = Array.isArray(data.buckets) ? data.buckets : [];
  const buckets = cloneBuckets().map((bucket) => {
    const saved = savedBuckets.find((item) => item.id === bucket.id) || {};
    return {
      ...bucket,
      monthlyAllocationAmount: saved.monthlyAllocationAmount ?? bucket.monthlyAllocationAmount,
      initialBalance: saved.initialBalance ?? bucket.initialBalance,
      active: saved.active ?? bucket.active,
    };
  });
  return {
    buckets,
    incomes: Array.isArray(data.incomes) ? data.incomes : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    transfers: Array.isArray(data.transfers) ? data.transfers : [],
  };
}
function loadData() {
  try {
    state.data = normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    state.data = normalizeData(null);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function bucketById(id) {
  return state.data.buckets.find((bucket) => bucket.id === id);
}

function activeBuckets() {
  return state.data.buckets.filter((bucket) => bucket.active);
}

function bucketOptions(selectedId = "") {
  return activeBuckets()
    .map((bucket) => `<option value="${bucket.id}" ${bucket.id === selectedId ? "selected" : ""}>${escapeHtml(bucket.name)}</option>`)
    .join("");
}

function allocateIncome(amount) {
  let remaining = Math.max(0, Number(amount) || 0);
  const allocations = {};
  const buckets = activeBuckets().slice().sort((a, b) => a.priority - b.priority);

  buckets
    .filter((bucket) => !bucket.isRemainderBucket)
    .forEach((bucket) => {
      const allocation = Math.min(remaining, Number(bucket.monthlyAllocationAmount) || 0);
      allocations[bucket.id] = allocation;
      remaining -= allocation;
    });

  const remainderBucket = buckets.find((bucket) => bucket.isRemainderBucket);
  if (remainderBucket) {
    allocations[remainderBucket.id] = remaining;
  }

  return allocations;
}

function incomeAllocations(income) {
  return income.allocations && typeof income.allocations === "object" ? income.allocations : allocateIncome(income.amount);
}

function eventsUntil(date) {
  return {
    incomes: state.data.incomes.filter((item) => item.date <= date),
    expenses: state.data.expenses.filter((item) => item.date <= date),
    transfers: state.data.transfers.filter((item) => item.date <= date),
  };
}

function balanceMapThrough(date) {
  const balances = Object.fromEntries(state.data.buckets.map((bucket) => [bucket.id, Number(bucket.initialBalance) || 0]));
  const events = eventsUntil(date);

  events.incomes.forEach((income) => {
    Object.entries(incomeAllocations(income)).forEach(([bucketId, amount]) => {
      balances[bucketId] = (balances[bucketId] || 0) + Number(amount || 0);
    });
  });

  events.expenses.forEach((expense) => {
    balances[expense.bucketId] = (balances[expense.bucketId] || 0) - Number(expense.amount || 0);
  });

  events.transfers.forEach((transfer) => {
    balances[transfer.fromBucketId] = (balances[transfer.fromBucketId] || 0) - Number(transfer.amount || 0);
    balances[transfer.toBucketId] = (balances[transfer.toBucketId] || 0) + Number(transfer.amount || 0);
  });

  return balances;
}

function sumByBucket(records, bucketKey, amountKey = "amount") {
  const map = {};
  records.forEach((record) => {
    map[record[bucketKey]] = (map[record[bucketKey]] || 0) + Number(record[amountKey] || 0);
  });
  return map;
}

function monthlySnapshot(month) {
  const start = monthStart(month);
  const end = monthEnd(month);
  const dateBeforeStart = toLocalISO(new Date(new Date(`${start}T00:00:00`).getTime() - 86400000));
  const opening = start <= "1900-01-01" ? {} : balanceMapThrough(dateBeforeStart);
  const monthIncomes = state.data.incomes.filter((item) => item.date >= start && item.date <= end);
  const monthExpenses = state.data.expenses.filter((item) => item.date >= start && item.date <= end);
  const monthTransfers = state.data.transfers.filter((item) => item.date >= start && item.date <= end);
  const allocated = {};
  monthIncomes.forEach((income) => {
    Object.entries(incomeAllocations(income)).forEach(([bucketId, amount]) => {
      allocated[bucketId] = (allocated[bucketId] || 0) + Number(amount || 0);
    });
  });
  const spent = sumByBucket(monthExpenses, "bucketId");
  const transferIn = sumByBucket(monthTransfers, "toBucketId");
  const transferOut = sumByBucket(monthTransfers, "fromBucketId");

  return state.data.buckets.map((bucket) => {
    const openingBalance = Number(opening[bucket.id] || bucket.initialBalance || 0);
    const allocatedIn = Number(allocated[bucket.id] || 0);
    const spentOut = Number(spent[bucket.id] || 0);
    const inAmount = Number(transferIn[bucket.id] || 0);
    const outAmount = Number(transferOut[bucket.id] || 0);
    return {
      bucket,
      openingBalance,
      allocatedIn,
      spent: spentOut,
      transferIn: inAmount,
      transferOut: outAmount,
      closingBalance: openingBalance + allocatedIn - spentOut + inAmount - outAmount,
    };
  });
}

function monthRecords(month) {
  const start = monthStart(month);
  const end = monthEnd(month);
  return {
    incomes: state.data.incomes.filter((item) => item.date >= start && item.date <= end),
    expenses: state.data.expenses.filter((item) => item.date >= start && item.date <= end),
    transfers: state.data.transfers.filter((item) => item.date >= start && item.date <= end),
  };
}

function combinedRecords(records) {
  return [
    ...records.expenses.map((item) => ({ ...item, recordType: "expense" })),
    ...records.incomes.map((item) => ({ ...item, recordType: "income" })),
    ...records.transfers.map((item) => ({ ...item, recordType: "transfer" })),
  ].sort((a, b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`));
}

function allCombinedRecords() {
  return combinedRecords({
    incomes: state.data.incomes,
    expenses: state.data.expenses,
    transfers: state.data.transfers,
  });
}

function renderDashboard() {
  const records = monthRecords(state.selectedMonth);
  const snapshot = monthlySnapshot(state.selectedMonth);
  const incomeTotal = records.incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const spentTotal = records.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const allocatedTotal = snapshot.reduce((sum, item) => sum + item.allocatedIn, 0);
  const balances = balanceMapThrough(state.selectedMonth === currentMonth() ? todayISO() : monthEnd(state.selectedMonth));

  els.monthIncome.textContent = money.format(incomeTotal);
  els.monthSpent.textContent = money.format(spentTotal);
  els.monthAllocated.textContent = money.format(allocatedTotal);
  els.bucketAsOfLabel.textContent = state.selectedMonth === currentMonth() ? "截至今天" : "月底餘額";
  els.savingsBalance.textContent = money.format(balances.savings || 0);
  els.etfInvested.textContent = money.format(totalEtfInvestedThrough(state.selectedMonth === currentMonth() ? todayISO() : monthEnd(state.selectedMonth)));

  els.bucketCards.innerHTML = snapshot
    .map(({ bucket, allocatedIn, spent, transferIn, transferOut }) => {
      const balance = balances[bucket.id] || 0;
      return `
        <article class="bucket-card interactive-card" data-bucket-detail-id="${escapeHtml(bucket.id)}" tabindex="0" role="button" aria-label="查看 ${escapeHtml(bucket.name)} 支出明細">
          <header>
            <div>
              <strong>${escapeHtml(bucket.name)}</strong>
              <span class="pill ${bucket.kind}">${bucket.isRemainderBucket ? "剩餘收入" : "固定分配"}</span>
            </div>
            <div class="bucket-balance ${balance < 0 ? "negative" : ""}">${money.format(balance)}</div>
          </header>
          <div class="bucket-meta">
            <span>本月新增 <b>${money.format(allocatedIn)}</b></span>
            <span>本月支出 <b>${money.format(spent)}</b></span>
            <span>轉入 <b>${money.format(transferIn)}</b></span>
            <span>轉出 <b>${money.format(transferOut)}</b></span>
          </div>
        </article>
      `;
    })
    .join("");
}

function totalEtfInvestedThrough(date) {
  const allocated = state.data.incomes
    .filter((income) => income.date <= date)
    .reduce((sum, income) => sum + Number(incomeAllocations(income).etf || 0), 0);
  const transferIn = state.data.transfers
    .filter((transfer) => transfer.date <= date && transfer.toBucketId === "etf")
    .reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);
  return allocated + transferIn;
}

function renderAllocationPreview() {
  const amount = Number(els.incomeAmount.value || 0);
  const allocations = allocateIncome(amount);
  const total = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  els.allocationPreview.innerHTML = activeBuckets()
    .sort((a, b) => a.priority - b.priority)
    .map((bucket) => {
      const value = allocations[bucket.id] || 0;
      const percent = total ? Math.round((value / total) * 100) : 0;
      return `
        <div class="allocation-line">
          <div><strong>${escapeHtml(bucket.name)}</strong><span>${money.format(value)}</span></div>
          <div class="bar"><span style="width:${percent}%"></span></div>
        </div>
      `;
    })
    .join("");
}

function renderRecentRecords() {
  const records = allCombinedRecords().slice(0, 12);

  if (!records.length) {
    els.recentRecords.replaceChildren(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  els.recentRecords.innerHTML = records.map(renderRecord).join("");
}

function renderHistoryRecords() {
  const records = combinedRecords(monthRecords(state.selectedMonth));
  els.historyCount.textContent = `${records.length} 筆`;

  if (!records.length) {
    els.historyRecords.replaceChildren(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  els.historyRecords.innerHTML = records.map(renderRecord).join("");
}

function renderRecord(record) {
  if (record.recordType === "income") {
    return `
      <article class="record income">
        <header><strong>收入</strong><span class="amount">${money.format(record.amount)}</span></header>
        <div class="record-meta">${escapeHtml(record.date)}｜自動分桶</div>
        <div class="record-actions">
          <button class="edit-button" data-edit-type="income" data-edit-id="${record.id}" type="button">編輯</button>
          <button class="delete-button" data-delete-type="income" data-delete-id="${record.id}" type="button">刪除</button>
        </div>
      </article>
    `;
  }

  if (record.recordType === "transfer") {
    return `
      <article class="record transfer">
        <header><strong>桶轉移</strong><span class="amount">${money.format(record.amount)}</span></header>
        <div class="record-meta">${escapeHtml(record.date)}｜${escapeHtml(bucketById(record.fromBucketId)?.name)} → ${escapeHtml(bucketById(record.toBucketId)?.name)}${record.note ? `｜${escapeHtml(record.note)}` : ""}</div>
        <div class="record-actions">
          <button class="edit-button" data-edit-type="transfer" data-edit-id="${record.id}" type="button">編輯</button>
          <button class="delete-button" data-delete-type="transfer" data-delete-id="${record.id}" type="button">刪除</button>
        </div>
      </article>
    `;
  }

  return `
    <article class="record expense">
      <header><strong>${escapeHtml(record.itemName || record.category)}</strong><span class="amount">-${money.format(record.amount)}</span></header>
      <div class="record-meta">${escapeHtml(record.date)}｜${escapeHtml(categoryGroups[record.categoryGroup]?.label)} / ${escapeHtml(record.category)}｜扣 ${escapeHtml(bucketById(record.bucketId)?.name)}</div>
      <div class="record-actions">
        <button class="edit-button" data-edit-type="expense" data-edit-id="${record.id}" type="button">編輯</button>
        <button class="delete-button" data-delete-type="expense" data-delete-id="${record.id}" type="button">刪除</button>
      </div>
    </article>
  `;
}

function renderMonthlyReport() {
  const snapshot = monthlySnapshot(state.selectedMonth);
  els.reportMonthLabel.textContent = state.selectedMonth;
  els.monthlyReport.innerHTML = snapshot
    .map(({ bucket, openingBalance, allocatedIn, spent, transferIn, transferOut, closingBalance }) => `
      <article class="report-row interactive-card" data-bucket-detail-id="${escapeHtml(bucket.id)}" tabindex="0" role="button" aria-label="查看 ${escapeHtml(bucket.name)} 支出明細">
        <header><strong>${escapeHtml(bucket.name)}</strong><span class="${closingBalance < 0 ? "negative" : ""}">${money.format(closingBalance)}</span></header>
        <div class="report-grid">
          <span>期初 <b>${money.format(openingBalance)}</b></span>
          <span>新增 <b>${money.format(allocatedIn)}</b></span>
          <span>支出 <b>${money.format(spent)}</b></span>
          <span>轉入 <b>${money.format(transferIn)}</b></span>
          <span>轉出 <b>${money.format(transferOut)}</b></span>
          <span>期末 <b>${money.format(closingBalance)}</b></span>
        </div>
      </article>
    `)
    .join("");
}

function sortBucketDetailRecords(records) {
  return records.slice().sort((a, b) => {
    if (state.bucketDetailSort === "amount") {
      return Number(b.amount || 0) - Number(a.amount || 0) || b.date.localeCompare(a.date);
    }
    return b.date.localeCompare(a.date) || Number(b.amount || 0) - Number(a.amount || 0);
  });
}

function recordsForBucketDetail(bucketId, month) {
  const records = monthRecords(month);
  const expenses = sortBucketDetailRecords(records.expenses.filter((record) => record.bucketId === bucketId));
  const transfersOut = sortBucketDetailRecords(records.transfers.filter((record) => record.fromBucketId === bucketId));
  return { expenses, transfersOut };
}

function renderBucketDetailList(title, records, renderItem) {
  if (!records.length) {
    return `<section class="detail-section"><h3>${escapeHtml(title)}</h3><div class="empty-state compact"><strong>沒有紀錄</strong><p>這個月份沒有${escapeHtml(title)}。</p></div></section>`;
  }
  return `
    <section class="detail-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="detail-list">${records.map(renderItem).join("")}</div>
    </section>
  `;
}

function renderBucketDetail(bucketId) {
  const bucket = bucketById(bucketId);
  if (!bucket) return;
  const month = state.selectedMonth;
  const { expenses, transfersOut } = recordsForBucketDetail(bucketId, month);
  const spentTotal = expenses.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const transferOutTotal = transfersOut.reduce((sum, record) => sum + Number(record.amount || 0), 0);

  document.querySelectorAll("[data-bucket-detail-sort]").forEach((button) => {
    button.classList.toggle("active", button.dataset.bucketDetailSort === state.bucketDetailSort);
  });
  els.bucketDetailRange.textContent = `${month} 桶明細`;
  els.bucketDetailTitle.textContent = bucket.name;
  els.bucketDetailSummary.innerHTML = `
    <article><span>支出合計</span><strong>${money.format(spentTotal)}</strong></article>
    <article><span>轉出合計</span><strong>${money.format(transferOutTotal)}</strong></article>
  `;
  els.bucketDetailContent.innerHTML = `
    ${renderBucketDetailList("支出明細", expenses, (record) => `
      <article class="detail-item expense">
        <div><strong>${escapeHtml(record.itemName || record.category)}</strong><span>${escapeHtml(record.date)}｜${escapeHtml(categoryGroups[record.categoryGroup]?.label || record.categoryGroup)} / ${escapeHtml(record.category)}</span></div>
        <b>-${money.format(record.amount)}</b>
      </article>
    `)}
    ${renderBucketDetailList("轉出紀錄", transfersOut, (record) => `
      <article class="detail-item transfer">
        <div><strong>轉到 ${escapeHtml(bucketById(record.toBucketId)?.name || record.toBucketId)}</strong><span>${escapeHtml(record.date)}${record.note ? `｜${escapeHtml(record.note)}` : ""}</span></div>
        <b>-${money.format(record.amount)}</b>
      </article>
    `)}
  `;
}

function openBucketDetail(bucketId) {
  state.activeBucketDetailId = bucketId;
  renderBucketDetail(bucketId);
  els.bucketDetailOverlay.classList.remove("hidden");
  els.bucketDetailOverlay.setAttribute("aria-hidden", "false");
  els.bucketDetailClose.focus();
}
function closeBucketDetail() {
  els.bucketDetailOverlay.classList.add("hidden");
  els.bucketDetailOverlay.setAttribute("aria-hidden", "true");
}

function groupedAmounts(records, keyFn) {
  const map = new Map();
  records.forEach((record) => {
    const key = keyFn(record);
    map.set(key, (map.get(key) || 0) + Number(record.amount || 0));
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function renderRatioList(container, rows, total) {
  if (!rows.length) {
    container.replaceChildren(els.emptyTemplate.content.cloneNode(true));
    return;
  }
  container.innerHTML = rows
    .map(([label, amount]) => {
      const percent = total ? Math.round((amount / total) * 100) : 0;
      return `
        <div class="ratio-row">
          <div class="ratio-meta"><strong>${escapeHtml(label)}</strong><span>${money.format(amount)} / ${percent}%</span></div>
          <div class="bar"><span style="width:${percent}%"></span></div>
        </div>
      `;
    })
    .join("");
}

const pieColors = ["#1f7a4d", "#267f87", "#c94f68", "#8f6f19", "#6d5bd0", "#d17a22", "#3d7a99", "#7b8f24", "#9b4d83"];

function expensesBetween(start, end) {
  return state.data.expenses.filter((record) => record.date >= start && record.date <= end);
}

function activePieRange() {
  if (state.pieRangeMode === "year") {
    const year = state.selectedMonth.slice(0, 4);
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: `${year} 年` };
  }

  if (state.pieRangeMode === "custom") {
    const start = els.pieStartDate.value || monthStart(state.selectedMonth);
    const end = els.pieEndDate.value || monthEnd(state.selectedMonth);
    return start <= end
      ? { start, end, label: `${start} 到 ${end}` }
      : { start: end, end: start, label: `${end} 到 ${start}` };
  }

  return { start: monthStart(state.selectedMonth), end: monthEnd(state.selectedMonth), label: `${state.selectedMonth}` };
}

function compactPieRows(rows) {
  if (rows.length <= 8) return rows;
  const head = rows.slice(0, 7);
  const rest = rows.slice(7).reduce((sum, [, amount]) => sum + amount, 0);
  return [...head, ["其他分類", rest]];
}

function drawExpensePieCanvas(rows, total) {
  requestAnimationFrame(() => {
    const canvas = document.querySelector("#expensePieCanvas");
    const fallback = document.querySelector(".pie-disc-fallback");
    if (!canvas) return;

    const size = 260;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.hidden = true;
      if (fallback) fallback.style.display = "block";
      return;
    }
    if (fallback) fallback.style.display = "none";
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = 124;
    let startAngle = -Math.PI / 2;
    rows.forEach(([, amount], index) => {
      const endAngle = startAngle + (amount / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = pieColors[index % pieColors.length];
      ctx.fill();
      startAngle = endAngle;
    });

    ctx.beginPath();
    ctx.arc(center, center, 62, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#6b7280";
    ctx.font = "800 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("總支出", center, center - 13);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#17201b";
    ctx.font = "900 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(money.format(total), center, center + 11);
  });
}
function renderExpensePie() {
  document.querySelectorAll("[data-pie-range]").forEach((button) => {
    button.classList.toggle("active", button.dataset.pieRange === state.pieRangeMode);
  });
  els.customPieRange.classList.toggle("hidden", state.pieRangeMode !== "custom");

  const range = activePieRange();
  const expenses = expensesBetween(range.start, range.end);
  const rows = compactPieRows(groupedAmounts(expenses, (record) => `${categoryGroups[record.categoryGroup]?.label || record.categoryGroup}：${record.category}`));
  const total = rows.reduce((sum, [, amount]) => sum + amount, 0);
  els.pieRangeLabel.textContent = range.label;

  if (!rows.length || !total) {
    els.expensePie.replaceChildren(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  let currentAngle = 0;
  const gradientStops = rows
    .map(([, amount], index) => {
      const start = currentAngle;
      const end = start + (amount / total) * 360;
      currentAngle = end;
      const color = pieColors[index % pieColors.length];
      return `${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    })
    .join(", ");

  const legend = rows
    .map(([label, amount], index) => {
      const percent = Math.round((amount / total) * 100);
      return `<div class="pie-legend-row"><span class="pie-swatch" style="background:${pieColors[index % pieColors.length]}"></span><strong>${escapeHtml(label)}</strong><span>${money.format(amount)} / ${percent}%</span></div>`;
    })
    .join("");

  els.expensePie.innerHTML = `
    <div class="pie-chart-wrap">
      <canvas id="expensePieCanvas" class="pie-canvas" role="img" aria-label="${escapeHtml(range.label)}支出圓餅圖"></canvas>
      <div class="pie-disc pie-disc-fallback" aria-hidden="true" style="background: conic-gradient(${gradientStops});"></div>
    </div>
    <div class="pie-legend">${legend}</div>
  `;
  drawExpensePieCanvas(rows, total);
}

function renderReports() {
  renderMonthlyReport();
  renderExpensePie();
  const records = monthRecords(state.selectedMonth);
  const totalSpent = records.expenses.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  renderRatioList(
    els.categoryAnalysis,
    groupedAmounts(records.expenses, (record) => `${categoryGroups[record.categoryGroup]?.label || record.categoryGroup}：${record.category}`),
    totalSpent
  );

  const bucketSpentRows = groupedAmounts(records.expenses, (record) => bucketById(record.bucketId)?.name || record.bucketId);
  const transferRows = groupedAmounts(records.transfers, (record) => `${bucketById(record.fromBucketId)?.name || record.fromBucketId} → ${bucketById(record.toBucketId)?.name || record.toBucketId}`);
  renderRatioList(els.bucketUsage, [...bucketSpentRows, ...transferRows.map(([label, amount]) => [`轉移：${label}`, amount])], totalSpent + records.transfers.reduce((sum, record) => sum + Number(record.amount || 0), 0));
  renderTrends();
}

function renderTrends() {
  const months = Array.from({ length: 12 }, (_, index) => shiftMonth(state.selectedMonth, index - 11));
  els.trendList.innerHTML = months
    .map((month) => {
      const balances = balanceMapThrough(monthEnd(month));
      const spent = monthRecords(month).expenses.reduce((sum, record) => sum + Number(record.amount || 0), 0);
      return `
        <article class="trend-row">
          <header><strong>${month}</strong><span>支出 ${money.format(spent)}</span></header>
          <div class="trend-grid">
            <span>儲蓄 <b>${money.format(balances.savings || 0)}</b></span>
            <span>ETF 投入 <b>${money.format(totalEtfInvestedThrough(monthEnd(month)))}</b></span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSettings() {
  els.bucketSettings.innerHTML = state.data.buckets
    .sort((a, b) => a.priority - b.priority)
    .map((bucket) => `
      <article class="settings-row">
        <h3>${escapeHtml(bucket.name)}<small>${bucket.isRemainderBucket ? "收入扣除固定分配後的剩餘金額" : `優先順序 ${bucket.priority}`}</small></h3>
        <label>
          <span>每月分配</span>
          <input data-setting="allocation" data-bucket-id="${bucket.id}" type="number" min="0" step="1" value="${bucket.monthlyAllocationAmount}" ${bucket.isRemainderBucket ? "disabled" : ""} />
        </label>
        <label>
          <span>期初餘額</span>
          <input data-setting="initial" data-bucket-id="${bucket.id}" type="number" step="1" value="${bucket.initialBalance}" />
        </label>
      </article>
    `)
    .join("");
}

function renderEditMode() {
  const labels = {
    income: ["新增收入", "更新收入"],
    expense: ["新增支出", "更新支出"],
    transfer: ["新增轉移", "更新轉移"],
  };

  [
    ["income", els.incomeSubmit, els.incomeCancelEdit],
    ["expense", els.expenseSubmit, els.expenseCancelEdit],
    ["transfer", els.transferSubmit, els.transferCancelEdit],
  ].forEach(([type, submit, cancel]) => {
    const isEditing = state.editing?.type === type;
    submit.textContent = isEditing ? labels[type][1] : labels[type][0];
    cancel.classList.toggle("hidden", !isEditing);
  });
}

function renderSelectors() {
  els.categoryGroup.innerHTML = Object.entries(categoryGroups)
    .map(([id, group]) => `<option value="${id}">${escapeHtml(group.label)}</option>`)
    .join("");
  [els.expenseBucket, els.fromBucket, els.toBucket].forEach((select) => {
    select.innerHTML = bucketOptions();
  });
  els.fromBucket.innerHTML = bucketOptions("savings");
  els.toBucket.innerHTML = bucketOptions("life");
  updateCategorySelectors();
}

function updateCategorySelectors() {
  const group = categoryGroups[els.categoryGroup.value];
  els.expenseCategory.innerHTML = group.categories.map((category) => `<option value="${category}">${escapeHtml(category)}</option>`).join("");
  els.expenseCategory.value = group.defaultCategory;
  els.expenseBucket.innerHTML = bucketOptions(group.defaultBucketId);
  els.categoryLabel.classList.remove("hidden");
}

function render() {
  renderSelectors();
  renderEditMode();
  renderDashboard();
  renderAllocationPreview();
  renderRecentRecords();
  renderHistoryRecords();
  renderReports();
  renderSettings();
}

function addIncome(event) {
  event.preventDefault();
  const amount = Number(els.incomeAmount.value || 0);
  if (!amount) return;
  const record = {
    date: els.incomeDate.value,
    amount,
    allocations: allocateIncome(amount),
  };
  if (state.editing?.type === "income") {
    const existing = state.data.incomes.find((item) => item.id === state.editing.id);
    if (existing) Object.assign(existing, record);
    clearEditMode();
  } else {
    state.data.incomes.push({
      id: makeId(),
      ...record,
      createdAt: new Date().toISOString(),
    });
  }
  saveData();
  els.incomeAmount.value = "";
  render();
}

function addExpense(event) {
  event.preventDefault();
  const amount = Number(els.expenseAmount.value || 0);
  if (!amount) return;
  const group = categoryGroups[els.categoryGroup.value];
  const record = {
    date: els.expenseDate.value,
    amount,
    categoryGroup: els.categoryGroup.value,
    category: els.expenseCategory.value,
    itemName: els.expenseItem.value.trim(),
    bucketId: els.expenseBucket.value || group.defaultBucketId,
    note: "",
  };
  if (state.editing?.type === "expense") {
    const existing = state.data.expenses.find((item) => item.id === state.editing.id);
    if (existing) Object.assign(existing, record);
    clearEditMode();
  } else {
    state.data.expenses.push({
      id: makeId(),
      ...record,
      createdAt: new Date().toISOString(),
    });
  }
  saveData();
  els.expenseAmount.value = "";
  els.expenseItem.value = "";
  render();
}

function addTransfer(event) {
  event.preventDefault();
  const amount = Number(els.transferAmount.value || 0);
  if (!amount || els.fromBucket.value === els.toBucket.value) {
    alert("請確認金額，且來源桶與目標桶不能相同。");
    return;
  }
  const record = {
    date: els.transferDate.value,
    fromBucketId: els.fromBucket.value,
    toBucketId: els.toBucket.value,
    amount,
    note: els.transferNote.value.trim(),
  };
  if (state.editing?.type === "transfer") {
    const existing = state.data.transfers.find((item) => item.id === state.editing.id);
    if (existing) Object.assign(existing, record);
    clearEditMode();
  } else {
    state.data.transfers.push({
      id: makeId(),
      ...record,
      createdAt: new Date().toISOString(),
    });
  }
  saveData();
  els.transferAmount.value = "";
  els.transferNote.value = "";
  render();
}

function deleteRecord(type, id) {
  if (type === "income") state.data.incomes = state.data.incomes.filter((item) => item.id !== id);
  if (type === "expense") state.data.expenses = state.data.expenses.filter((item) => item.id !== id);
  if (type === "transfer") state.data.transfers = state.data.transfers.filter((item) => item.id !== id);
  if (state.editing?.type === type && state.editing?.id === id) clearEditMode();
  saveData();
  render();
}

function recordByType(type, id) {
  if (type === "income") return state.data.incomes.find((item) => item.id === id);
  if (type === "expense") return state.data.expenses.find((item) => item.id === id);
  if (type === "transfer") return state.data.transfers.find((item) => item.id === id);
  return null;
}

function editRecord(type, id) {
  const record = recordByType(type, id);
  if (!record) return;

  state.editing = { type, id };
  setActiveTab("entry");
  setEntryMode(type);

  if (type === "income") {
    els.incomeDate.value = record.date;
    els.incomeAmount.value = record.amount;
    renderAllocationPreview();
  }

  if (type === "expense") {
    els.expenseDate.value = record.date;
    els.expenseAmount.value = record.amount;
    els.categoryGroup.value = record.categoryGroup;
    updateCategorySelectors();
    els.expenseCategory.value = record.category;
    els.expenseBucket.value = record.bucketId;
    els.expenseItem.value = record.itemName || record.note || "";
  }

  if (type === "transfer") {
    els.transferDate.value = record.date;
    els.transferAmount.value = record.amount;
    els.fromBucket.value = record.fromBucketId;
    els.toBucket.value = record.toBucketId;
    els.transferNote.value = record.note || "";
  }

  renderEditMode();
}

function clearEditMode() {
  state.editing = null;
  renderEditMode();
}

function saveSettings(event) {
  event.preventDefault();
  els.bucketSettings.querySelectorAll("input[data-bucket-id]").forEach((input) => {
    const bucket = bucketById(input.dataset.bucketId);
    if (!bucket) return;
    if (input.dataset.setting === "allocation" && !bucket.isRemainderBucket) bucket.monthlyAllocationAmount = Number(input.value || 0);
    if (input.dataset.setting === "initial") bucket.initialBalance = Number(input.value || 0);
  });
  saveData();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, data: state.data }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bucket-ledger-${todayISO()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    state.data = normalizeData(parsed.data || parsed);
    saveData();
    render();
  } catch {
    alert("匯入檔案格式不正確。");
  } finally {
    els.importInput.value = "";
  }
}

function setActiveTab(tabName) {
  document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  document.querySelectorAll("[data-view]").forEach((view) => view.classList.toggle("active", view.dataset.view === tabName));
}

function setEntryMode(mode) {
  state.entryMode = mode;
  document.querySelectorAll("[data-entry-mode]").forEach((button) => button.classList.toggle("active", button.dataset.entryMode === mode));
  document.querySelectorAll("[data-entry-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.entryPanel === mode));
}

function handleRecordAction(event) {
  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    editRecord(editButton.dataset.editType, editButton.dataset.editId);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) deleteRecord(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
}

function handleBucketDetailSort(event) {
  const button = event.target.closest("[data-bucket-detail-sort]");
  if (!button || !state.activeBucketDetailId) return;
  state.bucketDetailSort = button.dataset.bucketDetailSort;
  renderBucketDetail(state.activeBucketDetailId);
}
function handleBucketDetailAction(event) {
  const card = event.target.closest("[data-bucket-detail-id]");
  if (!card) return;
  openBucketDetail(card.dataset.bucketDetailId);
}

function handleBucketDetailKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-bucket-detail-id]");
  if (!card) return;
  event.preventDefault();
  openBucketDetail(card.dataset.bucketDetailId);
}

function initEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
  document.querySelectorAll("[data-entry-mode]").forEach((button) => button.addEventListener("click", () => setEntryMode(button.dataset.entryMode)));
  document.querySelectorAll("[data-pie-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pieRangeMode = button.dataset.pieRange;
      renderReports();
    });
  });
  [els.pieStartDate, els.pieEndDate].filter(Boolean).forEach((input) => input.addEventListener("change", renderReports));
  els.selectedMonth.addEventListener("change", () => {
    state.selectedMonth = els.selectedMonth.value || currentMonth();
    render();
  });
  els.jumpCurrentMonth.addEventListener("click", () => {
    state.selectedMonth = currentMonth();
    els.selectedMonth.value = state.selectedMonth;
  if (els.pieStartDate && els.pieEndDate) {
    els.pieStartDate.value = monthStart(state.selectedMonth);
    els.pieEndDate.value = todayISO();
  }
  render();
  });
  els.categoryGroup.addEventListener("change", updateCategorySelectors);
  els.incomeAmount.addEventListener("input", renderAllocationPreview);
  els.incomeForm.addEventListener("submit", addIncome);
  els.expenseForm.addEventListener("submit", addExpense);
  els.transferForm.addEventListener("submit", addTransfer);
  els.settingsForm.addEventListener("submit", saveSettings);
  els.exportBtn.addEventListener("click", exportData);
  els.importInput.addEventListener("change", () => importData(els.importInput.files[0]));
  els.recentRecords.addEventListener("click", handleRecordAction);
  els.historyRecords.addEventListener("click", handleRecordAction);
  els.bucketCards.addEventListener("click", handleBucketDetailAction);
  els.bucketCards.addEventListener("keydown", handleBucketDetailKeydown);
  els.monthlyReport.addEventListener("click", handleBucketDetailAction);
  els.monthlyReport.addEventListener("keydown", handleBucketDetailKeydown);
  els.bucketDetailSort.addEventListener("click", handleBucketDetailSort);
  els.bucketDetailClose.addEventListener("click", closeBucketDetail);
  els.bucketDetailOverlay.addEventListener("click", (event) => {
    if (event.target === els.bucketDetailOverlay) closeBucketDetail();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.bucketDetailOverlay.classList.contains("hidden")) closeBucketDetail();
  });
  [els.expenseCancelEdit, els.incomeCancelEdit, els.transferCancelEdit].forEach((button) => {
    button.addEventListener("click", clearEditMode);
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.installBtn.classList.remove("hidden");
  });

  els.installBtn.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    els.installBtn.classList.add("hidden");
  });
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      const registration = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
      await registration.update();
    } catch {
      // The app can still run without offline caching in local previews.
    }
  }
}
function init() {
  loadData();
  state.selectedMonth = currentMonth();
  els.selectedMonth.value = state.selectedMonth;
  if (els.pieStartDate && els.pieEndDate) {
    els.pieStartDate.value = monthStart(state.selectedMonth);
    els.pieEndDate.value = todayISO();
  }
  [els.expenseDate, els.incomeDate, els.transferDate].forEach((input) => {
    input.value = todayISO();
  });
  initEvents();
  render();
  registerServiceWorker();
}

init();
