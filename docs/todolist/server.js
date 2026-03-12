const http = require("http");
const fsSync = require("fs");
const fs = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 5174);

const loadLocalConfig = () => {
  const configPath = path.join(__dirname, "config.local.json");
  try {
    const raw = fsSync.readFileSync(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const LOCAL_CONFIG = loadLocalConfig();
const BASE_URL =
  process.env.MINIMAX_BASE_URL ||
  LOCAL_CONFIG.MINIMAX_BASE_URL ||
  "https://api.minimax.io/v1";
const MODEL = process.env.MINIMAX_MODEL || LOCAL_CONFIG.MINIMAX_MODEL || "MiniMax-M2.5";
const API_KEY = process.env.MINIMAX_API_KEY || LOCAL_CONFIG.MINIMAX_API_KEY || "";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const AI_SUMMARY_PROMPT =
  "你是个人任务复盘助手。请用中文输出一段客观、偏积极的总结。" +
  "总结必须基于事实，不夸大，不使用空泛口号，避免情绪化表达。" +
  "输出 3-5 句话，包含完成数量、协作/依赖情况、下一步建议。" +
  "语气稳定专业，避免使用感叹号。信息不足时给出保守建议。";

const sendJson = (res, status, data) => {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
};

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

const callMinimax = async (payload) => {
  if (!API_KEY) {
    const error = new Error("MINIMAX_API_KEY 未设置（环境变量或 config.local.json）");
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || data.message || "Minimax API error";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
};

const serveFile = async (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const data = await fs.readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && requestUrl.pathname === "/api/summary") {
    try {
      const body = await readBody(req);
      const periodLabel = String(body.periodLabel || "本期");
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];

      if (tasks.length === 0) {
        return sendJson(res, 200, { summary: "该时间段没有完成记录。" });
      }

      const prompt = buildPrompt(periodLabel, tasks);
      const payload = {
        model: MODEL,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0.8,
      };

      const data = await callMinimax(payload);
      const summary = data.choices?.[0]?.message?.content || "AI 没有返回内容。";
      return sendJson(res, 200, { summary });
    } catch (error) {
      return sendJson(res, error.status || 500, { message: error.message || "Server error" });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }

  const baseDir = __dirname;
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(requestedPath).replace(/^\/+/, "");
  const filePath = path.join(baseDir, safePath);

  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403);
    res.end();
    return;
  }

  try {
    await serveFile(res, filePath);
  } catch (error) {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Todo server running at http://localhost:${PORT}`);
});
