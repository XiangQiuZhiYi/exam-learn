import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeeklyPlanMarkdown, weeks } from "./weekly-plan-data.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const sourcePath = path.join(projectDir, "系统架构设计师备考总计划.md");
const chaptersDir = path.join(projectDir, "chapters");
const htmlDir = path.join(projectDir, "html");
const assetsDir = path.join(htmlDir, "assets");

const weeklyGoals = {
  W01: "了解考试全貌并建立当前能力基线",
  W02: "搭好学习系统，确定真实项目与实践主线",
  W03: "掌握数据表示与校验的基本原理",
  W04: "理解存储层次、Cache 与虚拟存储",
  W05: "掌握流水线、I/O、性能与可靠性计算",
  W06: "建立进程、线程和调度的完整概念图",
  W07: "能够分析同步互斥、PV 操作与死锁",
  W08: "掌握分页分段及典型页面置换算法",
  W09: "补齐文件、磁盘与设备管理知识",
  W10: "掌握线性结构及常见操作复杂度",
  W11: "理解树结构、哈夫曼编码和 B+ 树用途",
  W12: "掌握图、查找、哈希与排序的选型依据",
  W13: "建立网络分层和数据封装全链路认知",
  W14: "能够独立完成子网计算并解释路由与 NAT",
  W15: "理解 TCP/UDP 及可靠传输机制",
  W16: "串起 DNS、HTTPS、代理和负载均衡链路",
  W17: "掌握数据库体系、关系模型和 ER 设计",
  W18: "掌握 SQL、函数依赖与规范化设计",
  W19: "理解事务、并发、恢复、索引和查询优化",
  W20: "能够根据项目约束选择软件开发模型",
  W21: "掌握需求分类、获取、分析与建模",
  W22: "能够为不同问题选择并绘制合适的 UML 图",
  W23: "掌握设计原则、模式、测试和维护方法",
  W24: "建立企业信息系统及集成的整体认识",
  W25: "理解密码、认证、授权和安全协议",
  W26: "能够从威胁和风险推导安全控制措施",
  W27: "补齐项目管理、标准法规与专业英语基础",
  W28: "建立从需求到架构描述与视图的主线",
  W29: "能够识别并选择基础架构风格",
  W30: "掌握高频架构风格的组合与权衡",
  W31: "能够写出可度量的质量属性场景",
  W32: "能够从质量目标推导具体架构战术",
  W33: "掌握 ATAM/SAAM 及风险与权衡分析",
  W34: "掌握可靠性、可用性计算和容错策略",
  W35: "理解架构演化、迁移和技术债治理",
  W36: "建立新技术知识框架并完成架构核心复盘",
  W37: "能够从业务目标推导信息系统四层架构",
  W38: "掌握层次式架构的职责、依赖和代价",
  W39: "理解云原生关键构件并完成容器化部署",
  W40: "掌握 SOA/微服务边界、通信与分布式代价",
  W41: "具备嵌入式与通信架构的基础得分能力",
  W42: "能够设计分层、可追溯的系统安全架构",
  W43: "能够按数据特征选择批流与湖仓架构",
  W44: "完成官方教程第一轮并形成全局知识地图",
  W45: "用完整真题检验第一轮学习并锁定弱项",
  W46: "形成架构风格与微服务案例的规范答题能力",
  W47: "突破质量属性、评估和可靠性案例",
  W48: "掌握数据、缓存、消息与一致性案例分析",
  W49: "掌握云原生、安全、大数据案例并完成压测闭环",
  W50: "建立可信论文素材库和八主题审题框架",
  W51: "完成架构风格与质量属性论文训练",
  W52: "完成微服务与云原生论文训练",
  W53: "完成高可用与安全架构论文训练",
  W54: "完成数据与架构演化论文训练并验收 P4",
  W55: "完成首次三科全真模拟并修正时间分配",
  W56: "稳定三科及格并提升机考操作熟练度",
  W57: "用最新题型校准知识边界和得分稳定性",
  W58: "清理高风险错题并提高论文稳定性",
  W59: "完成知识压缩并守住三科安全分",
  W60: "完成最后全真验证并冻结学习范围",
  W61: "保持考试状态，完成考务和轻量复习",
  W62: "平稳完成考试并记录复盘信息",
};

