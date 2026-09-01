import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlDir = path.join(projectDir, "html");
const weeklyPath = path.join(projectDir, "chapters", "04-综合知识40周学习计划.md");
const materialsPath = path.join(projectDir, "data", "materials.json");
const questionIndexPath = path.join(projectDir, "data", "question-index.json");
const evidencePath = path.join(projectDir, "data", "week-evidence.json");
const questionBankStatusPath = path.join(projectDir, "data", "question-bank-status.json");
const pagesWorkflowPath = path.join(projectDir, ".github", "workflows", "pages.yml");
const activeFiles = ["index.html", "04-weekly-plan.html", "practices.html", "materials.html", "complete-plan.html"];
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
const materialsData = JSON.parse(await readFile(materialsPath, "utf8"));
const questionIndex = JSON.parse(await readFile(questionIndexPath, "utf8"));
const evidenceData = JSON.parse(await readFile(evidencePath, "utf8"));
const questionBankStatus = JSON.parse(await readFile(questionBankStatusPath, "utf8"));
const pagesWorkflow = await readFile(pagesWorkflowPath, "utf8");
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
const practicesHtml = await readFile(path.join(htmlDir, "practices.html"), "utf8");
const completeHtml = await readFile(path.join(htmlDir, "complete-plan.html"), "utf8");
const materialsHtml = await readFile(path.join(htmlDir, "materials.html"), "utf8");

