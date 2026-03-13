const STORAGE_KEY = "todolist:v2";
const SEED_STATE_KEY = "todolist:seed:workbook1:v1";
const AI_CONFIG_KEY = "todolist:ai-config:v1";
const DEFAULT_AI_CONFIG = {
  apiKey: "",
  proxyUrl: "",
  baseUrl: "https://api.minimax.io/v1",
  model: "MiniMax-M2.5",
};

const MINIMAX_MODEL_FALLBACKS = ["MiniMax-M2.5"];
const PROJECT_BACKGROUND =
  "结构化上墙项目（一期已落地，当前聚焦一期扩量、二期宣发与三期能力建设）。" +
  "核心目标为三期原子能力建设、推进一期功能扩量、强化二期宣传，同时兼顾周会分享与自我学习。";

const form = document.getElementById("todo-form");
const titleInput = document.getElementById("title");
const projectSelect = document.getElementById("project");
const notesInput = document.getElementById("notes");
const dueInput = document.getElementById("due");
const priorityInput = document.getElementById("priority");
const modeInput = document.getElementById("mode");
const partnerInput = document.getElementById("partner");

const listEl = document.getElementById("todo-list");
const listHint = document.getElementById("list-hint");
const statTotal = document.getElementById("stat-total");
const statActive = document.getElementById("stat-active");
const statWaiting = document.getElementById("stat-waiting");
const statDone = document.getElementById("stat-done");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const filterButtons = Array.from(document.querySelectorAll(".chip[data-filter]"));

const periodButtons = Array.from(document.querySelectorAll(".period-chip"));
const periodSelect = document.getElementById("period-select");
const reviewStats = document.getElementById("review-stats");
const historyList = document.getElementById("history-list");
const summaryBtn = document.getElementById("summary-btn");
const aiSummaryBtn = document.getElementById("ai-summary-btn");
const summaryOutput = document.getElementById("summary-output");
const aiConfigKeyInput = document.getElementById("minimax-api-key");
const aiConfigProxyUrlInput = document.getElementById("minimax-proxy-url");
const aiConfigBaseUrlInput = document.getElementById("minimax-base-url");
const aiConfigModelInput = document.getElementById("minimax-model");
const saveAiConfigBtn = document.getElementById("save-ai-config");
const clearAiConfigBtn = document.getElementById("clear-ai-config");
const aiConfigHint = document.getElementById("ai-config-hint");

const modal = document.getElementById("edit-modal");
const closeModalBtn = document.getElementById("close-modal");
const cancelEditBtn = document.getElementById("cancel-edit");
const editForm = document.getElementById("edit-form");
const editTitle = document.getElementById("edit-title-input");
const editProjectSelect = document.getElementById("edit-project");
const editNotes = document.getElementById("edit-notes");
const editDue = document.getElementById("edit-due");
const editPriority = document.getElementById("edit-priority");
const editMode = document.getElementById("edit-mode");
const editPartner = document.getElementById("edit-partner");

let todos = [];
let activeFilter = "all";
let activePeriod = "week";
let editingId = null;
let currentPeriodMap = [];
let aiConfig = { ...DEFAULT_AI_CONFIG };

const DEFAULT_PROJECTS = [
  "原子能力建设",
  "宣发",
  "功能上线",
  "功能扩量",
  "数据建设",
  "其他",
];