const chapterDefinitions = [
  {
    number: 1,
    title: "目标与备考策略",
    markdownFile: "01-目标与备考策略.md",
    htmlFile: "01-goals-and-strategy.html",
    sections: [0, 1, 2],
    description: "考试目标、个人基础、能力缺口和总体学习顺序。",
  },
  {
    number: 2,
    title: "教材、视频与工具",
    markdownFile: "02-教材视频与工具.md",
    htmlFile: "02-resources.html",
    sections: [3],
    description: "官方教材、主线课程、补充视频、题库和实践工具。",
  },
  {
    number: 3,
    title: "学习方法、时间与阶段",
    markdownFile: "03-学习方法时间与阶段.md",
    htmlFile: "03-method-and-phases.html",
    sections: [4, 5, 6],
    description: "学习闭环、笔记系统、标准周安排和阶段验收。",
  },
  {
    number: 4,
    title: "62 周学习计划",
    markdownFile: "04-62周学习计划.md",
    htmlFile: "04-weekly-plan.html",
    sections: [7],
    description: "每周目标、教材视频、练习实践、输出与验收标准。",
  },
  {
    number: 5,
    title: "知识难点与架构实践",
    markdownFile: "05-知识难点与架构实践.md",
    htmlFile: "05-difficulties-and-practice.html",
    sections: [8, 9],
    description: "各模块难点、掌握深度和贯穿式 Node.js 架构项目。",
  },
  {
    number: 6,
    title: "综合、案例与论文",
    markdownFile: "06-综合案例与论文.md",
    htmlFile: "06-three-subjects.html",
    sections: [10, 11, 12],
    description: "三科的训练轮次、答题结构和论文素材体系。",
  },
  {
    number: 7,
    title: "复盘、验收与进度恢复",
    markdownFile: "07-复盘验收与进度恢复.md",
    htmlFile: "07-review-and-recovery.html",
    sections: [13, 14],
    description: "月度仪表盘、进度调整和中断后的恢复方案。",
  },
  {
    number: 8,
    title: "考务、启动清单与资料来源",
    markdownFile: "08-考务启动与资料来源.md",
    htmlFile: "08-exam-and-sources.html",
    sections: [15, 16, 17, 18],
    description: "报名机考、健康后勤、前 14 天任务和版本核对来源。",
  },
];

function addWeeklyGoalColumn(markdown) {
  if (markdown.includes("| 周次 | 日期 | 本周目标 | 学习内容与资源 |")) {
    return markdown;
  }

  let output = markdown.replaceAll(
    "| 周次 | 日期 | 学习内容与资源 | 题目 / 实践 / 输出 | 验收标准 |\n| --- | --- | --- | --- | --- |",
    "| 周次 | 日期 | 本周目标 | 学习内容与资源 | 题目 / 实践 / 输出 | 验收标准 |\n| --- | --- | --- | --- | --- | --- |",
  );

  output = output
    .split("\n")
    .map((line) => {
      const match = line.match(/^\| (W\d{2}) \|/);
      if (!match) return line;
      const goal = weeklyGoals[match[1]];
      if (!goal) throw new Error(`缺少 ${match[1]} 的周目标`);
      return line.replace(`| ${match[1]} |`, `| ${match[1]} |`).replace(
        /^(\| W\d{2} \| [^|]+ \| )/,
        `$1${goal} | `,
      );
    })
    .join("\n");

  output = output.replace(
    "说明：教材章节均指《系统架构设计师教程（第 2 版）》。每周默认还要完成 1 次错题复习和 3 次 10 分钟专业英语，不再在表中重复。",
    "说明：教材章节均指《系统架构设计师教程（第 2 版）》。每周默认还要完成 1 次错题复习和 3 次 10 分钟专业英语，不再在表中重复。‘本周目标’描述要形成的能力，‘验收标准’描述证明目标达成的证据。",
  );
  return output;
}