for (const [file, html] of [["index.html", indexHtml], ["04-weekly-plan.html", weeklyHtml], ["practices.html", practicesHtml], ["materials.html", materialsHtml], ["complete-plan.html", completeHtml]]) {
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
check(indexHtml.includes("W01 · 第一章") && indexHtml.includes("外部学习"), "首页区分当前计划周和外部学习渠道");
check(indexHtml.includes("第二章 计算机系统基础知识") && indexHtml.includes("外部设备作为输入输出设备"), "首页展示从学习记录提取的项目辅导点");

check((weeklyHtml.match(/<section class="week-card" data-week="W\d{2}"/g) ?? []).length === 40, "周计划 HTML 包含 40 张周卡片");
check((weeklyHtml.match(/data-week-toggle="W\d{2}"/g) ?? []).length === 40, "每周均可记录完成状态");
check(weeklyHtml.includes("localStorage.setItem") && weeklyHtml.includes("localStorage.getItem"), "完成状态使用 localStorage 持久化");
check((weeklyHtml.match(/aria-pressed="false"/g) ?? []).length === 40, "完成按钮包含可访问状态");
check((weeklyHtml.match(/data-jump-week="W\d{2}"/g) ?? []).length === 40, "周计划包含 40 个快速跳转入口");
check((weeklyHtml.match(/class="week-details"/g) ?? []).length === 40, "每周四项要求均渲染为独立内容区");
check(weeklyHtml.includes('id="progress-fill"') && weeklyHtml.includes('id="completed-count"'), "周计划包含本地进度总览");
check(weeklyHtml.includes('data-start="2026-09-01"'), "首周开始日期正确");
check(weeklyHtml.includes('data-end="2027-06-01"'), "末周结束日期正确");
check(!weeklyHtml.includes('class="evidence-chain"') && !weeklyHtml.includes('<form class="practice-form"'), "周卡不再内嵌证据链和练习表单");
check((weeklyHtml.match(/class="week-practice-entry"/g) ?? []).length === 40, "40 张周卡均包含独立练习入口");
check((weeklyHtml.match(/href="practices\.html\?week=W\d{2}"/g) ?? []).length === 40, "每张周卡跳转到对应周完整练习");
check(weeklyHtml.includes("sa-study-progress:v1") && weeklyHtml.includes("schemaVersion"), "练习记录采用版本化存储");
check(weeklyHtml.includes("sa-study-progress-") && weeklyHtml.includes("导入将整体替换"), "支持 JSON 导出和确认后整体导入");
check(weeklyHtml.includes("record.notes") && weeklyHtml.includes("notes.textContent"), "用户备注以纯文本渲染");
check(weeklyHtml.includes("correct > total") && weeklyHtml.includes("total <= 0"), "练习数字范围在提交和导入时校验");
check(weeklyHtml.includes("答案未解锁") && weeklyHtml.includes("hasFirstAttempt"), "答案入口在首次作答后解锁");
check(weeklyHtml.includes("localStorage.getItem(storagePrefix + week)"), "兼容读取旧周完成状态");

check((practicesHtml.match(/data-practice-week-page="W\d{2}"/g) ?? []).length === 40, "独立练习页包含 W01—W40");
check((practicesHtml.match(/class="evidence-chain"/g) ?? []).length === 40, "独立练习页包含每周证据链");
check((practicesHtml.match(/data-practice-form="W\d{2}"/g) ?? []).length === 40, "独立练习页包含每周成绩登记表");
check((practicesHtml.match(/data-direct-quiz="W\d{2}"/g) ?? []).length === 40, "独立练习页包含每周网页作答区域");
check(practicesHtml.includes("local/question-bank-data.js") && practicesHtml.includes("提交本题答案"), "独立练习页可按需载入本地题库并逐题提交");
check((practicesHtml.match(/class="quiz-viewer quiz-flat-list"/g) ?? []).length === 40 && practicesHtml.includes("data-quiz-exercises="), "每周题目使用平铺列表渲染");
check(!/<select[^>]*data-quiz-exercise(?:\s|>)/.test(practicesHtml), "网页作答区不再使用题组下拉选择");
check(!practicesHtml.includes('makeButton("上一题")') && !practicesHtml.includes('makeButton("下一题")'), "网页作答区不再使用上一题和下一题按钮");
check(!practicesHtml.includes("必做正式题与页码") && !practicesHtml.includes("全部选做题（"), "证据链不再重复显示题号折叠清单");
check(practicesHtml.includes("提交前不显示答案") && practicesHtml.includes("回答错误；正确答案是"), "网页题库在提交后才显示判分答案");
check(practicesHtml.includes("查看 PDF 原题") && practicesHtml.includes("questionMaterialPath") && practicesHtml.includes("materialUrl("), "每道题可跳转到原试卷对应 PDF 页");
check(new Set([...practicesHtml.matchAll(/q-(20(?:0[9]|1[0-8]))-(?:7[0-5]|[1-6][0-9]|[1-9])(?!\d)/g)].map((match) => match[0])).size === 750, "独立练习页目录包含 2009—2018 全部 750 道映射题");
check(practicesHtml.includes("W02-2018-5-6") && practicesHtml.includes("2 道必做题、34 道选做题"), "选做题进入对应周完整练习目录");

check((completeHtml.match(/<section class="week-card" data-week="W\d{2}"/g) ?? []).length === 40, "完整单页包含全部 40 周");
check((completeHtml.match(/href="practices\.html\?week=W\d{2}"/g) ?? []).length === 40, "完整单页的每周入口指向独立练习页");
check(completeHtml.includes("系统架构设计师综合知识学习总计划"), "完整单页包含计划总览");

check(materialsData.materials.length === 27, "资料清单恰有 27 份文件");
check(new Set(materialsData.materials.map((item) => item.id)).size === 27, "资料 ID 无重复");
check(materialsData.materials.every((item) => /^[a-f0-9]{64}$/.test(item.sha256) && item.pages > 0 && item.bytes > 0), "资料页数、大小和 SHA-256 完整");
check((materialsHtml.match(/class="material-link"/g) ?? []).length === 27, "资料页展示 27 个公开 PDF 入口");
check(materialsHtml.includes('materialBase = localMode ? "../materials/local/" : "materials/local/"'), "本地与 GitHub Pages 使用各自正确的 PDF 基础路径");
check((materialsHtml.match(/<tr><th>20\d{2}<\/th>/g) ?? []).length === 30, "资料页包含 2009—2025 资料矩阵和 2009—2021 题库覆盖表");
check((materialsHtml.match(/data-material-week="W\d{2}"/g) ?? []).length === 40, "资料页可按周查看 W01—W40 证据");

check(evidenceData.weeks.length === 40, "结构化映射恰有 W01—W40 共 40 条");
check(evidenceData.weeks.every((week, index) => week.week === `W${String(index + 1).padStart(2, "0")}`), "结构化映射周次连续且唯一");
const indexedQuestions = new Set(questionIndex.papers.flatMap((paper) => paper.questions.map((question) => `${paper.year}-${question.number}`)));
const mappedQuestionKeys = evidenceData.weeks.flatMap((week) => week.historicalPractice.flatMap((group) => group.numbers.map((number) => `${group.year}-${number}`)));
check(mappedQuestionKeys.length === 750 && new Set(mappedQuestionKeys).size === 750, "2009—2018 的 750 道题均只映射一个主周次");
check(mappedQuestionKeys.every((key) => indexedQuestions.has(key)), "所有映射题号均存在于逐页题目索引");
check(evidenceData.weeks.flatMap((week) => week.historicalPractice).every((group) => group.questionPages.length && group.answerPages.length), "每组正式题均有题面和答案 PDF 页码");
check(evidenceData.weeks.flatMap((week) => week.historicalPractice).filter((group) => group.requirement === "required").every((group) => group.confidence !== "low"), "低置信度定位不会进入必做题");
check(evidenceData.weeks.every((week) => [...new Set(week.historicalPractice.filter((group) => group.requirement === "required").map((group) => group.tag))].every((tag) => week.historicalPractice.filter((group) => group.requirement === "required" && group.tag === tag).length <= 2)), "同类必做题每周最多两组");
const assignment = new Map();
evidenceData.weeks.forEach((week) => week.historicalPractice.forEach((group, groupIndex) => group.numbers.forEach((number) => assignment.set(`${group.year}-${number}`, `${week.week}-${groupIndex}`))));
const normalizePrefix = (text) => text.replace(/\s+/g, " ").replace(/[“”'\"，。；：、]/g, "").trim().slice(0, 65);
const sharedStemPairs = questionIndex.papers.flatMap((paper) => paper.questions.slice(1).map((question, index) => ({
  previous: paper.questions[index],
  question,
  year: paper.year,
}))).filter(({ previous, question }) => normalizePrefix(previous.snippet).length >= 50 && normalizePrefix(previous.snippet) === normalizePrefix(question.snippet));
check(sharedStemPairs.every(({ previous, question, year }) => assignment.get(`${year}-${previous.number}`) === assignment.get(`${year}-${question.number}`)), "检测到的共享题干连续题未被拆到不同周");
check(evidenceData.weeks.find((week) => week.week === "W36")?.fullPaper?.year === 2019, "W36 使用 2019 年整卷诊断");
check(evidenceData.weeks.find((week) => week.week === "W39")?.fullPaper?.year === 2020, "W39 使用 2020 年整卷");
check(evidenceData.weeks.find((week) => week.week === "W40")?.fullPaper?.year === 2021, "W40 使用 2021 年整卷");
check(evidenceData.weeks.flatMap((week) => week.recall).every((item) => item.scored === false && item.trust === "recall"), "回忆题全部不可计分且标为 recall");
check(questionBankStatus.papers.length === 13 && questionBankStatus.papers[0].year === 2009 && questionBankStatus.papers.at(-1).year === 2021, "题库覆盖状态包含 2009—2021");
check(await exists(path.join(htmlDir, "local", "question-bank-data.js")), "Pages 发布目录包含网页题库数据");
check(pagesWorkflow.includes("cp -R materials/local/. _site/materials/local/") && pagesWorkflow.includes("path: _site"), "Pages 工作流将 PDF 合并到发布产物");
check(questionBankStatus.totals.parsedQuestions >= 750 && questionBankStatus.totals.scoreableQuestions <= questionBankStatus.totals.parsedQuestions, "题库覆盖统计范围有效");
check(questionBankStatus.papers.find((paper) => paper.year === 2019)?.status === "partial" && questionBankStatus.papers.find((paper) => paper.year === 2019)?.scoreableQuestions === 0, "2019 OCR 题目在逐题核验前不会直接判分");
check(questionBankStatus.papers.find((paper) => paper.year === 2020)?.status === "partial" && questionBankStatus.papers.find((paper) => paper.year === 2020)?.scoreableQuestions < 75, "2020 回忆资料不会伪装成完整整卷");

const linkFiles = activeFiles;
let localLinksChecked = 0;
for (const file of linkFiles) {
  const html = await readFile(path.join(htmlDir, file), "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const relativePath = href.split(/[?#]/, 1)[0];
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
