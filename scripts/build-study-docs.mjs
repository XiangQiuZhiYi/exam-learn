import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const htmlDir = path.join(projectDir, "html");
const assetsDir = path.join(htmlDir, "assets");
const overviewPath = path.join(projectDir, "系统架构设计师备考总计划.md");
const weeklyPath = path.join(projectDir, "chapters", "04-综合知识40周学习计划.md");

const activePages = [
  { file: "04-weekly-plan.html", label: "40 周计划" },
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function renderMarkdown(markdown, { weekly = false } = {}) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const usedSlugs = new Set();
  const toc = [];
  const html = [];
  let index = 0;
  let openWeek = null;

  const closeWeek = () => {
    if (!openWeek) return;
    html.push(`<div class="week-state"><button type="button" data-week-toggle="${openWeek}" aria-pressed="false">标记本周完成</button><span>尚未完成</span></div></section>`);
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
    <div class="progress-actions"><div class="progress-track" aria-hidden="true"><span id="progress-fill"></span></div><button id="reset-progress" type="button">清除进度</button></div>
  </section>
  <nav class="week-jump" aria-label="周计划快速跳转">${weeks.map((week) => `<a href="#${week.id.toLowerCase()}" data-jump-week="${week.id}"><span>${week.id}</span><small>${week.dates.slice(5)}</small></a>`).join("")}</nav>`;
}

const progressScript = `<script>
  const weekCards = [...document.querySelectorAll("[data-week]")];
  const storagePrefix = "sa-comprehensive-40:";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function updateProgress() {
    let completed = 0;
    weekCards.forEach((card) => {
      const week = card.dataset.week;
      let checked = false;
      try { checked = localStorage.getItem(storagePrefix + week) === "1"; } catch {}
      card.classList.toggle("is-complete", checked);
      const button = card.querySelector("[data-week-toggle]");
      const state = button?.nextElementSibling;
      if (button) button.textContent = checked ? "取消完成" : "标记本周完成";
      if (button) button.setAttribute("aria-pressed", String(checked));
      if (state) state.textContent = checked ? "本周已完成" : "尚未完成";
      const jump = document.querySelector('[data-jump-week="' + week + '"]');
      jump?.classList.toggle("is-complete", checked);
      if (checked) completed += 1;
    });
    const count = document.querySelector("#completed-count");
    const fill = document.querySelector("#progress-fill");
    if (count) count.textContent = String(completed);
    if (fill) fill.style.width = String((completed / 40) * 100) + "%";
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
      const key = storagePrefix + card.dataset.week;
      try { localStorage.setItem(key, card.classList.contains("is-complete") ? "0" : "1"); } catch {}
      updateProgress();
    });
  });

  document.querySelector("#reset-progress")?.addEventListener("click", () => {
    if (!window.confirm("确认清除 40 周的本地完成记录？")) return;
    weekCards.forEach((card) => {
      try { localStorage.removeItem(storagePrefix + card.dataset.week); } catch {}
    });
    updateProgress();
  });
  updateProgress();
</script>`;

function pageTemplate({ title, description, activeFile, content, toc, weeks, complete = false }) {
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
  ${progressScript}
</body>
</html>`;
}

function landingPage(phases) {
  const cards = phases.map((phase, index) => `<article class="phase-card"><span>${String(index + 1).padStart(2, "0")} · ${phase.range}</span><h2>${escapeHtml(phase.title)}</h2><p>${escapeHtml(phase.description)}</p></article>`).join("");
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="2026年9月1日至2027年6月1日系统架构设计师综合知识40周学习计划"><title>系统架构设计师综合知识 40 周计划</title><link rel="stylesheet" href="assets/styles.css"></head>
<body class="landing">
  <header class="topbar"><a class="brand" href="index.html"><span>SA</span><strong>综合知识学习计划</strong></a><nav><a href="04-weekly-plan.html">40 周计划</a><a href="complete-plan.html">完整单页</a><button type="button" onclick="window.print()">打印 / PDF</button></nav></header>
  <main class="landing-main" id="main">
    <section class="hero"><div class="hero-copy"><p class="eyebrow">COMPREHENSIVE KNOWLEDGE · 40 WEEKS</p><h1>把综合知识<br>学成一张完整地图</h1><p>从 2026 年 9 月 1 日到 2027 年 6 月 1 日。只规划综合知识，按教材内容、篇幅和理解难度逐周推进。</p><div class="hero-actions"><a class="primary" href="04-weekly-plan.html">开始查看 40 周计划</a><a href="complete-plan.html">阅读总览与完整计划</a></div></div><dl><div><dt>40</dt><dd>连续学习周</dd></div><div><dt>11</dt><dd>主教材章节</dd></div><div><dt>52</dt><dd>综合卷目标分</dd></div></dl></section>
    <section class="scope-strip"><div><span>范围</span><strong>仅综合知识</strong></div><div><span>每周</span><strong>学什么 · 用什么 · 产出 · 目标</strong></div><div><span>方法</span><strong>理解 → 辨析 → 应用 → 备考</strong></div></section>
    <section class="section-heading"><p class="eyebrow">8 PHASES</p><h2>按难度分配时间，不平均切教材</h2></section>
    <section class="phase-grid">${cards}</section>
    <section class="usage-note"><div><p class="eyebrow">HOW TO USE</p><h2>日常只打开一页</h2></div><p>进入周计划，跳到当前周。完成教材精读、概念图或对比表、章节练习和闭卷验收后，再标记本周完成。若未达标，下一周先用 90 分钟处理最弱的 1～2 个知识点。</p><a href="04-weekly-plan.html">进入周计划 →</a></section>
  </main>
  <footer>系统架构设计师综合知识 · 2026-09-01—2027-06-01</footer>
</body>
</html>`;
}

async function build() {
  await mkdir(assetsDir, { recursive: true });
  const [overviewMarkdown, weeklyMarkdown] = await Promise.all([readFile(overviewPath, "utf8"), readFile(weeklyPath, "utf8")]);
  const weeks = extractWeeks(weeklyMarkdown);
  const phases = extractPhases(weeklyMarkdown);
  if (weeks.length !== 40) throw new Error(`周计划应为 40 周，当前为 ${weeks.length} 周`);
  if (phases.length !== 8) throw new Error(`阶段应为 8 个，当前为 ${phases.length} 个`);

  const weeklyRendered = renderMarkdown(weeklyMarkdown, { weekly: true });
  const overviewRendered = renderMarkdown(overviewMarkdown);
  const completeContent = `<article class="overview-article">${overviewRendered.html}</article><article class="weekly-article">${weeklyRendered.html}</article>`;
  const completeToc = [...overviewRendered.toc, ...weeklyRendered.toc];

  await Promise.all([
    writeFile(path.join(htmlDir, "index.html"), landingPage(phases), "utf8"),
    writeFile(path.join(htmlDir, "04-weekly-plan.html"), pageTemplate({ title: "综合知识 40 周学习计划", description: "逐周列出学习内容、使用材料、周产出和可量化达标目标。", activeFile: "04-weekly-plan.html", content: weeklyRendered.html, toc: weeklyRendered.toc, weeks }), "utf8"),
    writeFile(path.join(htmlDir, "complete-plan.html"), pageTemplate({ title: "综合知识完整计划", description: "系统架构设计师综合知识总览与 40 周完整执行计划。", activeFile: "complete-plan.html", content: completeContent, toc: completeToc, weeks, complete: true }), "utf8"),
  ]);

  console.log(JSON.stringify({ htmlPages: 3, weeks: weeks.length, phases: phases.length }, null, 2));
}

await build();