const DEFAULT_TODO_SEED = [
  {
    title: "图片理解能力优化",
    project: "原子能力建设",
    notes: "",
    dueDate: null,
    priority: "high",
    mode: "collab",
    partner: "算法，评测外包",
    completed: false,
  },
  {
    title: "商品理解能力优化",
    project: "原子能力建设",
    notes: "",
    dueDate: null,
    priority: "high",
    mode: "collab",
    partner: "算法，评测外包",
    completed: false,
  },
  {
    title: "商详分析方案维度定义",
    project: "原子能力建设",
    notes: "",
    dueDate: null,
    priority: "high",
    mode: "collab",
    partner: "算法，产品",
    completed: false,
  },
  {
    title: "商详优化方案维度定义",
    project: "原子能力建设",
    notes: "",
    dueDate: null,
    priority: "high",
    mode: "collab",
    partner: "算法，产品",
    completed: false,
  },
  {
    title: "联系工厂型商家共创",
    project: "原子能力建设",
    notes: "",
    dueDate: "2026-03-13",
    priority: "high",
    mode: "solo",
    partner: "",
    completed: true,
  },
  {
    title: "不同模版的设计规范",
    project: "功能上线",
    notes: "",
    dueDate: "2026-03-13",
    priority: "high",
    mode: "waiting",
    partner: "买家设计师，前端",
    completed: true,
  },
  {
    title: "api渠道联系服务商（外贸大师）确认灰度",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-09",
    priority: "high",
    mode: "solo",
    partner: "",
    completed: true,
  },
  {
    title: "api渠道联系服务商（倚天剑）确认灰度",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-10",
    priority: "high",
    mode: "solo",
    partner: "",
    completed: false,
  },
  {
    title: "api渠道联系服务商（店小秘）确认灰度",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-12",
    priority: "high",
    mode: "solo",
    partner: "",
    completed: false,
  },
  {
    title: "api渠道一期名单开灰",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-09",
    priority: "high",
    mode: "collab",
    partner: "后端",
    completed: true,
  },
  {
    title: "api渠道二期名单开灰",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-10",
    priority: "high",
    mode: "collab",
    partner: "后端",
    completed: true,
  },
  {
    title: "api渠道三期名单开灰",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-11",
    priority: "high",
    mode: "collab",
    partner: "后端",
    completed: true,
  },
  {
    title: "excel渠道灰度",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-10",
    priority: "high",
    mode: "collab",
    partner: "后端",
    completed: true,
  },
  {
    title: "excel渠道全量",
    project: "功能扩量",
    notes: "",
    dueDate: "2026-03-11",
    priority: "high",
    mode: "collab",
    partner: "后端",
    completed: true,
  },
  {
    title: "海报物料准备",
    project: "宣发",
    notes: "完成后过审核",
    dueDate: "2026-03-12",
    priority: "medium",
    mode: "waiting",
    partner: "生意助手外包",
    completed: true,
  },
  {
    title: "gif物料准备",
    project: "宣发",
    notes: "完成后过审核",
    dueDate: "2026-03-12",
    priority: "medium",
    mode: "waiting",
    partner: "创意外包",
    completed: true,
  },
  {
    title: "中西部大区直播准备",
    project: "宣发",
    notes: "",
    dueDate: "2026-03-11",
    priority: "high",
    mode: "solo",
    partner: "",
    completed: true,
  },
  {
    title: "二期宣发ppt制作",
    project: "宣发",
    notes: "完成后过审核",
    dueDate: "2026-03-11",
    priority: "high",
    mode: "solo",
    partner: "",
    completed: true,
  },
  {
    title: "数据底表新增二期字段",
    project: "数据建设",
    notes: "",
    dueDate: null,
    priority: "low",
    mode: "waiting",
    partner: "数仓",
    completed: true,
  },
  {
    title: "数据看板新增二期字段",
    project: "数据建设",
    notes: "",
    dueDate: null,
    priority: "low",
    mode: "solo",
    partner: "",
    completed: false,
  },
  {
    title: "周会分享内容准备",
    project: "其他",
    notes: "提前下载文件到工作电脑",
    dueDate: "2026-03-13",
    priority: "medium",
    mode: "solo",
    partner: "",
    completed: true,
  },
  {
    title: "走查定招链路发品情况",
    project: "功能扩量",
    notes: "",
    dueDate: null,
    priority: "medium",
    mode: "solo",
    partner: "",
    completed: true,
  },
  {
    title: "按期收集&开灰二期灰度商家",
    project: "功能扩量",
    notes: "",
    dueDate: null,
    priority: "low",
    mode: "collab",
    partner: "后端",
    completed: true,
  },
  {
    title: "对商钉群直播准备",
    project: "宣发",
    notes: "",
    dueDate: null,
    priority: "medium",
    mode: "solo",
    partner: "",
    completed: true,
  },
];

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

const modeLabels = {
  solo: "Solo",
  collab: "合作",
  waiting: "依赖方",
};

const getISODate = (date) => date.toISOString().slice(0, 10);

const parseISODate = (value) => {
  if (!value) return null;
  return new Date(value + "T00:00:00");
};

