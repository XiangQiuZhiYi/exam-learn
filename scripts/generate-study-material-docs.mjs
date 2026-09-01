import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const materials = JSON.parse(await readFile(path.join(projectDir, "data", "materials.json"), "utf8"));
const evidence = JSON.parse(await readFile(path.join(projectDir, "data", "week-evidence.json"), "utf8"));
const questionBankStatus = JSON.parse(await readFile(path.join(projectDir, "data", "question-bank-status.json"), "utf8"));
const docsDir = path.join(projectDir, "materials");

const trustLabels = {
  official: "官方大纲",
  "published-guide": "出版辅导书",
  "historical-paper": "历年正式题",
  recall: "回忆/还原资料",
};

function ranges(numbers) {
  if (!numbers.length) return "—";
  const result = [];
  let start = numbers[0];
  let end = numbers[0];
  for (const number of numbers.slice(1)) {
    if (number === end + 1) end = number;
    else {
      result.push(start === end ? `${start}` : `${start}—${end}`);
      start = end = number;
    }
  }
  result.push(start === end ? `${start}` : `${start}—${end}`);
  return result.join("、");
}

const guide = `# 四类学习资料使用说明

> 本文由 \`data/materials.json\` 生成，请勿手工维护。PDF 只保存在被 Git 忽略的 \`materials/local/\`，不会随 GitHub Pages 发布。

## 固定学习顺序

1. **大纲定边界：** 只确认考试范围和要求，不把大纲当教材。
2. **主教材完成理解：** 教材原文、页码和学习记录仍以根目录《系统架构设计师教程（第 2 版）》为准。
3. **32 小时压缩复习：** 用于归纳、辨析和正式题不足时补题，不能替代主教材。
4. **历年真题验证：** 题面用于计分；第三方旧解析与新版教材冲突时标记“解析争议”，以新版大纲和主教材为准。
5. **回忆题观察趋势：** 正式练习完成后再看，不计分、不用于宣称高频。

## 可信度规则

| 级别 | 角色 | 使用规则 |
| --- | --- | --- |
${Object.entries(materials.trustLevels).map(([key, value]) => `| \`${key}\` | ${trustLabels[key]} | ${value} |`).join("\n")}

## 本地资料清单（${materials.materials.length} 份）

| ID | 资料 | 类型 | 可信度 | 页数 | 大小（字节） | SHA-256 | 本地标准路径 |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
${materials.materials.map((item) => `| \`${item.id}\` | ${item.title} | ${item.category} | \`${item.trust}\` | ${item.pages} | ${item.bytes} | \`${item.sha256}\` | \`${item.localRelativePath}\` |`).join("\n")}

## 同步与校验

\`\`\`bash
node scripts/sync-study-materials.mjs
node scripts/sync-study-materials.mjs --source ../system_architect-main
node scripts/sync-study-materials.mjs --check
\`\`\`

来源优先级为：\`--source\` → 被忽略的 \`materials.local.json\` → 默认相邻目录 \`../system_architect-main\`。同步只复制清单中的文件并校验，不删除未知文件。

## 本地网页题库

题目正文只生成到被忽略的 \`materials/local/question-bank.v1.json\`，网页加载副本为 \`html/local/question-bank-data.js\`。公开仓库只保存结构规范与以下覆盖状态：

| 年份 | 状态 | 已拆分 | 可网页判分 | 说明 |
| ---: | --- | ---: | ---: | --- |
${questionBankStatus.papers.map((paper) => `| ${paper.year} | ${paper.status} | ${paper.parsedQuestions}/${paper.expectedQuestions} | ${paper.scoreableQuestions} | ${paper.warnings.join("；") || "—"} |`).join("\n")}

生成命令：

\`\`\`bash
node scripts/build-local-question-bank.mjs
node scripts/build-local-question-bank.mjs --check
\`\`\`

2019 年扫描版需先用 \`scripts/ocr-pdf-pages.swift\` 生成本地 OCR 定位缓存；逐题视觉核验前不参与网页判分。2020 年当前 PDF 本身是不完整回忆题，2021 年 PDF 尾部存在重复拼接，因此都不会伪装成完整 75 题卷。
`;

const mappingRows = evidence.weeks.map((week) => {
  const required = week.historicalPractice.filter((group) => group.requirement === "required");
  const requiredText = required.length
    ? required.map((group) => `${group.year} 年 ${ranges(group.numbers)} 题（题面 PDF ${ranges(group.questionPages)} 页；答案 PDF ${ranges(group.answerPages)} 页）`).join("<br>")
    : week.fullPaper ? `${week.fullPaper.year} 年整卷（${week.fullPaper.requirement === "diagnostic" ? "诊断" : "必做"}）` : "—";
  const recall = week.recall.length ? week.recall.flatMap((item) => item.topics).join("；") : "—";
  const threshold = week.threshold.percentage ? `${week.threshold.percentage}%` : `${week.threshold.target}（最低 ${week.threshold.minimum}）`;
  return `| ${week.week} | ${week.channel} | ${week.outlinePages} | ${week.guideSection}；PDF ${week.guidePdfPages} 页 | ${requiredText} | ${week.guideSupplementNeeded || "—"} | ${recall} | ${threshold} |`;
});

const mapping = `# W01—W40 四类资料证据映射

> 本文由 \`data/week-evidence.json\` 与 \`data/question-index.json\` 生成。结构化 JSON 是唯一数据源；题面页和答案页均为 PDF 页码。

## 映射规则

- 2009—2018 年 750 道题均只有一个主周次；共享题干连续题整体分配。
- 必做题优先选择较新年份；同一标签最多两组，其余保留为选做。
- 必做题数量不足时，用对应《32 小时通关》练习补齐；回忆题永不计分。
- W36/W39/W40 的计划目标分别是 2019/2020/2021 整卷；2019 只做诊断，不据此判定阶段失败。当前 2020、2021 本地文件未达到完整整卷条件，补齐可靠来源前只显示已解析部分并保留 PDF 回退。
- 遇到旧解析与新版教材冲突，记录错误类型“解析争议”，以新版大纲和主教材为准。

## 每周证据链

| 周次 | 渠道 | 大纲 PDF 页 | 32 小时范围 | 必做正式题 | 32 小时补题数 | 回忆趋势（不计分） | 阈值 |
| --- | --- | --- | --- | --- | ---: | --- | --- |
${mappingRows.join("\n")}

## 完整题号映射

以下列出全部 2009—2018 年正式题的唯一主周次；标记“必做”以外的题均为选做。

${evidence.weeks.map((week) => {
  if (!week.historicalPractice.length) return `### ${week.week}\n\n无 2009—2018 年正式题；按本周《32 小时通关》练习补题或执行指定整卷。`;
  return `### ${week.week}\n\n${week.historicalPractice.map((group) => `- ${group.year} 年 ${ranges(group.numbers)} 题｜题面 PDF ${ranges(group.questionPages)} 页｜答案 PDF ${ranges(group.answerPages)} 页｜${group.requirement === "required" ? "必做" : "选做"}｜${group.tag}｜定位置信度 ${group.confidence}`).join("\n")}`;
}).join("\n\n")}
`;

await mkdir(docsDir, { recursive: true });
await Promise.all([
  writeFile(path.join(docsDir, "四类资料使用说明.md"), guide, "utf8"),
  writeFile(path.join(docsDir, "W01-W40资料映射.md"), mapping, "utf8"),
]);
console.log(JSON.stringify({ ok: true, markdownFiles: 2, materials: materials.materials.length, weeks: evidence.weeks.length }, null, 2));
