# 系统架构设计师综合知识学习计划

当前执行版本只规划《综合知识》，不安排案例分析和论文。

- 计划周期：2026-09-01—2027-06-01
- 学习周数：40 周（首周 6 天，末周 2 天）
- 主教材：《系统架构设计师教程（第 2 版）》上篇第 1～11 章
- 学习者基线：前端开发背景；后端、数据库、操作系统、网络、安全和架构按零基础处理

## 当前入口

1. [打开 HTML 首页](html/index.html) — 查看范围、时间和八个学习阶段。
2. [打开 HTML 40 周计划](html/04-weekly-plan.html) — 查看每周学习内容和达标要求；每张周卡通过独立入口进入对应周练习，不再内嵌题目模块。
3. [每周完整练习](html/practices.html?week=W01) — 按周查看证据链，全部必做题与选做题直接平铺作答，并登记首次/重做成绩。
4. [资料与练习](html/materials.html) — 查看四类资料角色、2009—2025 完整性矩阵和逐周映射。
5. [综合知识 40 周学习计划（Markdown）](chapters/04-综合知识40周学习计划.md) — 每周明确学习内容、所用材料、产出和达标目标。
6. [四类资料使用说明](materials/四类资料使用说明.md) 与 [W01—W40 资料映射](materials/W01-W40资料映射.md) — 均由结构化 JSON 自动生成。
7. [学习进度](record/学习进度.md) — 记录实际掌握状态和下一最小知识点。
8. [主教材](系统架构设计师教程第二版可搜索.pdf) — 唯一“教材原文”依据，现有页码体系保持不变。

## 五步学习顺序

**大纲定边界 → 主教材完成理解 → 32 小时压缩复习 → 历年真题验证 → 近年回忆题观察趋势**

- `official`：考试大纲，只用于确定范围和要求。
- `published-guide`：32 小时辅导书，用于压缩理解和正式题不足时补题。
- `historical-paper`：题面可计分；第三方解析有争议时回查新版大纲与主教材。
- `recall`：只作趋势线索，正式练习后再看，不计入正确率，也不据此宣称高频。

## 同步与发布资料

PDF 保存在 `materials/local/`，并在 GitHub Pages 部署时复制到站点的 `materials/local/`。资料清单固定为 27 份；同步脚本只复制清单文件并核验页数、大小与 SHA-256，不删除目录中的未知文件。同步报告、OCR 缓存和题库构建报告继续由 Git 忽略。

```bash
node scripts/sync-study-materials.mjs
node scripts/sync-study-materials.mjs --source ../system_architect-main
node scripts/sync-study-materials.mjs --check
```

来源目录优先级：`--source` 参数 → 被忽略的 `materials.local.json` → 默认相邻目录 `../system_architect-main`。本地页面从项目资料目录访问 PDF；GitHub Pages 从发布产物访问同一批 PDF。每道已映射题均可打开原试卷对应页。

## 生成本地真题题库

题库源文件保存在 `materials/local/question-bank.v1.json` 并由 Git 忽略；网页加载副本 `html/local/question-bank-data.js` 随 GitHub Pages 发布。解析器保留原 PDF 页码；遇到图片、公式、缺选项或答案不能可靠定位时，会标记为“需核对 PDF”，不会强行参与网页判分。

```bash
node scripts/build-local-question-bank.mjs
node scripts/build-local-question-bank.mjs --check
```

2019 扫描版的离线 OCR 定位缓存可用以下命令生成（首次运行耗时较长）：

```bash
swift scripts/ocr-pdf-pages.swift materials/local/papers/2019-综合知识及解析.pdf materials/local/ocr/2019-pages.json
node scripts/build-local-question-bank.mjs
```

当前资料的实际完整性与文件名并不完全一致：2009—2018 可逐题定位；2019 是无文本层扫描版；2020 PDF 正文明确是部分回忆题；2021 尾部有重复拼接。公开仓库提交 [题库结构规范](data/question-bank.schema.json)、[覆盖状态](data/question-bank-status.json)、网页题库副本和已授权公开的 PDF。

## 生成与验证

```bash
node scripts/extract-question-index.mjs --write
node scripts/build-local-question-bank.mjs
node scripts/build-week-evidence.mjs
node scripts/generate-study-material-docs.mjs
node scripts/build-study-docs.mjs
node scripts/verify-study-docs.mjs
```

`data/materials.json`、`data/question-index.json` 和 `data/week-evidence.json` 是资料清单、题目页码和逐周映射的唯一数据源；`materials/local/question-bank.v1.json` 是本地题目正文的唯一数据源，`html/local/question-bank-data.js` 只是其网页加载副本。Markdown 与 HTML 不单独维护另一套映射。

## 版本说明

原 62 周计划同时规划综合知识、案例分析和论文，且日期延伸至 2027 年 10 月，已经不符合当前要求。原 Markdown 文件仅保留为历史参考并明确标记“已废止”；旧 HTML 页面已经删除。