const formatDate = (value, options = { month: "short", day: "numeric" }) => {
  if (!value) return "";
  const date = value instanceof Date ? value : parseISODate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", options).format(date);
};

const isPastOrToday = (value) => {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseISODate(value);
  return target <= today;
};

const normalizeProjectName = (value) => String(value || "").trim();

const projectOptions = [...DEFAULT_PROJECTS];

const renderProjectOptions = (select, projects, selectedValue) => {
  select.innerHTML = "";
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project;
    option.textContent = project;
    if (project === selectedValue) option.selected = true;
    select.appendChild(option);
  });
};

const resolveProjectSelection = (value) => {
  const normalized = normalizeProjectName(value);
  if (projectOptions.includes(normalized)) return normalized;
  if (projectOptions.includes("其他")) return "其他";
  return projectOptions[0] || "";
};

const updateProjectSelects = (selectedCreate, selectedEdit) => {
  renderProjectOptions(projectSelect, projectOptions, resolveProjectSelection(selectedCreate));
  renderProjectOptions(editProjectSelect, projectOptions, resolveProjectSelection(selectedEdit));
};

const normalizeTodo = (todo) => ({
  id: todo.id || crypto.randomUUID(),
  title: String(todo.title || "").trim() || "未命名任务",
  project: normalizeProjectName(todo.project),
  notes: String(todo.notes || "").trim(),
  dueDate: todo.dueDate || null,
  priority: todo.priority || "medium",
  mode: todo.mode || "solo",
  partner: String(todo.partner || "").trim(),
  completed: Boolean(todo.completed),
  createdAt: Number(todo.createdAt || Date.now()),
  completedAt: todo.completedAt ? Number(todo.completedAt) : null,
});

const buildSeedTodos = () => {
  const baseCreatedAt = Date.parse("2026-03-07T09:00:00");

  return DEFAULT_TODO_SEED.map((seed, index) => {
    const createdAt = baseCreatedAt + index * 2 * 60 * 60 * 1000;
    let completedAt = null;

    if (seed.completed) {
      completedAt = seed.dueDate
        ? Date.parse(`${seed.dueDate}T18:00:00`)
        : createdAt + 60 * 60 * 1000;
    }

    return normalizeTodo({
      ...seed,
      id: crypto.randomUUID(),
      createdAt,
      completedAt,
    });
  });
};

const hydrateTodosWithSeed = (loadedTodos) => {
  const hasSeeded = localStorage.getItem(SEED_STATE_KEY) === "1";
  if (hasSeeded) return loadedTodos;

  const existingTitles = new Set(loadedTodos.map((todo) => todo.title.trim()));
  const seedTodos = buildSeedTodos().filter((todo) => !existingTitles.has(todo.title.trim()));
  const mergedTodos = [...seedTodos, ...loadedTodos];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedTodos));
  localStorage.setItem(SEED_STATE_KEY, "1");
  return mergedTodos;
};

const saveTodos = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
};

const loadTodos = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTodo) : [];
  } catch (error) {
    console.error("Failed to parse todos", error);
    return [];
  }
};

const normalizeAiConfig = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    apiKey: String(source.apiKey || "").trim(),
    proxyUrl: String(source.proxyUrl || "").trim(),
    baseUrl: String(source.baseUrl || DEFAULT_AI_CONFIG.baseUrl)
      .trim()
      .replace(/\/+$/, ""),
    model: String(source.model || DEFAULT_AI_CONFIG.model).trim() || DEFAULT_AI_CONFIG.model,
  };
};

