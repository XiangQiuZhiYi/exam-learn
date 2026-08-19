import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { phaseDefinitions, weeks } from "./weekly-plan-data.mjs";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = path.join(projectDir, "系统架构设计师备考总计划.md");
const chapterDir = path.join(projectDir, "chapters");
const htmlDir = path.join(projectDir, "html");

const expectedChapterFiles = [
  "01-目标与备考策略.md",
  "02-教材视频与工具.md",
  "03-学习方法时间与阶段.md",
  "04-62周学习计划.md",
  "05-知识难点与架构实践.md",
  "06-综合案例与论文.md",
  "07-复盘验收与进度恢复.md",
  "08-考务启动与资料来源.md",
];

const expectedHtmlFiles = [
  "index.html",
  "complete-plan.html",
  "01-goals-and-strategy.html",
  "02-resources.html",
  "03-method-and-phases.html",
  "04-weekly-plan.html",
  "05-difficulties-and-practice.html",
  "06-three-subjects.html",
  "07-review-and-recovery.html",
  "08-exam-and-sources.html",
];

const failures = [];
const checks = [];

function check(condition, message) {
  if (condition) checks.push(message);
  else failures.push(message);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const source = await readFile(sourcePath, "utf8");
check(weeks.length === 62, "周计划数据源包含 62 周");
check(new Set(weeks.map((week) => week.id)).size === 62, "周计划数据源周次唯一");
check(new Set(weeks.map((week) => week.goal)).size === 62, "62 个周目标均为独立内容");
check(new Set(weeks.map((week) => week.difficulty)).size === 62, "62 个关键难点均按周定制");
check(weeks.every((week) => week.tasks.length >= 4), "每周数据至少包含 4 项任务");
check(weeks.every((week) => week.exam.length === 3), "每周数据均覆盖综合、案例、论文");
check(weeks.every((week) => week.outputs.length >= 3), "每周数据至少包含 3 项交付物");
check(weeks.every((week) => week.acceptance.length >= 3), "每周数据至少包含 3 项验收标准");
check(phaseDefinitions.every((phase) => weeks.some((week) => week.phase === phase.id)), "七个阶段均包含周计划");
const sourceWeeks = [...source.matchAll(/^#### (W\d{2})｜(.+?)（([^）]+)）$/gm)];
const weekIds = sourceWeeks.map((match) => match[1]);
check(sourceWeeks.length === 62, "总计划包含 62 个独立周单元");
check(new Set(weekIds).size === 62, "62 个周次无重复");
check(weekIds[0] === "W01" && weekIds.at(-1) === "W62", "周次范围为 W01～W62");
check((source.match(/> \*\*本周目标：\*\*/g) ?? []).length === 62, "每周均包含明确的本周目标");

const weeklyBlocks = source.split(/^#### W\d{2}｜.+$/m).slice(1, 63);
const requiredWeeklyLabels = [
  "##### 学习支持",
  "**教材支持：**",
  "**视频支持：**",
  "**工具 / 模板支持：**",
  "##### 本周关键难点",
  "##### 任务清单",
  "##### 三科融合",
  "##### 本周交付物",
  "##### 验收标准",
  "##### 忙碌周最低完成线",
];
for (const label of requiredWeeklyLabels) {
  check(weeklyBlocks.every((block) => block.includes(label)), `62 周均包含：${label.replaceAll("*", "")}`);
}
check(weeklyBlocks.every((block) => (block.match(/^\d+\. /gm) ?? []).length >= 4), "每周至少包含 4 项时间化任务");
check(weeklyBlocks.every((block) => (block.match(/^- \[ \] /gm) ?? []).length >= 6), "每周交付物与验收均为可勾选项");

for (const file of expectedChapterFiles) {
  check(await exists(path.join(chapterDir, file)), `章节文件存在：${file}`);
}
for (const file of expectedHtmlFiles) {
  check(await exists(path.join(htmlDir, file)), `HTML 文件存在：${file}`);
}

const weeklyMarkdown = await readFile(path.join(chapterDir, "04-62周学习计划.md"), "utf8");
check((weeklyMarkdown.match(/^#### W\d{2}｜/gm) ?? []).length === 62, "周计划章节包含 62 个独立周单元");

const weeklyHtml = await readFile(path.join(htmlDir, "04-weekly-plan.html"), "utf8");
check((weeklyHtml.match(/<h4 id="w\d{2}">/g) ?? []).length === 62, "HTML 周计划包含 62 个周次锚点");
check((weeklyHtml.match(/class="week-jump"/g) ?? []).length === 1, "HTML 周计划包含快速跳转区");
check((weeklyHtml.match(/<strong>本周目标：<\/strong>/g) ?? []).length === 62, "HTML 周计划展示 62 个周目标");

const htmlFiles = expectedHtmlFiles.map((file) => path.join(htmlDir, file));
let localLinkCount = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  check(html.startsWith("<!doctype html>"), `${path.basename(file)} 包含 HTML5 文档声明`);
  check(html.includes('<link rel="stylesheet" href="assets/styles.css">'), `${path.basename(file)} 引用本地样式`);
  check(!/\[[^\]]+\]\([^)]+\)/.test(html), `${path.basename(file)} 无残留 Markdown 链接`);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    localLinkCount += 1;
    const relativePath = href.split("#", 1)[0];
    check(await exists(path.resolve(path.dirname(file), relativePath)), `${path.basename(file)} 本地链接有效：${relativePath}`);
  }
}

const cssPath = path.join(htmlDir, "assets", "styles.css");
const cssStat = await stat(cssPath);
check(cssStat.size > 5000, "HTML 样式文件已生成且内容完整");
check(localLinkCount > 80, "已检查全部章节导航与本地资源链接");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, passed: checks.length, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    passed: checks.length,
    chapters: expectedChapterFiles.length,
    htmlPages: expectedHtmlFiles.length,
    weeklyUnits: sourceWeeks.length,
    localLinksChecked: localLinkCount,
  }, null, 2));
}
