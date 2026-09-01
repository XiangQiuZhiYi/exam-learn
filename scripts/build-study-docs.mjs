import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const htmlDir = path.join(projectDir, "html");
const assetsDir = path.join(htmlDir, "assets");
const overviewPath = path.join(projectDir, "系统架构设计师备考总计划.md");
const weeklyPath = path.join(projectDir, "chapters", "04-综合知识40周学习计划.md");
const materialsPath = path.join(projectDir, "data", "materials.json");
const evidencePath = path.join(projectDir, "data", "week-evidence.json");
const questionBankStatusPath = path.join(projectDir, "data", "question-bank-status.json");
const recordPath = path.join(projectDir, "record", "学习进度.md");

const activePages = [
  { file: "04-weekly-plan.html", label: "40 周计划" },
  { file: "practices.html", label: "周练习" },
  { file: "materials.html", label: "资料与练习" },
  { file: "complete-plan.html", label: "完整单页" },
];
const repositoryBase = "https://github.com/XiangQiuZhiYi/exam-learn/blob/main";

const phaseDescriptions = [
  "建立架构视角，补齐硬件、操作系统、网络、语言、系统工程与性能基础。",
  "辨析信息系统类型，理解密码、签名、访问控制、攻击与风险。",
  "掌握过程模型、需求、结构化与面向对象分析、测试和项目管理。",
  "突破三级模式、关系代数、范式、数据库设计与 NoSQL。",
  "掌握 ABSD、架构风格、复用与特定领域软件架构。",
  "用质量属性场景、SAAM、ATAM 和可靠性构成架构核心能力。",
  "理解架构演化、维护、CPS、AI、边缘、数字孪生、云与大数据。",
  "补知识产权、专业英语、应用数学，并用完整综合卷验收。",
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function compactRanges(numbers) {
  if (!numbers.length) return "—";
  const ranges = [];
  let start = numbers[0];
  let end = numbers[0];
  for (const number of numbers.slice(1)) {
    if (number === end + 1) end = number;
    else {
      ranges.push(start === end ? `${start}` : `${start}—${end}`);
      start = end = number;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}—${end}`);
  return ranges.join("、");
}

function exerciseItemsForWeek(week, { includeOptional = false } = {}) {
  const items = [];
  if (week.week === "W01") items.push({ id: "W01-external", week: "W01", label: "第一章外部学习结果", total: 20, kind: "external" });
  for (const group of week.historicalPractice.filter((item) => includeOptional || item.requirement === "required")) {
    items.push({
      id: `${week.week}-${group.year}-${group.numbers.join("-")}`,
      week: week.week,
      label: `${group.year} 年 ${compactRanges(group.numbers)} 题（${group.requirement === "required" ? "必做" : "选做"}）`,
      total: group.numbers.length,
      kind: "historical-paper",
      questionMaterialId: `paper-${group.year}`,
      answerMaterialId: `answer-${group.year}`,
      questionPage: group.questionPages[0],
      answerPage: group.answerPages[0],
      questionIds: group.numbers.map((number) => `q-${group.year}-${number}`),
      requirement: group.requirement,
    });
  }
  if (week.fullPaper) {
    items.push({
      id: `${week.week}-paper-${week.fullPaper.year}`,
      week: week.week,
      label: `${week.fullPaper.year} 年综合知识整卷`,
      total: 75,
      kind: "historical-paper",
      questionMaterialId: week.fullPaper.materialId,
      answerMaterialId: week.fullPaper.materialId,
      questionPage: 1,
      answerPage: 1,
      questionIds: Array.from({ length: 75 }, (_, index) => `q-${week.fullPaper.year}-${index + 1}`),
    });
  }
  if (week.guideSupplementNeeded) {
    items.push({
      id: `${week.week}-guide-supplement`,
      week: week.week,
      label: `32 小时补题（建议 ${week.guideSupplementNeeded} 题）`,
      total: week.guideSupplementNeeded,
      kind: "published-guide",
      questionMaterialId: "guide-32h-2023",
      answerMaterialId: "guide-32h-2023",
      questionPage: Number.parseInt(week.guidePdfPages, 10),
      answerPage: Number.parseInt(week.guidePdfPages, 10),
    });
  }
  return items;
}

function renderEvidenceChain(week, materialById, { includeOptional = false } = {}) {
  if (!week) return "";
  const recall = week.recall.length
    ? week.recall.flatMap((item) => item.topics).map((topic) => `<span class="trend-chip">${escapeHtml(topic)}</span>`).join("")
    : `<span class="muted">本周不安排回忆题</span>`;
  const exercises = exerciseItemsForWeek(week, { includeOptional });
  const options = exercises.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("");
  const directExercises = exercises.filter((item) => item.kind === "historical-paper" && item.questionIds?.length);
  const directExerciseIds = directExercises.map((item) => item.id).join(",");
  const answerLinks = exercises.filter((item) => item.answerMaterialId).map((item) => {
    const material = materialById[item.answerMaterialId];
    const materialPath = material?.localRelativePath || "";
    return `<button type="button" class="material-link answer-entry" data-answer-for="${item.id}" data-material-path="${escapeHtml(materialPath)}" data-material-page="${item.answerPage || 1}" disabled>${escapeHtml(item.label)}：答案未解锁</button>`;
  }).join("");
  return `<section class="evidence-chain" aria-label="${week.week} 本周证据链">
    <div class="evidence-heading"><div><p class="eyebrow">EVIDENCE CHAIN</p><h5>本周证据链</h5></div><span class="trust-badge">${escapeHtml(week.channel)}</span></div>
    <dl class="evidence-sources"><div><dt>大纲边界</dt><dd>PDF ${escapeHtml(week.outlinePages)} 页</dd></div><div><dt>主教材</dt><dd>${escapeHtml(week.textbookPages)} 页</dd></div><div><dt>32 小时</dt><dd>${escapeHtml(week.guideSection)} · PDF ${escapeHtml(week.guidePdfPages)} 页</dd></div></dl>
    <div class="recall-trends"><strong>回忆题趋势（完成正式练习后查看，不计分）</strong><div>${recall}</div></div>
    <section class="direct-quiz" data-direct-quiz="${week.week}" data-quiz-exercises="${directExerciseIds}">
      <div class="direct-quiz-heading"><div><strong>本周练习题</strong><span>全部题目按顺序平铺；每题提交前不显示答案。</span></div></div>
      <p class="quiz-status" data-quiz-status>${directExerciseIds ? "正在检查本地题库…" : "本周没有可直接作答的正式题。"}</p>
      <div class="quiz-viewer quiz-flat-list" data-quiz-viewer></div>
    </section>
    <form class="practice-form" data-practice-form="${week.week}" novalidate>
      <label>日期<input name="date" type="date" required></label>
      <label>练习项<select name="exerciseId" required>${options}</select></label>
      <label>记录类型<select name="attemptType"><option value="first">首次</option><option value="redo">重做</option></select></label>
      <label>正确数<input name="correct" type="number" min="0" step="1" required></label>
      <label>总数<input name="total" type="number" min="1" step="1" required></label>
      <label>错误类型<select name="errorType"><option>概念混淆</option><option>题干误读</option><option>计算错误</option><option>记忆遗漏</option><option>解析争议</option></select></label>
      <label class="notes-field">备注<textarea name="notes" rows="2" maxlength="500" placeholder="可选，始终按纯文本保存"></textarea></label>
      <button type="submit">保存本次结果</button><p class="form-message" role="status"></p>
    </form>
    <div class="answer-entries"><strong>答案入口</strong>${answerLinks || `<span class="muted">本练习不提供答案入口</span>`}</div>
    <div class="attempt-list" data-attempt-list="${week.week}"><p class="muted">尚无练习记录。</p></div>
  </section>`;
}

function renderPracticeEntry(week) {
  if (!week) return "";
  const requiredCount = week.historicalPractice.filter((item) => item.requirement === "required").reduce((sum, item) => sum + item.numbers.length, 0);
  const optionalCount = week.historicalPractice.filter((item) => item.requirement === "optional").reduce((sum, item) => sum + item.numbers.length, 0);
  const formalText = week.week === "W01"
    ? "第一章外部学习结果登记"
    : week.fullPaper
    ? `${week.fullPaper.year} 年整卷`
    : `${requiredCount} 道必做 · ${optionalCount} 道选做${week.guideSupplementNeeded ? ` · ${week.guideSupplementNeeded} 道辅导书补题` : ""}`;
  return `<section class="week-practice-entry"><div><p class="eyebrow">WEEKLY PRACTICE</p><strong>本周证据与完整练习已移至独立页面</strong><span>${escapeHtml(formalText)}</span></div><a href="practices.html?week=${week.week}">进入 ${week.week} 完整练习 →</a></section>`;
}

function renderInline(value) {
  let text = escapeHtml(value);
  const codeSpans = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE${codeSpans.length}@@`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawHref) => {
    const href = /^(?:chapters|record)\//.test(rawHref) ? `${repositoryBase}/${rawHref}` : rawHref;
    return `<a href="${href}">${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  codeSpans.forEach((code, index) => {
    text = text.replace(`@@CODE${index}@@`, code);
  });
  return text;
}

function slugify(value, used) {
  const base = value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "") || "section";
  let slug = base;
  let index = 2;
  while (used.has(slug)) slug = `${base}-${index++}`;
  used.add(slug);
  return slug;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableDivider(line) {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return !line.trim() || /^#{1,6}\s/.test(line) || /^```/.test(line.trim()) ||
    /^---+$/.test(line.trim()) || /^>\s?/.test(line) || /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) || (line.includes("|") && isTableDivider(next));
}

function parseWeekDates(title) {
  const match = title.match(/（(\d{4})-(\d{2})-(\d{2})—(?:(\d{4})-)?(\d{2})-(\d{2})）/);
  if (!match) return null;
  const startYear = match[1];
  return {
    start: `${startYear}-${match[2]}-${match[3]}`,
    end: `${match[4] || startYear}-${match[5]}-${match[6]}`,
  };
}

function renderMarkdown(markdown, { weekly = false, evidenceByWeek = {}, materialById = {} } = {}) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const usedSlugs = new Set();
  const toc = [];
  const html = [];
  let index = 0;
  let openWeek = null;

  const closeWeek = () => {
    if (!openWeek) return;
    html.push(`${renderPracticeEntry(evidenceByWeek[openWeek])}<div class="week-state"><button type="button" data-week-toggle="${openWeek}" aria-pressed="false">标记本周完成</button><span>尚未完成</span></div></section>`);
    openWeek = null;
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.trim().match(/^```(.*)$/);
    if (fence) {
      const language = fence[1].trim();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      html.push(`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const weekMatch = title.match(/^W(\d{2})｜/);
      if (openWeek && level <= 4) closeWeek();
      const id = weekMatch ? `w${weekMatch[1]}` : slugify(title, usedSlugs);
      if (level <= 3) toc.push({ level, title, id });
      if (weekMatch && weekly) {
        const weekId = `W${weekMatch[1]}`;
        const dates = parseWeekDates(title);
        const attrs = dates ? ` data-start="${dates.start}" data-end="${dates.end}"` : "";
        html.push(`<section class="week-card" data-week="${weekId}"${attrs}>`);
        openWeek = weekId;
      }
      const anchor = level <= 3 ? `<a class="heading-anchor" href="#${id}" aria-label="链接到本节">#</a>` : "";
      html.push(`<h${level} id="${id}">${renderInline(title)}${anchor}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      html.push("<hr>");
      index += 1;
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] ?? "")) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(splitTableRow(lines[index++]));
      const headerHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
      const bodyHtml = rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("");
      html.push(`<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
      html.push(`<blockquote>${quote.filter(Boolean).map(renderInline).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      const items = [];
      while (index < lines.length && pattern.test(lines[index])) {
        const text = lines[index++].replace(pattern, "");
        items.push(`<li>${renderInline(text)}</li>`);
      }
      html.push(`<${tag}${openWeek ? ' class="week-details"' : ""}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) paragraph.push(lines[index++].trim());
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  closeWeek();
  return { html: html.join("\n"), toc };
}

function extractWeeks(markdown) {
  return [...markdown.matchAll(/^#### (W\d{2})｜(.+?)（([^）]+)）$/gm)].map((match) => ({ id: match[1], title: match[2], dates: match[3] }));
}

function extractPhases(markdown) {
  return [...markdown.matchAll(/^### (.+?)（(W\d{2}～W\d{2})）$/gm)].map((match, index) => ({
    title: match[1].replace(/^第.+?阶段：/, ""),
    range: match[2],
    description: phaseDescriptions[index] ?? "完成本阶段知识学习与验收。",
  }));
}

function navHtml(activeFile) {
  return activePages.map((page) => {
    const current = page.file === activeFile ? ' class="active" aria-current="page"' : "";
    return `<a href="${page.file}"${current}>${page.label}</a>`;
  }).join("");
}

function tocHtml(toc) {
  return toc.filter((entry) => entry.level >= 2).map((entry) => `<a class="toc-level-${entry.level}" href="#${entry.id}">${renderInline(entry.title)}</a>`).join("\n");
}

function weekJumpHtml(weeks) {
  return `<section class="progress-panel" aria-label="学习进度">
    <div class="progress-copy"><p class="eyebrow">40 WEEK TRACKER</p><strong><span id="completed-count">0</span> / ${weeks.length} 周已完成</strong><p id="plan-today">计划尚未开始</p></div>
    <div class="progress-actions"><div class="progress-track" aria-hidden="true"><span id="progress-fill"></span></div><button id="export-progress" type="button">导出</button><button id="import-progress" type="button">导入</button><input id="import-progress-file" type="file" accept="application/json,.json" hidden><button id="reset-progress" type="button">清除进度</button></div>
  </section>
  <nav class="week-jump" aria-label="周计划快速跳转">${weeks.map((week) => `<a href="#${week.id.toLowerCase()}" data-jump-week="${week.id}"><span>${week.id}</span><small>${week.dates.slice(5)}</small></a>`).join("")}</nav>`;
}

function progressScript(exerciseCatalog) {
  return `<script>
  const exerciseCatalog = ${JSON.stringify(exerciseCatalog).replaceAll("<", "\\u003c")};
  const exerciseById = Object.fromEntries(exerciseCatalog.map((item) => [item.id, item]));
  const weekCards = [...document.querySelectorAll("[data-week]")];
  const storagePrefix = "sa-comprehensive-40:";
  const progressKey = "sa-study-progress:v1";
  const schemaVersion = 1;
  const errorTypes = ["概念混淆", "题干误读", "计算错误", "记忆遗漏", "解析争议"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function emptyState() {
    const weekCompletion = {};
    for (let number = 1; number <= 40; number += 1) {
      const week = "W" + String(number).padStart(2, "0");
      let complete = false;
      try { complete = localStorage.getItem(storagePrefix + week) === "1"; } catch {}
      weekCompletion[week] = complete;
    }
    return { schemaVersion, weekCompletion, practiceRecords: [] };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressKey) || "null");
      if (parsed && parsed.schemaVersion === schemaVersion && parsed.weekCompletion && Array.isArray(parsed.practiceRecords)) return parsed;
    } catch {}
    const migrated = emptyState();
    saveState(migrated);
    return migrated;
  }

  function saveState(next) {
    try { localStorage.setItem(progressKey, JSON.stringify(next)); } catch {}
    for (const [week, complete] of Object.entries(next.weekCompletion)) {
      try { localStorage.setItem(storagePrefix + week, complete ? "1" : "0"); } catch {}
    }
  }

  let studyState = loadState();

  function updateProgress() {
    let completed = 0;
    weekCards.forEach((card) => {
      const week = card.dataset.week;
      const checked = studyState.weekCompletion[week] === true;
      card.classList.toggle("is-complete", checked);
      const button = card.querySelector("[data-week-toggle]");
      const state = button?.nextElementSibling;
      if (button) button.textContent = checked ? "取消完成" : "标记本周完成";
      if (button) button.setAttribute("aria-pressed", String(checked));
      if (state) state.textContent = checked ? "本周已完成" : "尚未完成";
      document.querySelector('[data-jump-week="' + week + '"]')?.classList.toggle("is-complete", checked);
      if (checked) completed += 1;
    });
    const count = document.querySelector("#completed-count");
    const fill = document.querySelector("#progress-fill");
    if (count) count.textContent = String(completed);
    if (fill) fill.style.width = String((completed / 40) * 100) + "%";
  }

  function hasFirstAttempt(exerciseId) {
    return studyState.practiceRecords.some((record) => record.exerciseId === exerciseId && record.attemptType === "first");
  }

  function updateAnswerEntries() {
    document.querySelectorAll("[data-answer-for]").forEach((button) => {
      const unlocked = hasFirstAttempt(button.dataset.answerFor);
      const meta = exerciseById[button.dataset.answerFor];
      button.disabled = !unlocked;
      button.textContent = (meta?.label || "答案") + (unlocked ? "：打开答案" : "：答案未解锁");
    });
  }

  function renderAttempts() {
    document.querySelectorAll("[data-attempt-list]").forEach((container) => {
      const records = studyState.practiceRecords.filter((record) => record.week === container.dataset.attemptList);
      container.replaceChildren();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "尚无练习记录。";
        container.append(empty);
        return;
      }
      for (const record of records) {
        const row = document.createElement("article");
        row.className = "attempt-row";
        const meta = exerciseById[record.exerciseId];
        const title = document.createElement("strong");
        title.textContent = (record.attemptType === "first" ? "首次" : "重做") + " · " + (meta?.label || record.exerciseId);
        const score = document.createElement("span");
        score.textContent = record.date + " · " + record.correct + "/" + record.total + "（" + Math.round(record.correct / record.total * 100) + "%） · " + record.errorType;
        row.append(title, score);
        if (record.notes) {
          const notes = document.createElement("p");
          notes.textContent = record.notes;
          row.append(notes);
        }
        container.append(row);
      }
    });
    updateAnswerEntries();
  }

  function showMessage(form, message, error = false) {
    const target = form.querySelector(".form-message");
    target.textContent = message;
    target.classList.toggle("is-error", error);
  }

  function materialUrl(relativePath, page = 1) {
    const localMode = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const base = localMode ? "../materials/local/" : "materials/local/";
    return base + relativePath + "#page=" + page;
  }

  function makeButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    return button;
  }

  function renderQuizPanel(panel, bankById) {
    const status = panel.querySelector("[data-quiz-status]");
    const viewer = panel.querySelector("[data-quiz-viewer]");
    if (!viewer) return;
    const exerciseIds = (panel.dataset.quizExercises || "").split(",").filter(Boolean);
    const exercises = exerciseIds.map((id) => exerciseById[id]).filter((exercise) => exercise?.questionIds?.length);
    const entries = exercises.flatMap((exercise) => exercise.questionIds.map((questionId) => ({ exercise, questionId, question: bankById[questionId] || null })));
    const scoreable = entries.filter(({ question }) => question?.answer && ["A", "B", "C", "D"].every((letter) => question.options?.[letter]));
    const quizState = panel._quizState || { responses: {}, drafts: {}, lastExerciseId: null };
    panel._quizState = quizState;
    const answered = Object.keys(quizState.responses).length;
    status.textContent = "本周共 " + entries.length + " 题 · 本地可作答 " + scoreable.length + " 题 · 已提交 " + answered + "/" + scoreable.length + " 题" + (scoreable.length < entries.length ? "；其余题需核对 PDF" : "");
    viewer.replaceChildren();

    entries.forEach(({ exercise, questionId, question }, index) => {
      const card = document.createElement("article");
      card.className = "quiz-question-card";
      card.dataset.questionId = questionId;
      const toolbar = document.createElement("div");
      toolbar.className = "quiz-question-toolbar";
      const counter = document.createElement("strong");
      counter.textContent = "第 " + (index + 1) + "/" + entries.length + " 题";
      const sourceWrap = document.createElement("div");
      sourceWrap.className = "quiz-question-source";
      const source = document.createElement("span");
      const requirement = exercise.requirement === "required" ? "必做" : exercise.requirement === "optional" ? "选做" : "整卷";
      source.textContent = question ? requirement + " · " + question.year + " 年第 " + question.number + " 题 · PDF " + (question.questionPage || "?") + " 页" : requirement + " · " + questionId + " · 未解析";
      sourceWrap.append(source);
      if (exercise.questionMaterialPath) {
        const original = document.createElement("a");
        original.className = "quiz-source-link";
        original.textContent = "查看 PDF 原题";
        original.href = materialUrl(exercise.questionMaterialPath, question?.questionPage || exercise.questionPage || 1);
        original.target = "_blank";
        original.rel = "noopener";
        sourceWrap.append(original);
      }
      toolbar.append(counter, sourceWrap);
      card.append(toolbar);

      if (!question) {
        const warning = document.createElement("p");
        warning.className = "quiz-warning";
        warning.textContent = "本地资料未包含这道题，不能在线作答；请使用原 PDF。";
        card.append(warning);
      } else {
        const stem = document.createElement("p");
        stem.className = "quiz-stem";
        stem.textContent = question.stem;
        card.append(stem);
        if (question.containsVisual) {
          const visual = document.createElement("p");
          visual.className = "quiz-warning";
          visual.textContent = "这道题含图、表或公式；网页文字仅作辅助，请同时核对 PDF 原页。";
          card.append(visual);
        }
        const optionList = document.createElement("div");
        optionList.className = "quiz-options";
        const existing = quizState.responses[question.id];
        for (const letter of ["A", "B", "C", "D"]) {
          const label = document.createElement("label");
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "quiz-" + panel.dataset.directQuiz + "-" + question.id;
          radio.value = letter;
          radio.disabled = Boolean(existing) || !question.options?.[letter];
          radio.checked = existing?.selected === letter || (!existing && quizState.drafts[question.id] === letter);
          radio.addEventListener("change", () => { quizState.drafts[question.id] = letter; });
          const copy = document.createElement("span");
          copy.textContent = letter + ". " + (question.options?.[letter] || "选项文字无法可靠抽取");
          label.append(radio, copy);
          if (existing && letter === question.answer) label.classList.add("is-correct");
          if (existing && letter === existing.selected && existing.selected !== question.answer) label.classList.add("is-wrong");
          optionList.append(label);
        }
        card.append(optionList);
        if (!question.answer || !["A", "B", "C", "D"].every((letter) => question.options?.[letter])) {
          const warning = document.createElement("p");
          warning.className = "quiz-warning";
          warning.textContent = "答案或选项不完整，此题不参与网页判分。";
          card.append(warning);
        } else if (!existing) {
          const submit = makeButton("提交本题答案", "quiz-submit");
          submit.addEventListener("click", () => {
            const selected = card.querySelector('input[type="radio"]:checked')?.value;
            if (!selected) {
              status.textContent = "请先选择第 " + (index + 1) + " 题的答案。";
              return;
            }
            quizState.responses[question.id] = { selected, correct: selected === question.answer };
            delete quizState.drafts[question.id];
            quizState.lastExerciseId = exercise.id;
            renderQuizPanel(panel, bankById);
          });
          card.append(submit);
        } else {
          const result = document.createElement("p");
          result.className = existing.correct ? "quiz-result is-correct" : "quiz-result is-wrong";
          result.textContent = existing.correct ? "回答正确。" : "回答错误；正确答案是 " + question.answer + "。";
          card.append(result);
        }
      }
      viewer.append(card);
    });

    const completedExercise = exerciseById[quizState.lastExerciseId];
    if (completedExercise?.questionIds?.length) {
      const completedQuestions = completedExercise.questionIds.map((id) => bankById[id] || null);
      const fullyScoreable = completedQuestions.every((question) => question?.answer && ["A", "B", "C", "D"].every((letter) => question.options?.[letter]));
      const fullyAnswered = completedQuestions.every((question) => question && quizState.responses[question.id]);
      if (fullyScoreable && fullyAnswered) {
        const correct = completedQuestions.filter((question) => quizState.responses[question.id].correct).length;
        const practiceForm = panel.parentElement.querySelector("[data-practice-form]");
        if (practiceForm) {
          practiceForm.elements.exerciseId.value = completedExercise.id;
          practiceForm.elements.correct.value = String(correct);
          practiceForm.elements.total.value = String(completedQuestions.length);
          showMessage(practiceForm, "本组网页作答已完成并填入 " + correct + "/" + completedQuestions.length + "；请选择错误类型后保存。", false);
        }
      }
    }
  }

  function initializeDirectQuizzes() {
    const panels = [...document.querySelectorAll("[data-direct-quiz]")].filter((panel) => panel.dataset.quizExercises);
    if (!panels.length) return;
    const script = document.createElement("script");
    script.src = "local/question-bank-data.js?cache=" + Date.now();
    script.addEventListener("load", () => {
      const bankById = Object.fromEntries((window.SA_QUESTION_BANK?.questions || []).map((question) => [question.id, question]));
      const renderVisiblePanel = () => {
        for (const panel of panels) {
          if (panel.closest("[data-practice-week-page]")?.hidden || panel.dataset.quizInitialized) continue;
          renderQuizPanel(panel, bankById);
          panel.dataset.quizInitialized = "true";
        }
      };
      document.addEventListener("practice-week-change", renderVisiblePanel);
      renderVisiblePanel();
    });
    script.addEventListener("error", () => {
      for (const panel of panels) panel.querySelector("[data-quiz-status]").textContent = "本地题库尚未生成，请先运行 node scripts/build-local-question-bank.mjs。";
    });
    document.head.append(script);
  }

  function validateImport(payload) {
    if (!payload || payload.schemaVersion !== schemaVersion) throw new Error("未知或不支持的 schemaVersion");
    if (!payload.weekCompletion || typeof payload.weekCompletion !== "object") throw new Error("缺少周完成状态");
    const expectedWeeks = Array.from({ length: 40 }, (_, index) => "W" + String(index + 1).padStart(2, "0"));
    for (const week of expectedWeeks) if (typeof payload.weekCompletion[week] !== "boolean") throw new Error("周次状态无效：" + week);
    if (!Array.isArray(payload.practiceRecords)) throw new Error("练习记录必须是数组");
    for (const record of payload.practiceRecords) {
      const meta = exerciseById[record.exerciseId];
      if (!meta || meta.week !== record.week) throw new Error("未知练习 ID 或周次不匹配：" + record.exerciseId);
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(record.date || "")) throw new Error("练习日期无效");
      if (!Number.isInteger(record.correct) || !Number.isInteger(record.total) || record.total <= 0 || record.correct < 0 || record.correct > record.total) throw new Error("练习数字范围无效");
      if (!["first", "redo"].includes(record.attemptType) || !errorTypes.includes(record.errorType)) throw new Error("练习类型或错误类型无效");
      if (typeof record.notes !== "string" || record.notes.length > 500) throw new Error("备注格式无效");
    }
    return { schemaVersion, weekCompletion: Object.fromEntries(expectedWeeks.map((week) => [week, payload.weekCompletion[week]])), practiceRecords: payload.practiceRecords };
  }

  weekCards.forEach((card) => {
    const start = card.dataset.start ? new Date(card.dataset.start + "T00:00:00") : null;
    const end = card.dataset.end ? new Date(card.dataset.end + "T23:59:59") : null;
    if (start && end && today >= start && today <= end) {
      card.classList.add("is-current");
      document.querySelector('[data-jump-week="' + card.dataset.week + '"]')?.classList.add("is-current");
      const todayText = document.querySelector("#plan-today");
      if (todayText) todayText.textContent = "当前执行 " + card.dataset.week;
    }
    card.querySelector("[data-week-toggle]")?.addEventListener("click", () => {
      studyState.weekCompletion[card.dataset.week] = !studyState.weekCompletion[card.dataset.week];
      saveState(studyState);
      updateProgress();
    });
  });

  document.querySelectorAll("[data-practice-form]").forEach((form) => {
    const dateInput = form.elements.date;
    const exerciseInput = form.elements.exerciseId;
    dateInput.value = new Date().toISOString().slice(0, 10);
    const syncTotal = () => { form.elements.total.value = exerciseById[exerciseInput.value]?.total || ""; };
    exerciseInput.addEventListener("change", syncTotal);
    syncTotal();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const exerciseId = exerciseInput.value;
      const meta = exerciseById[exerciseId];
      const correct = Number(form.elements.correct.value);
      const total = Number(form.elements.total.value);
      const attemptType = form.elements.attemptType.value;
      if (!meta || meta.week !== form.dataset.practiceForm) return showMessage(form, "练习项无效。", true);
      if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0 || correct < 0 || correct > total) return showMessage(form, "正确数和总数必须是有效整数，且正确数不能大于总数。", true);
      if (attemptType === "first" && hasFirstAttempt(exerciseId)) return showMessage(form, "该练习已有首次成绩，请改为“重做”。", true);
      if (attemptType === "redo" && !hasFirstAttempt(exerciseId)) return showMessage(form, "请先登记首次成绩，再记录重做。", true);
      const record = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
        week: meta.week,
        exerciseId,
        date: form.elements.date.value,
        attemptType,
        correct,
        total,
        errorType: form.elements.errorType.value,
        notes: form.elements.notes.value,
        createdAt: new Date().toISOString(),
      };
      studyState.practiceRecords.push(record);
      saveState(studyState);
      form.elements.correct.value = "";
      form.elements.notes.value = "";
      form.elements.attemptType.value = "redo";
      showMessage(form, "已保存；首次成绩不会被重做覆盖。", false);
      renderAttempts();
    });
  });

  document.querySelectorAll(".material-link").forEach((button) => button.addEventListener("click", () => {
    if (!button.disabled && button.dataset.materialPath) window.open(materialUrl(button.dataset.materialPath, button.dataset.materialPage || 1), "_blank", "noopener");
  }));

  document.querySelector("#export-progress")?.addEventListener("click", () => {
    const payload = { ...studyState, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sa-study-progress-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  document.querySelector("#import-progress")?.addEventListener("click", () => document.querySelector("#import-progress-file")?.click());
  document.querySelector("#import-progress-file")?.addEventListener("change", async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const validated = validateImport(JSON.parse(await file.text()));
      if (!window.confirm("导入将整体替换当前周完成状态和练习记录，是否继续？")) return;
      studyState = validated;
      saveState(studyState);
      updateProgress();
      renderAttempts();
      window.alert("学习进度导入成功。");
    } catch (error) {
      window.alert("导入失败，现有数据未改变：" + error.message);
    } finally { event.target.value = ""; }
  });

  document.querySelector("#reset-progress")?.addEventListener("click", () => {
    if (!window.confirm("确认清除 40 周完成状态与全部练习记录？")) return;
    studyState = emptyState();
    studyState.practiceRecords = [];
    for (const week of Object.keys(studyState.weekCompletion)) studyState.weekCompletion[week] = false;
    saveState(studyState);
    updateProgress();
    renderAttempts();
  });
  updateProgress();
  renderAttempts();
  initializeDirectQuizzes();
</script>`;
}

function pageTemplate({ title, description, activeFile, content, toc, weeks, exerciseCatalog, complete = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}｜系统架构设计师综合知识</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  <header class="topbar"><a class="brand" href="index.html"><span>SA</span><strong>综合知识学习计划</strong></a><nav>${navHtml(activeFile)}<button type="button" onclick="window.print()">打印 / PDF</button></nav></header>
  <div class="layout">
    <aside class="sidebar"><p class="eyebrow">PLAN SCOPE</p><strong>2026.09.01<br>— 2027.06.01</strong><dl><div><dt>40</dt><dd>学习周</dd></div><div><dt>1</dt><dd>科目</dd></div><div><dt>11</dt><dd>教材章</dd></div></dl><a href="${repositoryBase}/chapters/04-综合知识40周学习计划.md">Markdown 周计划</a><a href="${repositoryBase}/record/学习进度.md">学习进度记录</a></aside>
    <main id="main">${weekJumpHtml(weeks)}${complete ? content : `<article>${content}</article>`}</main>
    <aside class="toc"><p class="eyebrow">本页目录</p>${tocHtml(toc)}</aside>
  </div>
  <footer>综合知识 40 周计划 · 离线可用 · 进度仅保存在当前浏览器</footer>
  ${progressScript(exerciseCatalog)}
</body>
</html>`;
}

function parseCurrentStudyStatus(markdown) {
  const section = markdown.match(/## 当前状态\n([\s\S]*?)(?=\n## )/)?.[1];
  if (!section) throw new Error("record/学习进度.md 无法解析“当前状态”章节");
  const field = (label) => section.match(new RegExp(`^- ${label}：(.+)$`, "m"))?.[1]?.trim();
  const result = {
    chapter: field("当前章节"),
    point: field("当前最小知识点"),
    status: field("状态"),
    next: field("下一步"),
  };
  for (const [key, value] of Object.entries(result)) if (!value) throw new Error(`record/学习进度.md 当前状态无法解析字段：${key}`);
  return result;
}

function landingPage(phases, studyStatus) {
  const cards = phases.map((phase, index) => `<article class="phase-card"><span>${String(index + 1).padStart(2, "0")} · ${phase.range}</span><h2>${escapeHtml(phase.title)}</h2><p>${escapeHtml(phase.description)}</p></article>`).join("");
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="2026年9月1日至2027年6月1日系统架构设计师综合知识40周学习计划"><title>系统架构设计师综合知识 40 周计划</title><link rel="stylesheet" href="assets/styles.css"></head>
<body class="landing">
  <header class="topbar"><a class="brand" href="index.html"><span>SA</span><strong>综合知识学习计划</strong></a><nav><a href="04-weekly-plan.html">40 周计划</a><a href="practices.html">周练习</a><a href="materials.html">资料与练习</a><a href="complete-plan.html">完整单页</a><button type="button" onclick="window.print()">打印 / PDF</button></nav></header>
  <main class="landing-main" id="main">
    <section class="hero"><div class="hero-copy"><p class="eyebrow">COMPREHENSIVE KNOWLEDGE · 40 WEEKS</p><h1>把综合知识<br>学成一张完整地图</h1><p>从 2026 年 9 月 1 日到 2027 年 6 月 1 日。只规划综合知识，按教材内容、篇幅和理解难度逐周推进。</p><div class="hero-actions"><a class="primary" href="04-weekly-plan.html">开始查看 40 周计划</a><a href="practices.html?week=W01">进入本周完整练习</a><a href="materials.html">查看资料证据链</a></div></div><dl><div><dt>40</dt><dd>连续学习周</dd></div><div><dt>11</dt><dd>主教材章节</dd></div><div><dt>52</dt><dd>综合卷目标分</dd></div></dl></section>
    <section class="current-status-grid" aria-label="当前状态"><article><p class="eyebrow">CURRENT PLAN WEEK</p><h2>W01 · 第一章</h2><p><strong>外部学习</strong>。项目保留登记入口，不改判外部学习过程。</p></article><article><p class="eyebrow">CURRENT TUTORING POINT</p><h2>${escapeHtml(studyStatus.chapter)}</h2><p><strong>${escapeHtml(studyStatus.point)}</strong> · ${escapeHtml(studyStatus.status)}</p><p>下一步：${escapeHtml(studyStatus.next)}</p></article></section>
    <section class="scope-strip"><div><span>范围</span><strong>仅综合知识</strong></div><div><span>每周</span><strong>学什么 · 用什么 · 产出 · 目标</strong></div><div><span>方法</span><strong>理解 → 辨析 → 应用 → 备考</strong></div></section>
    <section class="section-heading"><p class="eyebrow">8 PHASES</p><h2>按难度分配时间，不平均切教材</h2></section>
    <section class="phase-grid">${cards}</section>
    <section class="usage-note"><div><p class="eyebrow">HOW TO USE</p><h2>日常只打开一页</h2></div><p>进入周计划，跳到当前周。完成教材精读、概念图或对比表、章节练习和闭卷验收后，再标记本周完成。若未达标，下一周先用 90 分钟处理最弱的 1～2 个知识点。</p><a href="04-weekly-plan.html">进入周计划 →</a></section>
  </main>
  <footer>系统架构设计师综合知识 · 2026-09-01—2027-06-01</footer>
</body>
</html>`;
}

function materialMatrix(materials) {
  const byYear = new Map();
  for (const item of materials) {
    const year = Number(item.id.match(/(20\d{2})/)?.[1]);
    if (year) byYear.set(year, [...(byYear.get(year) ?? []), item]);
  }
  return Array.from({ length: 17 }, (_, index) => 2009 + index).map((year) => {
    const items = byYear.get(year) ?? [];
    const formal = items.filter((item) => ["paper", "answer"].includes(item.category));
    const recall = items.filter((item) => item.category === "recall");
    let status = "—";
    if (year <= 2018) status = formal.length === 2 ? "题面 + 答案详解" : "缺失";
    else if (year <= 2021) status = formal.length === 1 ? "整卷及解析" : "缺失";
    else if (recall.length) status = "回忆/还原题（不计分）";
    else if (year === 2022) status = "考试大纲（非试卷）";
    else status = "未接入";
    return `<tr><th>${year}</th><td>${status}</td><td>${items.map((item) => escapeHtml(item.title)).join("<br>") || "—"}</td></tr>`;
  }).join("");
}

function practicesPage(evidenceData, materialById, exerciseCatalog) {
  const sections = evidenceData.weeks.map((week, index) => {
    const requiredCount = week.historicalPractice.filter((item) => item.requirement === "required").reduce((sum, item) => sum + item.numbers.length, 0);
    const optionalCount = week.historicalPractice.filter((item) => item.requirement === "optional").reduce((sum, item) => sum + item.numbers.length, 0);
    const previous = evidenceData.weeks[index - 1]?.week;
    const next = evidenceData.weeks[index + 1]?.week;
    const practiceSummary = week.week === "W01"
      ? "登记第一章外部学习结果；本项目不改判外部学习过程"
      : week.fullPaper
        ? `${week.fullPaper.year} 年整卷练习`
        : `${requiredCount} 道必做题、${optionalCount} 道选做题${week.guideSupplementNeeded ? `，另建议 ${week.guideSupplementNeeded} 道《32 小时通关》补题` : ""}`;
    return `<section class="practice-week-page" data-week="${week.week}" data-practice-week-page="${week.week}" id="practice-${week.week.toLowerCase()}" hidden>
      <header class="practice-week-header"><div><p class="eyebrow">${week.week} · ${escapeHtml(week.channel)}</p><h1>${week.week} 完整练习</h1><p>${practiceSummary}。选做题不重复计入必做达标。</p></div><a href="04-weekly-plan.html#${week.week.toLowerCase()}">← 返回 ${week.week} 周计划</a></header>
      ${renderEvidenceChain(week, materialById, { includeOptional: true })}
      <nav class="practice-neighbors" aria-label="相邻周练习">${previous ? `<a href="practices.html?week=${previous}">← ${previous}</a>` : "<span></span>"}${next ? `<a href="practices.html?week=${next}">${next} →</a>` : "<span></span>"}</nav>
      <div class="week-state"><button type="button" data-week-toggle="${week.week}" aria-pressed="false">标记本周完成</button><span>尚未完成</span></div>
    </section>`;
  }).join("");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="按周完成系统架构设计师综合知识全部必做题、选做题和补充练习"><title>周完整练习｜系统架构设计师综合知识</title><link rel="stylesheet" href="assets/styles.css"></head>
<body><a class="skip-link" href="#main">跳到正文</a><header class="topbar"><a class="brand" href="index.html"><span>SA</span><strong>综合知识学习计划</strong></a><nav>${navHtml("practices.html")}<button type="button" onclick="window.print()">打印 / PDF</button></nav></header>
<main class="practices-main" id="main"><section class="practice-picker"><div><p class="eyebrow">COMPLETE WEEKLY PRACTICE</p><h1>每周完整练习</h1><p>包含该周全部已映射必做题与选做题；辅导书补题和不可靠抽取继续保留 PDF 回退。</p></div><label>选择周次<select id="practice-week-select">${evidenceData.weeks.map((week) => `<option value="${week.week}">${week.week} · ${escapeHtml(week.channel)}</option>`).join("")}</select></label></section>${sections}</main>
<footer>完整练习按周加载 · 每题可查看 PDF 原题 · 首次提交后解锁答案</footer>
${progressScript(exerciseCatalog)}
<script>
  const practiceWeeks = ${JSON.stringify(evidenceData.weeks.map((week) => week.week))};
  const practiceSelector = document.querySelector("#practice-week-select");
  function showPracticeWeek(week, updateUrl = false) {
    const selected = practiceWeeks.includes(week) ? week : "W01";
    document.querySelectorAll("[data-practice-week-page]").forEach((section) => { section.hidden = section.dataset.practiceWeekPage !== selected; });
    practiceSelector.value = selected;
    document.title = selected + " 完整练习｜系统架构设计师综合知识";
    if (updateUrl) history.pushState({ week: selected }, "", "practices.html?week=" + selected);
    document.dispatchEvent(new CustomEvent("practice-week-change", { detail: { week: selected } }));
  }
  practiceSelector.addEventListener("change", () => showPracticeWeek(practiceSelector.value, true));
  window.addEventListener("popstate", () => showPracticeWeek(new URLSearchParams(location.search).get("week") || "W01"));
  showPracticeWeek(new URLSearchParams(location.search).get("week") || "W01");
</script></body></html>`;
}

function materialsPage(materialsData, evidenceData, questionBankStatus) {
  const trustCards = Object.entries(materialsData.trustLevels).map(([trust, policy]) => `<article class="trust-card"><span>${escapeHtml(trust)}</span><h2>${escapeHtml({ official: "大纲定边界", "published-guide": "32 小时压缩", "historical-paper": "真题验证", recall: "回忆题看趋势" }[trust])}</h2><p>${escapeHtml(policy)}</p></article>`).join("");
  const rows = materialsData.materials.map((item) => `<tr><td><code>${item.id}</code></td><td>${escapeHtml(item.title)}</td><td>${item.pages}</td><td>${(item.bytes / 1024 / 1024).toFixed(1)} MiB</td><td><span class="trust-badge">${item.trust}</span></td><td><button type="button" class="material-link" data-material-path="${escapeHtml(item.localRelativePath)}">打开 PDF</button></td></tr>`).join("");
  const weekPanels = evidenceData.weeks.map((week, index) => {
    const required = week.historicalPractice.filter((item) => item.requirement === "required");
    const formal = required.length ? required.map((group) => `${group.year} 年 ${compactRanges(group.numbers)} 题（题面 ${compactRanges(group.questionPages)} 页 / 答案 ${compactRanges(group.answerPages)} 页）`).join("；") : week.fullPaper ? `${week.fullPaper.year} 年整卷` : "对应 32 小时练习补题";
    const recall = week.recall.flatMap((item) => item.topics).join("；") || "无";
    return `<section class="week-evidence-panel" data-material-week="${week.week}"${index ? " hidden" : ""}><h2>${week.week} · ${escapeHtml(week.channel)}</h2><dl><div><dt>大纲</dt><dd>PDF ${escapeHtml(week.outlinePages)} 页</dd></div><div><dt>主教材</dt><dd>${escapeHtml(week.textbookPages)} 页</dd></div><div><dt>32 小时</dt><dd>${escapeHtml(week.guideSection)}；PDF ${escapeHtml(week.guidePdfPages)} 页</dd></div><div><dt>必做正式题</dt><dd>${escapeHtml(formal)}</dd></div><div><dt>回忆趋势</dt><dd>${escapeHtml(recall)}（不计分）</dd></div></dl></section>`;
  }).join("");
  const bankRows = questionBankStatus.papers.map((paper) => `<tr><th>${paper.year}</th><td>${paper.status === "complete" ? "完整" : paper.status === "partial" ? "部分" : "未解析"}</td><td>${paper.parsedQuestions}/${paper.expectedQuestions}</td><td>${paper.scoreableQuestions}</td><td>${escapeHtml(paper.warnings.join("；") || "—")}</td></tr>`).join("");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="系统架构设计师四类备考资料、可信度与逐周证据映射"><title>资料与练习｜系统架构设计师综合知识</title><link rel="stylesheet" href="assets/styles.css"></head>
<body><a class="skip-link" href="#main">跳到正文</a><header class="topbar"><a class="brand" href="index.html"><span>SA</span><strong>综合知识学习计划</strong></a><nav>${navHtml("materials.html")}<button type="button" onclick="window.print()">打印 / PDF</button></nav></header>
<main class="materials-main" id="main"><section class="materials-hero"><p class="eyebrow">FOUR MATERIAL ROLES</p><h1>资料与练习</h1><p>大纲定边界 → 主教材完成理解 → 32 小时压缩复习 → 历年真题验证 → 近年回忆题观察趋势。</p><p class="local-mode-note">PDF 已随学习站点发布，可从资料清单或每道练习题直接打开对应页面。</p></section>
<section class="trust-grid">${trustCards}</section>
<section class="material-section"><div class="section-heading"><p class="eyebrow">MATERIAL LIBRARY</p><h2>27 份资料状态</h2></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>资料</th><th>页数</th><th>大小</th><th>可信度</th><th>PDF</th></tr></thead><tbody>${rows}</tbody></table></div></section>
<section class="material-section"><div class="section-heading"><p class="eyebrow">2009—2025</p><h2>资料完整性矩阵</h2></div><div class="table-wrap"><table><thead><tr><th>年份</th><th>状态</th><th>已接入资料</th></tr></thead><tbody>${materialMatrix(materialsData.materials)}</tbody></table></div></section>
<section class="material-section"><div class="section-heading"><p class="eyebrow">LOCAL QUESTION BANK</p><h2>网页题库可靠覆盖</h2></div><p class="muted">“可判分”要求题干、四个选项和答案均能可靠定位；不足部分保留原 PDF 回退，不补造题目。</p><div class="table-wrap"><table><thead><tr><th>年份</th><th>状态</th><th>已拆分</th><th>可判分</th><th>说明</th></tr></thead><tbody>${bankRows}</tbody></table></div></section>
<section class="material-section"><div class="section-heading"><p class="eyebrow">WEEKLY EVIDENCE</p><h2>按周查看证据链</h2></div><label class="week-filter">选择周次<select id="material-week-select">${evidenceData.weeks.map((week) => `<option>${week.week}</option>`).join("")}</select></label>${weekPanels}</section></main>
<footer>题目与 PDF 已获授权公开 · 回忆题不计分</footer>
<script>const localMode = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1"; const materialBase = localMode ? "../materials/local/" : "materials/local/"; document.querySelectorAll(".material-link").forEach((button) => button.addEventListener("click", () => window.open(materialBase + button.dataset.materialPath, "_blank", "noopener"))); const selector = document.querySelector("#material-week-select"); selector.addEventListener("change", () => document.querySelectorAll("[data-material-week]").forEach((panel) => panel.hidden = panel.dataset.materialWeek !== selector.value));</script></body></html>`;
}

async function build() {
  await mkdir(assetsDir, { recursive: true });
  const [overviewMarkdown, weeklyMarkdown, materialsRaw, evidenceRaw, questionBankStatusRaw, recordMarkdown] = await Promise.all([
    readFile(overviewPath, "utf8"),
    readFile(weeklyPath, "utf8"),
    readFile(materialsPath, "utf8"),
    readFile(evidencePath, "utf8"),
    readFile(questionBankStatusPath, "utf8"),
    readFile(recordPath, "utf8"),
  ]);
  const materialsData = JSON.parse(materialsRaw);
  const evidenceData = JSON.parse(evidenceRaw);
  const questionBankStatus = JSON.parse(questionBankStatusRaw);
  const weeks = extractWeeks(weeklyMarkdown);
  const phases = extractPhases(weeklyMarkdown);
  if (weeks.length !== 40) throw new Error(`周计划应为 40 周，当前为 ${weeks.length} 周`);
  if (phases.length !== 8) throw new Error(`阶段应为 8 个，当前为 ${phases.length} 个`);
  if (evidenceData.weeks.length !== 40 || evidenceData.weeks.some((week, index) => week.week !== `W${String(index + 1).padStart(2, "0")}`)) throw new Error("data/week-evidence.json 必须包含顺序正确的 W01—W40");
  const studyStatus = parseCurrentStudyStatus(recordMarkdown);
  const evidenceByWeek = Object.fromEntries(evidenceData.weeks.map((week) => [week.week, week]));
  const materialById = Object.fromEntries(materialsData.materials.map((material) => [material.id, material]));
  const exerciseCatalog = evidenceData.weeks.flatMap((week) => exerciseItemsForWeek(week, { includeOptional: true })).map((item) => {
    const material = item.questionMaterialId ? materialById[item.questionMaterialId] : null;
    return material ? { ...item, questionMaterialPath: material.localRelativePath } : item;
  });

  const weeklyRendered = renderMarkdown(weeklyMarkdown, { weekly: true, evidenceByWeek, materialById });
  const overviewRendered = renderMarkdown(overviewMarkdown);
  const completeContent = `<article class="overview-article">${overviewRendered.html}</article><article class="weekly-article">${weeklyRendered.html}</article>`;
  const completeToc = [...overviewRendered.toc, ...weeklyRendered.toc];

  await Promise.all([
    writeFile(path.join(htmlDir, "index.html"), landingPage(phases, studyStatus), "utf8"),
    writeFile(path.join(htmlDir, "04-weekly-plan.html"), pageTemplate({ title: "综合知识 40 周学习计划", description: "逐周列出学习内容、使用材料、周产出、证据链和可量化达标目标。", activeFile: "04-weekly-plan.html", content: weeklyRendered.html, toc: weeklyRendered.toc, weeks, exerciseCatalog }), "utf8"),
    writeFile(path.join(htmlDir, "practices.html"), practicesPage(evidenceData, materialById, exerciseCatalog), "utf8"),
    writeFile(path.join(htmlDir, "materials.html"), materialsPage(materialsData, evidenceData, questionBankStatus), "utf8"),
    writeFile(path.join(htmlDir, "complete-plan.html"), pageTemplate({ title: "综合知识完整计划", description: "系统架构设计师综合知识总览与 40 周完整执行计划。", activeFile: "complete-plan.html", content: completeContent, toc: completeToc, weeks, exerciseCatalog, complete: true }), "utf8"),
  ]);

  console.log(JSON.stringify({ htmlPages: 5, weeks: weeks.length, phases: phases.length, materials: materialsData.materials.length, exercises: exerciseCatalog.length }, null, 2));
}

await build();