const loadAiConfig = () => {
  const raw = localStorage.getItem(AI_CONFIG_KEY);
  if (!raw) return { ...DEFAULT_AI_CONFIG };
  try {
    return normalizeAiConfig(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to parse ai config", error);
    return { ...DEFAULT_AI_CONFIG };
  }
};

const saveAiConfig = () => {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
};

const setAiConfigHint = (text, isError = false) => {
  if (!aiConfigHint) return;
  aiConfigHint.textContent = text;
  aiConfigHint.style.color = isError ? "#a53434" : "";
};

const renderAiConfig = () => {
  if (!aiConfigKeyInput || !aiConfigProxyUrlInput || !aiConfigBaseUrlInput || !aiConfigModelInput) return;
  aiConfigKeyInput.value = aiConfig.apiKey;
  aiConfigProxyUrlInput.value = aiConfig.proxyUrl;
  aiConfigBaseUrlInput.value = aiConfig.baseUrl;
  aiConfigModelInput.value = aiConfig.model;

  if (aiConfig.proxyUrl) {
    setAiConfigHint("当前模式：通过 Proxy URL 生成 AI 总结。");
    return;
  }
  if (aiConfig.apiKey) {
    setAiConfigHint("当前模式：浏览器直连 MiniMax。API Key 仅存储在本地浏览器。");
    return;
  }
  setAiConfigHint("当前未配置 AI。点击“AI 总结”时会提示输入 API Key。");
};

const readAiConfigFromInputs = () =>
  normalizeAiConfig({
    apiKey: aiConfigKeyInput ? aiConfigKeyInput.value : "",
    proxyUrl: aiConfigProxyUrlInput ? aiConfigProxyUrlInput.value : "",
    baseUrl: aiConfigBaseUrlInput ? aiConfigBaseUrlInput.value : "",
    model: aiConfigModelInput ? aiConfigModelInput.value : "",
  });

const ensureAiConfigReady = () => {
  if (aiConfig.proxyUrl) return aiConfig;
  if (aiConfig.apiKey) return aiConfig;

  const input = window.prompt("请输入 MiniMax API Key（仅保存在当前浏览器）");
  const apiKey = String(input || "").trim();
  if (!apiKey) {
    throw new Error("未提供 MiniMax API Key");
  }
  aiConfig = normalizeAiConfig({ ...aiConfig, apiKey });
  saveAiConfig();
  renderAiConfig();
  return aiConfig;
};

const updateStats = () => {
  const total = todos.length;
  const done = todos.filter((todo) => todo.completed).length;
  const waiting = todos.filter((todo) => !todo.completed && todo.mode === "waiting").length;
  const active = total - done;
  statTotal.textContent = total;
  statActive.textContent = active;
  statWaiting.textContent = waiting;
  statDone.textContent = done;
};

const setHint = (count) => {
  if (count === 0) {
    listHint.textContent = "还没有任务，先记录一个吧。";
  } else {
    listHint.textContent = `已显示 ${count} 条任务。`;
  }
};

const openModal = (todo) => {
  editingId = todo.id;
  editTitle.value = todo.title;
  const projectValue = normalizeProjectName(todo.project);
  updateProjectSelects(projectSelect.value, projectValue);
  editProjectSelect.value = resolveProjectSelection(projectValue);
  editNotes.value = todo.notes;
  editDue.value = todo.dueDate || "";
  editPriority.value = todo.priority;
  editMode.value = todo.mode;
  editPartner.value = todo.partner;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  editTitle.focus();
};

const closeModal = () => {
  editingId = null;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  editForm.reset();
};

const applyFilters = () => {
  const query = searchInput.value.trim().toLowerCase();
  const sorted = [...todos];

  const filtered = sorted.filter((todo) => {
    if (activeFilter === "active" && todo.completed) return false;
    if (activeFilter === "completed" && !todo.completed) return false;
    if (!query) return true;
    return (
      todo.title.toLowerCase().includes(query) ||
      todo.notes.toLowerCase().includes(query) ||
      todo.partner.toLowerCase().includes(query) ||
      todo.project.toLowerCase().includes(query)
    );
  });

  const sortMode = sortSelect.value;
  filtered.sort((a, b) => {
    if (sortMode === "created-asc") return a.createdAt - b.createdAt;
    if (sortMode === "created-desc") return b.createdAt - a.createdAt;
    if (sortMode === "due-asc") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (sortMode === "priority-desc") {
      return priorityRank[b.priority] - priorityRank[a.priority];
    }
    return 0;
  });

  return filtered;
};

const buildTag = (text, className) => {
  const tag = document.createElement("span");
  tag.className = `tag ${className || ""}`.trim();
  tag.textContent = text;
  return tag;
};

const renderTodos = () => {
  const visible = applyFilters();
  listEl.innerHTML = "";

  visible.forEach((todo, index) => {
    const card = document.createElement("article");
    card.className = `todo-card${todo.completed ? " completed" : ""}`;
    card.style.animationDelay = `${index * 35}ms`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () => {
      todo.completed = checkbox.checked;
      todo.completedAt = checkbox.checked ? Date.now() : null;
      saveTodos();
      updateStats();
      renderTodos();
      renderReview();
    });

    const main = document.createElement("div");
    main.className = "todo-main";
    const title = document.createElement("h3");
    title.textContent = todo.title;

    main.appendChild(title);

    const notes = document.createElement("p");
    notes.textContent = todo.notes || "没有备注。";
    main.appendChild(notes);

    const meta = document.createElement("div");
    meta.className = "todo-meta";

    if (todo.project) {
      meta.appendChild(buildTag(`项目: ${todo.project}`));
    }

    const modeTag = buildTag(modeLabels[todo.mode] || "Solo");
    meta.appendChild(modeTag);

    if (todo.partner) {
      const partnerLabel = todo.mode === "waiting" ? "依赖" : "协作";
      meta.appendChild(buildTag(`${partnerLabel}: ${todo.partner}`));
    }

    const priorityLabel =
      todo.priority === "high" ? "高优先级" : todo.priority === "medium" ? "中优先级" : "低优先级";
    const priorityTag = buildTag(priorityLabel, `priority-${todo.priority}`);
    meta.appendChild(priorityTag);

    if (todo.dueDate) {
      const dueClass = isPastOrToday(todo.dueDate) && !todo.completed ? "urgent" : "";
      meta.appendChild(buildTag(`截止 ${formatDate(todo.dueDate)}`, dueClass));
    }

    const createdTag = buildTag(`添加于 ${formatDate(new Date(todo.createdAt))}`);
    meta.appendChild(createdTag);

    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "编辑";
    editBtn.addEventListener("click", () => openModal(todo));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete";
    deleteBtn.textContent = "删除";
    deleteBtn.addEventListener("click", () => {
      todos = todos.filter((item) => item.id !== todo.id);
      saveTodos();
      updateStats();
      renderTodos();
      renderReview();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(checkbox);
    card.appendChild(main);
    card.appendChild(actions);

    listEl.appendChild(card);
  });

  setHint(visible.length);
};

const addTodo = (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const project = resolveProjectSelection(projectSelect.value);
  updateProjectSelects(project, editProjectSelect.value);

  const todo = {
    id: crypto.randomUUID(),
    title,
    project,
    notes: notesInput.value.trim(),
    dueDate: dueInput.value || null,
    priority: priorityInput.value,
    mode: modeInput.value,
    partner: partnerInput.value.trim(),
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
  };

  todos.unshift(todo);
  saveTodos();
  updateStats();
  renderTodos();
  renderReview();
  form.reset();
  updateProjectSelects(projectSelect.value, editProjectSelect.value);
  priorityInput.value = "medium";
  modeInput.value = "solo";
  titleInput.focus();
};

const updateFilter = (filter) => {
  activeFilter = filter;
  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderTodos();
};

const handleEditSubmit = (event) => {
  event.preventDefault();
  const todo = todos.find((item) => item.id === editingId);
  if (!todo) return;
  const project = resolveProjectSelection(editProjectSelect.value);
  updateProjectSelects(projectSelect.value, project);
  todo.title = editTitle.value.trim();
  todo.project = project;
  todo.notes = editNotes.value.trim();
  todo.dueDate = editDue.value || null;
  todo.priority = editPriority.value;
  todo.mode = editMode.value;
  todo.partner = editPartner.value.trim();
  saveTodos();
  updateStats();
  renderTodos();
  renderReview();
  closeModal();
};

const startOfWeek = (date) => {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfMonth = (date) => {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfMonth = (date) => {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + 1, 0);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const buildPeriodMap = (period) => {
  const completed = todos.filter((todo) => todo.completed && todo.completedAt);
  const map = new Map();

  completed.forEach((todo) => {
    const completedDate = new Date(todo.completedAt);
    let key;
    let label;
    let range;

    if (period === "week") {
      const start = startOfWeek(completedDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      key = getISODate(start);
      label = `周 ${formatDate(start)} - ${formatDate(end)}`;
      range = { start, end };
    } else {
      const start = startOfMonth(completedDate);
      const end = endOfMonth(completedDate);
      key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      label = `${formatDate(start, { month: "short", year: "numeric" })}`;
      range = { start, end };
    }

    if (!map.has(key)) {
      map.set(key, { key, label, ...range, tasks: [] });
    }
    map.get(key).tasks.push(todo);
  });

  return Array.from(map.values()).sort((a, b) => b.start - a.start);
};

const updatePeriodOptions = () => {
  currentPeriodMap = buildPeriodMap(activePeriod);
  periodSelect.innerHTML = "";

  if (currentPeriodMap.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无已完成任务";
    periodSelect.appendChild(option);
    periodSelect.disabled = true;
    return;
  }

  periodSelect.disabled = false;
  currentPeriodMap.forEach((period, index) => {
    const option = document.createElement("option");
    option.value = period.key;
    option.textContent = period.label;
    if (index === 0) option.selected = true;
    periodSelect.appendChild(option);
  });
};

const renderReviewStats = (tasks) => {
  reviewStats.innerHTML = "";
  if (tasks.length === 0) return;

  const high = tasks.filter((task) => task.priority === "high").length;
  const waiting = tasks.filter((task) => task.mode === "waiting").length;
  const collab = tasks.filter((task) => task.mode === "collab").length;
  const uniquePeople = new Set(tasks.map((task) => task.partner).filter(Boolean)).size;

  const blocks = [
    { label: "完成数", value: tasks.length },
    { label: "高优先级", value: high },
    { label: "依赖完成", value: waiting },
    { label: "协作者", value: uniquePeople || collab },
  ];

  blocks.forEach((block) => {
    const card = document.createElement("div");
    card.className = "review-card";
    const label = document.createElement("span");
    label.textContent = block.label;
    const value = document.createElement("strong");
    value.textContent = block.value;
    card.appendChild(label);
    card.appendChild(value);
    reviewStats.appendChild(card);
  });
};

const renderHistory = (tasks) => {
  historyList.innerHTML = "";
  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "该时间段没有已完成任务。";
    empty.className = "muted";
    historyList.appendChild(empty);
    return;
  }

  tasks
    .sort((a, b) => b.completedAt - a.completedAt)
    .forEach((task) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const title = document.createElement("h4");
      title.textContent = task.title;

      const meta = document.createElement("p");
      const parts = [`完成于 ${formatDate(new Date(task.completedAt))}`];
      if (task.mode !== "solo") parts.push(modeLabels[task.mode]);
      if (task.partner) parts.push(`对象: ${task.partner}`);
      meta.textContent = parts.join(" · ");

      item.appendChild(title);
      item.appendChild(meta);
      historyList.appendChild(item);
    });
};

const generateSummaryLocal = (tasks, label) => {
  if (tasks.length === 0) return "该时间段没有完成记录。";

  const counts = { high: 0, medium: 0, low: 0 };
  const modes = { solo: 0, collab: 0, waiting: 0 };

  tasks.forEach((task) => {
    counts[task.priority] = (counts[task.priority] || 0) + 1;
    modes[task.mode] = (modes[task.mode] || 0) + 1;
  });

  return [
    `${label} 共完成 ${tasks.length} 条任务。`,
    `优先级分布：高 ${counts.high}，中 ${counts.medium}，低 ${counts.low}。`,
    `协作结构：Solo ${modes.solo}，合作 ${modes.collab}，依赖方 ${modes.waiting}。`,
    "整体推进稳定，可继续保持节奏。",
  ].join(" ");
};

const AI_SUMMARY_PROMPT = `
你是一位资深AI产品运营专家，擅长通过结构化数据复盘项目进展、提炼经验并制定可落地的优化策略。
请基于输入的 To do list 完成情况，结合“结构化上墙”项目背景，输出一份兼具战略高度与执行细节的复盘报告。

输出要求：
1. 用简洁清晰的中文，分模块输出。
2. 每个模块关键结论请加粗。
3. 避免空泛描述，每项建议必须对应输入 To do list 中的具体任务或项目目标。
4. 保持客观，不夸大，不空喊口号。

复盘框架（严格按以下四部分输出）：
1. 整体进度诊断
- 统计 To do list 完成率；
- 区分“项目核心任务”（数据、功能、原子能力、宣传）与“个人成长任务”（分享、学习）；
- 标注延期/未完成项及其对项目节点影响。

2. 关键成果提炼
- 聚焦结构化商详二期进展；
- 回答数据底表字段新增是否覆盖核心需求、看板修改是否提升可读性；
- 评估原子能力是否解决一期痛点、功能上线/扩量是否达到覆盖目标；
- 评估宣传内容是否突出二期差异化价值。

3. 问题与根因分析
- 针对未完成/低效项定位根因；
- 重点判断：需求对齐不足、测试资源冲突、宣传未绑定用户场景等。

4. 下周计划与策略
- 按数据侧、功能侧、原子能力侧、宣传侧给出优先级与行动建议；
- 给出周会分享主题建议（如“二期数据驱动运营实践”）与学习方向（如“AI产品原子能力设计方法论”）。
`.trim();

const summarizeFacts = (tasks) => {
  const counts = { high: 0, medium: 0, low: 0 };
  const modes = { solo: 0, collab: 0, waiting: 0 };
  const partners = {};

  tasks.forEach((task) => {
    if (task.priority && counts[task.priority] !== undefined) counts[task.priority] += 1;
    if (task.mode && modes[task.mode] !== undefined) modes[task.mode] += 1;
    if (task.partner) partners[task.partner] = (partners[task.partner] || 0) + 1;
  });

  const topPartners = Object.entries(partners)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name}(${count})`)
    .join(", ");

  return [
    `完成总数: ${tasks.length}`,
    `优先级: 高${counts.high} 中${counts.medium} 低${counts.low}`,
    `协作模式: Solo ${modes.solo} 合作 ${modes.collab} 依赖方 ${modes.waiting}`,
    `协作/依赖对象: ${topPartners || "无"}`,
  ].join("\n");
};

const buildAiPrompt = (periodLabel, tasks) => {
  const items = tasks
    .map((task, index) => {
      const parts = [
        `${index + 1}. 标题: ${task.title}`,
        task.project ? `项目: ${task.project}` : "",
        task.notes ? `备注: ${task.notes}` : "",
        task.priority ? `优先级: ${task.priority}` : "",
        task.mode ? `模式: ${task.mode}` : "",
        task.partner ? `对象: ${task.partner}` : "",
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");

  const facts = summarizeFacts(tasks);

  return {
    system: AI_SUMMARY_PROMPT,
    user:
      `项目背景：${PROJECT_BACKGROUND}\n` +
      `复盘时间段：${periodLabel}\n` +
      `To do list 事实摘要：\n${facts}\n` +
      `To do list 条目明细：\n${items}\n` +
      "请按复盘框架输出结构化结论，并确保每条建议对应具体任务。",
  };
};

const buildModelCandidates = (preferredModel) => {
  const preferred = String(preferredModel || "").trim();
  const ordered = [preferred, ...MINIMAX_MODEL_FALLBACKS].filter(Boolean);
  return Array.from(new Set(ordered));
};

const requestMinimaxSummary = async (activeAiConfig, prompt) => {
  const candidates = buildModelCandidates(activeAiConfig.model);
  let lastDeniedMessage = "";

  for (const model of candidates) {
    const payload = {
      model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.6,
    };

    const response = await fetch(`${activeAiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeAiConfig.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const summary = data.choices?.[0]?.message?.content || "";
      return { summary, model };
    }

    const code = data.error?.code || "";
    const message = data.error?.message || data.message || "MiniMax 请求失败";
    if (
      code === "AccessDenied.Unpurchased" ||
      code === "access_denied_un_purchased" ||
      code === "model_not_found" ||
      code === "InvalidParameter.ModelNotFound"
    ) {
      lastDeniedMessage = `${model}: ${message}`;
      continue;
    }

    throw new Error(message);
  }

  throw new Error(
    `当前 API Key 对默认 MiniMax 模型无可用权限。已尝试：${candidates.join(
      ", "
    )}。请在 MiniMax 平台开通模型，或在 AI 配置中改为你已开通的模型。${
      lastDeniedMessage ? ` 最近一次返回：${lastDeniedMessage}` : ""
    }`
  );
};

const renderReview = () => {
  updatePeriodOptions();
  summaryOutput.textContent = "";

  if (currentPeriodMap.length === 0) {
    reviewStats.innerHTML = "";
    historyList.innerHTML = "";
    return;
  }

  const selectedKey = periodSelect.value || currentPeriodMap[0].key;
  const period = currentPeriodMap.find((item) => item.key === selectedKey) || currentPeriodMap[0];
  const tasks = period.tasks;

  renderReviewStats(tasks);
  renderHistory(tasks);
};

const requestAiSummary = async () => {
  if (currentPeriodMap.length === 0) {
    summaryOutput.textContent = "没有可总结的完成记录。";
    return;
  }

  const selectedKey = periodSelect.value || currentPeriodMap[0].key;
  const period = currentPeriodMap.find((item) => item.key === selectedKey) || currentPeriodMap[0];
  const tasks = period.tasks;

  summaryOutput.textContent = "AI 正在生成总结...";
  aiSummaryBtn.disabled = true;

  try {
    const taskPayload = tasks.map((task) => ({
      title: task.title,
      project: task.project,
      notes: task.notes,
      priority: task.priority,
      mode: task.mode,
      partner: task.partner,
      completedAt: task.completedAt,
    }));
    const activeAiConfig = ensureAiConfigReady();
    let summary = "";

    if (activeAiConfig.proxyUrl) {
      const response = await fetch(activeAiConfig.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodLabel: period.label,
          tasks: taskPayload,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Proxy 请求失败");
      }

      const data = await response.json();
      summary = data.summary || data.choices?.[0]?.message?.content || "";
    } else {
      const prompt = buildAiPrompt(period.label, taskPayload);
      const result = await requestMinimaxSummary(activeAiConfig, prompt);
      summary = result.summary;
    }

    summaryOutput.textContent = summary || "AI 没有返回内容。";
    if (activeAiConfig.proxyUrl) {
      setAiConfigHint("AI 调用成功：当前通过 Proxy URL 生成。");
    } else {
      setAiConfigHint("AI 调用成功：当前为浏览器直连 MiniMax。");
    }
  } catch (error) {
    summaryOutput.textContent = `AI 总结失败：${error.message}，已切换为本地总结。`;
    summaryOutput.textContent += " " + generateSummaryLocal(tasks, period.label);
    setAiConfigHint(`AI 调用失败：${error.message}`, true);
  } finally {
    aiSummaryBtn.disabled = false;
  }
};

form.addEventListener("submit", addTodo);
searchInput.addEventListener("input", renderTodos);
sortSelect.addEventListener("change", renderTodos);
filterButtons.forEach((btn) =>
  btn.addEventListener("click", () => updateFilter(btn.dataset.filter))
);
closeModalBtn.addEventListener("click", closeModal);
cancelEditBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
editForm.addEventListener("submit", handleEditSubmit);
periodButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    activePeriod = btn.dataset.period;
    periodButtons.forEach((button) =>
      button.classList.toggle("active", button.dataset.period === activePeriod)
    );
    renderReview();
  })
);
periodSelect.addEventListener("change", renderReview);
summaryBtn.addEventListener("click", () => {
  if (currentPeriodMap.length === 0) {
    summaryOutput.textContent = "没有可总结的完成记录。";
    return;
  }
  const selectedKey = periodSelect.value || currentPeriodMap[0].key;
  const period = currentPeriodMap.find((item) => item.key === selectedKey) || currentPeriodMap[0];
  summaryOutput.textContent = generateSummaryLocal(period.tasks, period.label);
});
aiSummaryBtn.addEventListener("click", requestAiSummary);
saveAiConfigBtn.addEventListener("click", () => {
  aiConfig = readAiConfigFromInputs();
  saveAiConfig();
  renderAiConfig();
  setAiConfigHint("AI 配置已保存到当前浏览器。");
});
clearAiConfigBtn.addEventListener("click", () => {
  aiConfig = { ...DEFAULT_AI_CONFIG };
  saveAiConfig();
  renderAiConfig();
  setAiConfigHint("AI 配置已清除。");
});

const init = () => {
  todos = hydrateTodosWithSeed(loadTodos());
  aiConfig = loadAiConfig();
  updateProjectSelects(projectOptions[0], projectOptions[0]);
  renderAiConfig();
  updateStats();
  renderTodos();
  renderReview();
};

init();
