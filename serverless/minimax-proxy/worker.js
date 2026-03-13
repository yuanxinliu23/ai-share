const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M2.5";
const MINIMAX_MODEL_FALLBACKS = ["MiniMax-M2.5"];
const PROJECT_BACKGROUND =
  "结构化上墙项目（一期已落地，当前聚焦一期扩量、二期宣发与三期能力建设）。" +
  "核心目标为三期原子能力建设、推进一期功能扩量、强化二期宣传，同时兼顾周会分享与自我学习。";
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
2. 关键成果提炼
3. 问题与根因分析
4. 下周计划与策略
`.trim();

const buildCorsHeaders = (request) => {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
};

const json = (data, status, request) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(request),
    },
  });

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

const buildPrompt = (periodLabel, tasks) => {
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

const callMinimax = async (env, prompt) => {
  const baseUrl = (env.MINIMAX_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const preferredModel = env.MINIMAX_MODEL || DEFAULT_MODEL;
  const apiKey = env.MINIMAX_API_KEY || "";

  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is missing in Worker secret");
  }

  const candidates = Array.from(new Set([preferredModel, ...MINIMAX_MODEL_FALLBACKS]));
  let lastDenied = "";

  for (const model of candidates) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0.6,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return data;
    }

    const code = data.error?.code || "";
    const message = data.error?.message || data.message || "MiniMax request failed";
    if (
      code === "AccessDenied.Unpurchased" ||
      code === "access_denied_un_purchased" ||
      code === "model_not_found" ||
      code === "InvalidParameter.ModelNotFound"
    ) {
      lastDenied = `${model}: ${message}`;
      continue;
    }
    throw new Error(message);
  }

  throw new Error(
    `No available MiniMax model for this key. Tried: ${candidates.join(", ")}${
      lastDenied ? `; last error: ${lastDenied}` : ""
    }`
  );
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request),
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true }, 200, request);
    }

    if (url.pathname !== "/api/summary") {
      return json({ message: "Not found" }, 404, request);
    }

    if (request.method !== "POST") {
      return json({ message: "Method not allowed" }, 405, request);
    }

    try {
      const body = await request.json();
      const periodLabel = String(body.periodLabel || "本期");
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];

      if (tasks.length === 0) {
        return json({ summary: "该时间段没有完成记录。" }, 200, request);
      }

      const prompt = buildPrompt(periodLabel, tasks);
      const data = await callMinimax(env, prompt);
      const summary = data.choices?.[0]?.message?.content || "AI 没有返回内容。";
      return json({ summary }, 200, request);
    } catch (error) {
      return json({ message: error.message || "Server error" }, 500, request);
    }
  },
};