function parseSections(markdown) {
  const matches = [...markdown.matchAll(/^## (\d+)\.\s+(.+)$/gm)];
  const preamble = markdown.slice(0, matches[0].index).trim();
  const sections = new Map();
  matches.forEach((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    sections.set(Number(match[1]), markdown.slice(start, end).trim());
  });
  return { preamble, sections };
}

function replaceNumberedSection(markdown, sectionNumber, replacement) {
  const startPattern = new RegExp(`^## ${sectionNumber}\\.\\s+.+$`, "m");
  const startMatch = markdown.match(startPattern);
  if (!startMatch || startMatch.index == null) {
    throw new Error(`找不到第 ${sectionNumber} 节`);
  }
  const nextPattern = new RegExp(`^## ${sectionNumber + 1}\\.\\s+.+$`, "m");
  const afterStart = markdown.slice(startMatch.index + startMatch[0].length);
  const nextMatch = afterStart.match(nextPattern);
  const end = nextMatch?.index == null
    ? markdown.length
    : startMatch.index + startMatch[0].length + nextMatch.index;
  return `${markdown.slice(0, startMatch.index)}${replacement.trim()}\n\n${markdown.slice(end).trimStart()}`;
}

function chapterMarkdown(definition, sourceParts) {
  const body = definition.sections
    .map((number) => sourceParts.sections.get(number))
    .filter(Boolean)
    .join("\n\n---\n\n");
  const preamble = definition.number === 1
    ? `${sourceParts.preamble}\n\n---\n\n`
    : "";
  return `# 第${definition.number}章 ${definition.title}\n\n` +
    `[← 返回章节目录](../README.md) · [查看 HTML 版](../html/${definition.htmlFile})\n\n` +
    `> ${definition.description}\n\n---\n\n${preamble}${body}\n`;
}

function escapeHtml(value) {
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
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|[^)]+\.html(?:#[^)]+)?|\.\.\/[^)]+|#[^)]+)\)/g, '<a href="$2">$1</a>');
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

function renderMarkdown(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const usedSlugs = new Set();
  const toc = [];
  const html = [];
  let index = 0;
  let checklistIndex = 0;

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
      const weekHeading = title.match(/^W(\d{2})(?:\b|｜)/);
      const id = weekHeading ? `w${weekHeading[1]}` : slugify(title, usedSlugs);
      usedSlugs.add(id);
      if (level <= 3) toc.push({ level, title, id });
      html.push(`<h${level} id="${id}">${renderInline(title)}<a class="heading-anchor" href="#${id}" aria-label="链接到本节">#</a></h${level}>`);
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
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index++]));
      }
      const headerHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
      const bodyHtml = rows.map((row) => {
        const week = row[0]?.match(/^W(\d{2})$/);
        const rowId = week ? ` id="w${week[1]}"` : "";
        const cells = row.map((cell, cellIndex) => {
          const content = cellIndex === 0 && week
            ? `<a class="week-anchor" href="#w${week[1]}">${renderInline(cell)}</a>`
            : renderInline(cell);
          return `<td>${content}</td>`;
        }).join("");
        return `<tr${rowId}>${cells}</tr>`;
      }).join("");
      html.push(`<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index++].replace(/^>\s?/, ""));
      }
      html.push(`<blockquote>${quote.map(renderInline).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? "ol" : "ul";
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      const items = [];
      while (index < lines.length && (pattern.test(lines[index]) || /^\s{2,}[-*+]\s+/.test(lines[index]))) {
        const current = lines[index++];
        const nested = /^\s{2,}/.test(current);
        const text = current.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "");
        const checkbox = text.match(/^\[([ xX])\]\s+(.+)$/);
        const content = checkbox
          ? `<label class="check-item"><input type="checkbox" data-plan-check="${checklistIndex++}"${checkbox[1].trim() ? " checked" : ""}><span>${renderInline(checkbox[2])}</span></label>`
          : renderInline(text);
        items.push(`<li${nested ? ' class="nested-item"' : ""}>${content}</li>`);
      }
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index++].trim());
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return { html: html.join("\n"), toc };
}

function navHtml(activeFile) {
  return chapterDefinitions.map((chapter) => {
    const active = chapter.htmlFile === activeFile ? ' aria-current="page" class="active"' : "";
    return `<a href="${chapter.htmlFile}"${active}><span>${String(chapter.number).padStart(2, "0")}</span>${chapter.title}</a>`;
  }).join("\n");
}

function tocHtml(toc) {
  return toc
    .filter((entry) => entry.level >= 2)
    .map((entry) => `<a class="toc-level-${entry.level}" href="#${entry.id}">${renderInline(entry.title)}</a>`)
    .join("\n");
}

function weekJumpHtml() {
  return `<section class="week-jump" aria-label="周计划快速跳转">
    <strong>快速跳转到周次</strong>
    <div>${Array.from({ length: 62 }, (_, index) => {
      const week = String(index + 1).padStart(2, "0");
      return `<a href="#w${week}">W${week}</a>`;
    }).join("")}</div>
  </section>`;
}

