const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M2.5";
const AI_SUMMARY_PROMPT =
  "你是个人任务复盘助手。请用中文输出一段客观、偏积极的总结。" +
  "总结必须基于事实，不夸大，不使用空泛口号，避免情绪化表达。" +
  "输出 3-5 句话，包含完成数量、协作/依赖情况、下一步建议。" +
  "语气稳定专业，避免使用感叹号。信息不足时给出保守建议。";

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
    user: `时间段: ${periodLabel}\n事实摘要:\n${facts}\n已完成任务列表:\n${items}`,
  };
};

const callMinimax = async (env, prompt) => {
  const baseUrl = (env.MINIMAX_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = env.MINIMAX_MODEL || DEFAULT_MODEL;
  const apiKey = env.MINIMAX_API_KEY || "";

  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is missing in Worker secret");
  }

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
      temperature: 0.8,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "MiniMax request failed");
  }
  return data;
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
