import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlDir = path.join(projectDir, "html");
const weeklyPath = path.join(projectDir, "chapters", "04-综合知识40周学习计划.md");
const activeFiles = ["index.html", "04-weekly-plan.html", "complete-plan.html"];
const removedLegacyFiles = [
  "01-goals-and-strategy.html",
  "02-resources.html",
  "03-method-and-phases.html",
  "05-difficulties-and-practice.html",
  "06-three-subjects.html",
  "07-review-and-recovery.html",
  "08-exam-and-sources.html",
];

const failures = [];
const passed = [];
const check = (condition, message) => (condition ? passed : failures).push(message);

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const weeklyMarkdown = await readFile(weeklyPath, "utf8");
const weekMatches = [...weeklyMarkdown.matchAll(/^#### (W\d{2})｜(.+?)（([^）]+)）$/gm)];
check(weekMatches.length === 40, "Markdown 包含 40 个独立周单元");
check(weekMatches[0]?.[1] === "W01" && weekMatches.at(-1)?.[1] === "W40", "周次范围为 W01～W40");
check(new Set(weekMatches.map((match) => match[1])).size === 40, "40 个周次无重复");
check((weeklyMarkdown.match(/^### 第.+阶段：/gm) ?? []).length === 8, "Markdown 包含 8 个学习阶段");
for (const label of ["学什么", "用什么", "本周产出", "达标目标"]) {
  check((weeklyMarkdown.match(new RegExp(`\\*\\*${label}：\\*\\*`, "g")) ?? []).length === 40, `每周均包含“${label}”`);
}

for (const file of activeFiles) {
  check(await exists(path.join(htmlDir, file)), `HTML 文件存在：${file}`);
}
for (const file of removedLegacyFiles) {
  check(!(await exists(path.join(htmlDir, file))), `旧 HTML 已删除：${file}`);
}

const indexHtml = await readFile(path.join(htmlDir, "index.html"), "utf8");
const weeklyHtml = await readFile(path.join(htmlDir, "04-weekly-plan.html"), "utf8");
const completeHtml = await readFile(path.join(htmlDir, "complete-plan.html"), "utf8");

for (const [file, html] of [["index.html", indexHtml], ["04-weekly-plan.html", weeklyHtml], ["complete-plan.html", completeHtml]]) {
  check(html.startsWith("<!doctype html>"), `${file} 使用 HTML5 文档声明`);
  check(html.includes('<html lang="zh-CN">'), `${file} 声明中文页面语言`);
  check(html.includes('<meta name="viewport"'), `${file} 包含响应式视口`);
  check(html.includes('<link rel="stylesheet" href="assets/styles.css">'), `${file} 引用本地样式`);
  check(!html.includes("62 周") && !html.includes("62周"), `${file} 不包含旧 62 周内容`);
  check(!/2027 年 10 月|三科同步|综合、案例与论文/.test(html), `${file} 不包含旧三科计划表述`);
  check(!/\[[^\]]+\]\([^)]+\)/.test(html), `${file} 无残留 Markdown 链接`);
}

check((indexHtml.match(/class="phase-card"/g) ?? []).length === 8, "首页展示 8 个阶段");
check(indexHtml.includes("仅综合知识"), "首页明确只规划综合知识");
check(indexHtml.includes("2026 年 9 月 1 日") && indexHtml.includes("2027 年 6 月 1 日"), "首页展示完整计划日期");

check((weeklyHtml.match(/<section class="week-card" data-week="W\d{2}"/g) ?? []).length === 40, "周计划 HTML 包含 40 张周卡片");
check((weeklyHtml.match(/data-week-toggle="W\d{2}"/g) ?? []).length === 40, "每周均可记录完成状态");
check(weeklyHtml.includes("localStorage.setItem") && weeklyHtml.includes("localStorage.getItem"), "完成状态使用 localStorage 持久化");
check((weeklyHtml.match(/aria-pressed="false"/g) ?? []).length === 40, "完成按钮包含可访问状态");
check((weeklyHtml.match(/data-jump-week="W\d{2}"/g) ?? []).length === 40, "周计划包含 40 个快速跳转入口");
check((weeklyHtml.match(/class="week-details"/g) ?? []).length === 40, "每周四项要求均渲染为独立内容区");
check(weeklyHtml.includes('id="progress-fill"') && weeklyHtml.includes('id="completed-count"'), "周计划包含本地进度总览");
check(weeklyHtml.includes('data-start="2026-09-01"'), "首周开始日期正确");
check(weeklyHtml.includes('data-end="2027-06-01"'), "末周结束日期正确");

check((completeHtml.match(/<section class="week-card" data-week="W\d{2}"/g) ?? []).length === 40, "完整单页包含全部 40 周");
check(completeHtml.includes("系统架构设计师综合知识学习总计划"), "完整单页包含计划总览");

const linkFiles = activeFiles;
let localLinksChecked = 0;
for (const file of linkFiles) {
  const html = await readFile(path.join(htmlDir, file), "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const relativePath = href.split("#", 1)[0];
    localLinksChecked += 1;
    check(await exists(path.resolve(htmlDir, relativePath)), `${file} 本地链接有效：${relativePath}`);
  }
}

const cssPath = path.join(htmlDir, "assets", "styles.css");
const cssStats = await stat(cssPath);
check(cssStats.size > 9000, "样式文件内容完整");
check((await readFile(cssPath, "utf8")).includes("@media print"), "样式包含打印布局");
check(localLinksChecked >= 10, "已检查全部有效页面的本地链接");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, passed: passed.length, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, passed: passed.length, htmlPages: linkFiles.length, weeks: weekMatches.length, localLinksChecked }, null, 2));
}