function pageTemplate({ title, description, activeFile, articleHtml, toc, previous, next, showWeekJump = false }) {
  const pager = `<nav class="pager" aria-label="章节翻页">
    ${previous ? `<a rel="prev" href="${previous.htmlFile}">← 第${previous.number}章 ${previous.title}</a>` : "<span></span>"}
    ${next ? `<a rel="next" href="${next.htmlFile}">第${next.number}章 ${next.title} →</a>` : "<span></span>"}
  </nav>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}｜系统架构设计师备考计划</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  <header class="topbar">
    <a class="brand" href="index.html"><span>SA</span><strong>系统架构设计师备考</strong></a>
    <nav>
      <a href="complete-plan.html">完整单页</a>
      <button type="button" onclick="window.print()">打印 / PDF</button>
    </nav>
  </header>
  <div class="layout">
    <aside class="sidebar">
      <p class="eyebrow">章节导航</p>
      ${navHtml(activeFile)}
      <a class="source-link" href="../系统架构设计师备考总计划.md">查看 Markdown 总文档</a>
    </aside>
    <main id="main">
      <div class="chapter-meta"><span>2027 年 10 月目标</span><span>每周 8～10 小时</span></div>
      ${showWeekJump ? weekJumpHtml() : ""}
      <article>${articleHtml}</article>
      ${pager}
    </main>
    <aside class="toc">
      <p class="eyebrow">本页目录</p>
      ${tocHtml(toc)}
    </aside>
  </div>
  <footer>离线 HTML 版本 · 生成自项目中的 Markdown 文档 · 2026-08-19</footer>
  <script>
    document.querySelectorAll("[data-plan-check]").forEach((box) => {
      const key = "sa-plan:" + location.pathname + ":" + box.dataset.planCheck;
      try { box.checked = localStorage.getItem(key) === "1"; } catch {}
      box.addEventListener("change", () => {
        try { localStorage.setItem(key, box.checked ? "1" : "0"); } catch {}
      });
    });
  </script>
</body>
</html>`;
}

function landingPage() {
  const cards = chapterDefinitions.map((chapter) => `<a class="chapter-card" href="${chapter.htmlFile}">
    <span>第 ${String(chapter.number).padStart(2, "0")} 章</span>
    <h2>${chapter.title}</h2>
    <p>${chapter.description}</p>
  </a>`).join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="系统架构设计师软考高级 62 周系统备考计划">
  <title>系统架构设计师备考计划</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="landing">
  <header class="topbar">
    <a class="brand" href="index.html"><span>SA</span><strong>系统架构设计师备考</strong></a>
    <nav><a href="complete-plan.html">打开完整单页</a><button type="button" onclick="window.print()">打印 / PDF</button></nav>
  </header>
  <main class="landing-main">
    <section class="hero">
      <p class="eyebrow">FRONTEND → SYSTEM ARCHITECT</p>
      <h1>2027 年 10 月<br>系统架构设计师备考计划</h1>
      <p>面向前端开发、其他知识按零基础规划。62 周分阶段推进，每周都有能力目标、学习任务、实践输出和验收标准。</p>
      <div class="hero-actions"><a class="primary" href="04-weekly-plan.html">查看 62 周计划</a><a href="01-goals-and-strategy.html">从第一章开始</a></div>
      <dl><div><dt>62</dt><dd>周详细目标</dd></div><div><dt>8</dt><dd>独立章节</dd></div><div><dt>3</dt><dd>科同步训练</dd></div></dl>
    </section>
    <section class="chapter-grid">${cards}</section>
    <section class="usage-note">
      <h2>推荐阅读顺序</h2>
      <p>第一次阅读按第 1～8 章顺序进行；开始执行后，日常只需要打开第 4 章查看当前周目标，再按链接回到相应资源和方法章节。</p>
      <p>2027 年正式考务安排尚未发布，所有日期均为规划锚点，正式通知发布后应重新校准。</p>
    </section>
  </main>
  <footer>可离线浏览 · 无第三方脚本或字体依赖 · 2026-08-19</footer>
</body>
</html>`;
}

const styles = `:root {
  --ink: #17211f;
  --muted: #60706b;
  --paper: #f7f4ec;
  --panel: #fffdf8;
  --line: #d9ded8;
  --accent: #0d6b57;
  --accent-soft: #dff1ea;
  --warm: #b85c38;
  --shadow: 0 18px 55px rgba(29, 50, 44, .10);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--ink);
  background: var(--paper);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 86px; }
body { margin: 0; line-height: 1.72; background: var(--paper); }
a { color: var(--accent); text-underline-offset: 3px; }
button, a { -webkit-tap-highlight-color: transparent; }
.skip-link { position: fixed; left: 12px; top: -60px; z-index: 20; padding: 10px 14px; color: white; background: var(--accent); }
.skip-link:focus { top: 12px; }
.topbar { position: sticky; top: 0; z-index: 10; height: 66px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; border-bottom: 1px solid rgba(23, 33, 31, .12); background: rgba(247, 244, 236, .94); backdrop-filter: blur(14px); }
.brand { display: flex; align-items: center; gap: 11px; color: var(--ink); text-decoration: none; }
.brand span { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; color: white; background: var(--accent); font-weight: 800; letter-spacing: -.04em; }
.topbar nav { display: flex; align-items: center; gap: 16px; }
.topbar nav a, .topbar button { color: var(--ink); background: none; border: 0; font: inherit; cursor: pointer; text-decoration: none; }
.layout { display: grid; grid-template-columns: 260px minmax(0, 920px) 210px; gap: 38px; max-width: 1490px; margin: 0 auto; padding: 36px 28px 80px; }
.sidebar, .toc { position: sticky; top: 92px; align-self: start; max-height: calc(100vh - 118px); overflow: auto; }
.sidebar > a { display: flex; gap: 12px; padding: 10px 12px; margin-bottom: 3px; border-radius: 10px; color: #35423e; text-decoration: none; font-size: 14px; }
.sidebar > a span { color: #87928e; font-variant-numeric: tabular-nums; }
.sidebar > a:hover, .sidebar > a.active { color: var(--accent); background: var(--accent-soft); }
.sidebar .source-link { margin-top: 18px; border-top: 1px solid var(--line); border-radius: 0; padding-top: 18px; }
.eyebrow { margin: 0 0 14px; color: var(--warm); font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
main { min-width: 0; }
.chapter-meta { display: flex; gap: 10px; margin-bottom: 18px; }
.chapter-meta span { padding: 5px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: rgba(255,255,255,.45); font-size: 12px; }
article { padding: clamp(28px, 5vw, 60px); border: 1px solid var(--line); border-radius: 22px; background: var(--panel); box-shadow: var(--shadow); }
article h1 { margin: 0 0 24px; font-size: clamp(34px, 5vw, 54px); line-height: 1.14; letter-spacing: -.04em; }
article h2 { margin: 54px 0 18px; padding-top: 10px; font-size: 28px; line-height: 1.3; letter-spacing: -.02em; }
article h3 { margin: 34px 0 12px; font-size: 20px; }
article h4 { margin: 52px 0 18px; padding: 22px 0 0; border-top: 2px solid #c9d9d3; color: #153f34; font-size: 24px; line-height: 1.35; }
article h5 { margin: 24px 0 8px; color: #314b43; font-size: 16px; }
.heading-anchor { margin-left: 8px; opacity: 0; font-size: .75em; text-decoration: none; }
h1:hover .heading-anchor, h2:hover .heading-anchor, h3:hover .heading-anchor { opacity: .5; }
article p, article li { color: #2f3c38; }
article blockquote { margin: 22px 0; padding: 16px 20px; border-left: 4px solid var(--accent); border-radius: 0 12px 12px 0; color: #31413c; background: var(--accent-soft); }
article hr { margin: 42px 0; border: 0; border-top: 1px solid var(--line); }
article code { padding: 2px 6px; border-radius: 5px; color: #8f3d24; background: #f3e9df; }
article pre { overflow: auto; padding: 20px; border-radius: 14px; color: #e8f2ee; background: #1c2926; }
article pre code { padding: 0; color: inherit; background: none; }
article li { margin: 6px 0; }
article .nested-item { margin-left: 24px; list-style-type: circle; }
.table-wrap { overflow-x: auto; margin: 22px 0 32px; border: 1px solid var(--line); border-radius: 14px; background: white; }
table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 14px; line-height: 1.55; }
th { position: sticky; top: 0; z-index: 1; padding: 13px 14px; text-align: left; color: #173e34; background: #e8f3ee; white-space: nowrap; }
td { padding: 13px 14px; border-top: 1px solid #e4e8e4; vertical-align: top; }
tr:target td { background: #fff5cb; }
.week-anchor { font-weight: 800; text-decoration: none; }
.check-item { display: flex; align-items: flex-start; gap: 9px; cursor: pointer; }
.check-item input { flex: 0 0 auto; width: 16px; height: 16px; margin-top: 5px; accent-color: var(--accent); }
.check-item input:checked + span { color: #7a8581; text-decoration: line-through; }
.toc a { display: block; padding: 5px 0 5px 12px; border-left: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.45; text-decoration: none; }
.toc a:hover { color: var(--accent); border-left-color: var(--accent); }
.toc .toc-level-3 { padding-left: 22px; }
.pager { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 26px; }
.pager a { padding: 16px 18px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); text-decoration: none; }
.pager a:last-child { text-align: right; }
.week-jump { margin-bottom: 20px; padding: 16px; border: 1px solid #c8ddd5; border-radius: 14px; background: var(--accent-soft); }
.week-jump strong { display: block; margin-bottom: 8px; }
.week-jump div { display: grid; grid-template-columns: repeat(16, 1fr); gap: 4px; }
.week-jump a { padding: 4px 2px; border-radius: 5px; text-align: center; font-size: 11px; text-decoration: none; }
.week-jump a:hover { color: white; background: var(--accent); }
footer { padding: 28px; border-top: 1px solid var(--line); color: var(--muted); text-align: center; font-size: 12px; }
.landing-main { max-width: 1180px; margin: 0 auto; padding: 70px 28px 90px; }
.hero { position: relative; overflow: hidden; padding: clamp(36px, 7vw, 82px); border-radius: 28px; color: #eef8f4; background: #183d34; box-shadow: var(--shadow); }
.hero::after { content: ""; position: absolute; width: 420px; height: 420px; right: -100px; top: -170px; border: 80px solid rgba(130, 207, 178, .14); border-radius: 50%; }
.hero .eyebrow { color: #9ed5c1; }
.hero h1 { position: relative; z-index: 1; max-width: 820px; margin: 8px 0 22px; font-size: clamp(42px, 7vw, 82px); line-height: 1.04; letter-spacing: -.055em; }
.hero > p:not(.eyebrow) { max-width: 720px; color: #c8ddd5; font-size: 18px; }
.hero-actions { display: flex; gap: 12px; margin: 32px 0 42px; }
.hero-actions a { padding: 12px 18px; border: 1px solid rgba(255,255,255,.26); border-radius: 10px; color: white; text-decoration: none; }
.hero-actions .primary { color: #12362d; background: #a8ddc9; border-color: #a8ddc9; font-weight: 700; }
.hero dl { display: flex; gap: 36px; margin: 0; }
.hero dl div { display: flex; align-items: baseline; gap: 8px; }
.hero dt { font-size: 30px; font-weight: 800; }
.hero dd { margin: 0; color: #b8cec6; font-size: 13px; }
.chapter-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 36px; }
.chapter-card { padding: 26px; border: 1px solid var(--line); border-radius: 18px; color: var(--ink); background: var(--panel); box-shadow: 0 8px 24px rgba(29,50,44,.05); text-decoration: none; transition: transform .18s ease, box-shadow .18s ease; }
.chapter-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.chapter-card > span { color: var(--warm); font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.chapter-card h2 { margin: 8px 0 7px; font-size: 22px; }
.chapter-card p { margin: 0; color: var(--muted); }
.usage-note { margin-top: 36px; padding: 30px; border-left: 4px solid var(--warm); background: #f0e8da; }
@media (max-width: 1120px) {
  .layout { grid-template-columns: 220px minmax(0, 1fr); }
  .toc { display: none; }
  .week-jump div { grid-template-columns: repeat(12, 1fr); }
}
@media (max-width: 760px) {
  .topbar { padding: 0 16px; }
  .brand strong { display: none; }
  .topbar nav { gap: 10px; font-size: 13px; }
  .layout { display: block; padding: 18px 12px 56px; }
  .sidebar { position: static; display: flex; overflow-x: auto; gap: 6px; margin-bottom: 16px; }
  .sidebar .eyebrow, .sidebar .source-link { display: none; }
  .sidebar > a { flex: 0 0 auto; margin: 0; border: 1px solid var(--line); background: var(--panel); }
  article { padding: 24px 18px; border-radius: 16px; }
  article h1 { font-size: 34px; }
  article h2 { font-size: 24px; }
  .week-jump div { grid-template-columns: repeat(8, 1fr); }
  .pager { grid-template-columns: 1fr; }
  .chapter-grid { grid-template-columns: 1fr; }
  .landing-main { padding: 28px 14px 60px; }
  .hero { padding: 36px 24px; border-radius: 20px; }
  .hero dl { gap: 14px; flex-wrap: wrap; }
  .hero-actions { flex-direction: column; align-items: flex-start; }
}
@media print {
  :root { --paper: white; --panel: white; }
  .topbar, .sidebar, .toc, .pager, .week-jump, footer, .heading-anchor { display: none !important; }
  .layout { display: block; max-width: none; padding: 0; }
  article { padding: 0; border: 0; box-shadow: none; }
  .table-wrap { overflow: visible; break-inside: auto; }
  tr { break-inside: avoid; }
  a { color: inherit; text-decoration: none; }
}`;

async function build() {
  await mkdir(chaptersDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const original = await readFile(sourcePath, "utf8");
  const source = replaceNumberedSection(original, 7, renderWeeklyPlanMarkdown());
  if (source !== original) await writeFile(sourcePath, source, "utf8");
  const sourceParts = parseSections(source);

  const chapterIndexLines = chapterDefinitions.map((chapter) =>
    `${chapter.number}. [${chapter.title}](chapters/${chapter.markdownFile}) — ${chapter.description}`,
  );
  const rootReadme = `# 系统架构设计师备考资料\n\n` +
    `目标：2027 年下半年系统架构设计师（软考高级）。当前计划面向前端开发背景，其他模块按零基础设计。\n\n` +
    `## 阅读入口\n\n` +
    `- [打开 HTML 版](html/index.html)\n` +
    `- [打开 HTML 完整单页版](html/complete-plan.html)\n` +
    `- [查看 Markdown 总文档](系统架构设计师备考总计划.md)\n\n` +
    `## 分章节 Markdown\n\n${chapterIndexLines.join("\n")}\n\n` +
    `## 执行入口\n\n日常学习优先打开[第 4 章：62 周学习计划](chapters/04-62周学习计划.md)。每周同时查看“本周目标”“题目 / 实践 / 输出”和“验收标准”。\n\n` +
    `> 2027 年正式考试日期尚未公布，当前时间表以 2027 年 10 月下旬为规划锚点。\n`;
  await writeFile(path.join(projectDir, "README.md"), rootReadme, "utf8");

  for (const [index, definition] of chapterDefinitions.entries()) {
    const markdown = chapterMarkdown(definition, sourceParts);
    await writeFile(path.join(chaptersDir, definition.markdownFile), markdown, "utf8");
    const rendered = renderMarkdown(markdown);
    const page = pageTemplate({
      title: `第${definition.number}章 ${definition.title}`,
      description: definition.description,
      activeFile: definition.htmlFile,
      articleHtml: rendered.html,
      toc: rendered.toc,
      previous: chapterDefinitions[index - 1],
      next: chapterDefinitions[index + 1],
      showWeekJump: definition.number === 4,
    });
    await writeFile(path.join(htmlDir, definition.htmlFile), page, "utf8");
  }

  const completeRendered = renderMarkdown(source);
  const completePage = pageTemplate({
    title: "完整计划",
    description: "系统架构设计师 62 周完整备考计划单页版。",
    activeFile: "",
    articleHtml: completeRendered.html,
    toc: completeRendered.toc,
    previous: undefined,
    next: undefined,
    showWeekJump: true,
  });
  await writeFile(path.join(htmlDir, "complete-plan.html"), completePage, "utf8");
  await writeFile(path.join(htmlDir, "index.html"), landingPage(), "utf8");
  await writeFile(path.join(assetsDir, "styles.css"), styles, "utf8");

  console.log(JSON.stringify({
    source: path.relative(projectDir, sourcePath),
    chapters: chapterDefinitions.length,
    weeklyGoals: weeks.length,
    htmlPages: chapterDefinitions.length + 2,
  }, null, 2));
}

await build();
