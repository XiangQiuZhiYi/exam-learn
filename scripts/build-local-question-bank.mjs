import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const manifest = JSON.parse(await readFile(path.join(projectDir, "data", "materials.json"), "utf8"));
const questionIndex = JSON.parse(await readFile(path.join(projectDir, "data", "question-index.json"), "utf8"));
const materialById = new Map(manifest.materials.map((material) => [material.id, material]));
const indexByYear = new Map(questionIndex.papers.map((paper) => [paper.year, paper]));
const localRoot = path.resolve(projectDir, manifest.localRoot);
const outputPath = path.join(localRoot, "question-bank.v1.json");
const reportPath = path.join(localRoot, "question-bank-report.json");
const publicStatusPath = path.join(projectDir, "data", "question-bank-status.json");
const browserDir = path.join(projectDir, "html", "local");
const browserPath = path.join(browserDir, "question-bank-data.js");
const ocr2019Path = path.join(localRoot, "ocr", "2019-pages.json");
const checkOnly = process.argv.includes("--check");

const bundledPopplerRoot = path.join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "native", "poppler", "poppler");
const bundledPdftotext = path.join(bundledPopplerRoot, "bin", "pdftotext");
const pdftotextBinary = process.env.PDFTOTEXT_BIN || (existsSync(bundledPdftotext) ? bundledPdftotext : "pdftotext");

function extractPages(file) {
  if (!existsSync(file)) throw new Error(`本地资料不存在：${path.relative(projectDir, file)}`);
  const result = spawnSync(pdftotextBinary, ["-layout", file, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: existsSync(path.join(bundledPopplerRoot, "share", "poppler"))
      ? { ...process.env, POPPLER_DATADIR: path.join(bundledPopplerRoot, "share", "poppler") }
      : process.env,
  });
  if (result.error) throw new Error(`无法启动 pdftotext：${result.error.message}`);
  if (result.status !== 0) throw new Error(`无法提取 PDF 文本：${file}\n${result.stderr || result.stdout}`);
  return result.stdout.split("\f").filter((page, index, pages) => index < pages.length - 1 || page.trim());
}

function normalizeText(value) {
  return value
    .replaceAll("\r", "")
    .replace(/[\u00a0\u3000]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripBoilerplate(page) {
  return normalizeText(page.split("\n").filter((line) => {
    const text = line.trim();
    return !/手机端题库|PC端题库|软考达人|共\s*\d+页|上午试卷\s*第\s*\d+页|免费提供|请按下述要求|答题卡/.test(text);
  }).join("\n"));
}

function cleanPart(value) {
  return normalizeText(value)
    .replace(/^\s*[（(]\s*\d+\s*[）)]\s*/u, "")
    .replace(/^\s*\d{1,2}[.、]\s*/u, "")
    .replace(/^》\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOptions(value) {
  const prepared = value
    .replace(/^[\s\S]*?[（(]\s*\d+\s*[）)]\s*(?=A\s*[.．、])/u, "")
    .replace(/(^|\n)\s*》\s*(?=A\s*[.．、]?)/gu, "$1");
  const markers = [...prepared.matchAll(/(?:^|\n| {2,})([ABCD])\s*[.．、]\s*/g)];
  if (markers.length < 4) {
    const lineMarkers = [...prepared.matchAll(/(?:^|\n)\s*([ABCD])\s*[.．、]?\s+/g)];
    if (lineMarkers.length >= 4) return optionsFromMarkers(prepared, lineMarkers);
  }
  return optionsFromMarkers(prepared, markers);
}

function optionsFromMarkers(value, markers) {
  const result = {};
  for (let index = 0; index < markers.length; index += 1) {
    const letter = markers[index][1];
    if (result[letter] !== undefined) continue;
    const start = markers[index].index + markers[index][0].length;
    const end = markers[index + 1]?.index ?? value.length;
    result[letter] = cleanPart(value.slice(start, end));
  }
  return result;
}

function answerMap(answerText) {
  const result = new Map();
  const answerMatches = [...answerText.matchAll(/【答案】\s*([ABCD](?:[\s｜|、,，/.．]+[ABCD])*)/g)];
  for (const answerMatch of answerMatches) {
    const letters = answerMatch[1].match(/[ABCD]/g) ?? [];
    const previousExplanation = answerText.lastIndexOf("【解析】", answerMatch.index - 1);
    const contextStart = previousExplanation >= 0 ? previousExplanation + "【解析】".length : Math.max(0, answerMatch.index - 5000);
    const context = answerText.slice(contextStart, answerMatch.index);
    const markers = [...context.matchAll(/[（(]\s*(\d{1,2})\s*[）)]\s*A\s*[.．、]/g)]
      .map((match) => Number(match[1]))
      .filter((number) => number >= 1 && number <= 75);
    const numbers = [...new Set(markers)].slice(-letters.length);
    if (numbers.length !== letters.length) continue;
    numbers.forEach((number, index) => result.set(number, letters[index]));
  }
  return result;
}

function likelyVisual(stem, options) {
  const content = `${stem} ${Object.values(options).join(" ")}`;
  return /如(?:下)?图|下表|图中|表中|表达式|关系运算|前趋图|网络结构|拓扑|曲线|公式|示意图|所示/.test(content) || Object.keys(options).length !== 4 || Object.values(options).some((value) => !value);
}

function parseHistoricalPaper(year) {
  const paperMeta = materialById.get(`paper-${year}`);
  const answerMeta = materialById.get(`answer-${year}`);
  const sourceIndex = indexByYear.get(year);
  if (!paperMeta || !answerMeta || !sourceIndex) throw new Error(`${year} 年缺少题面、答案或页码索引`);
  const questionPages = extractPages(path.join(localRoot, paperMeta.localRelativePath)).map(stripBoilerplate);
  const answerPages = extractPages(path.join(localRoot, answerMeta.localRelativePath)).map(stripBoilerplate);
  const source = questionPages.join("\n");
  const answers = answerMap(answerPages.join("\n"));

  const groups = source.split("●").slice(1);
  const parsed = new Map();
  for (const groupRaw of groups) {
    const group = normalizeText(groupRaw);
    const optionStarts = [...group.matchAll(/[（(]\s*(\d{1,2})\s*[）)]\s*A\s*[.．、]/g)]
      .filter((match) => Number(match[1]) >= 1 && Number(match[1]) <= 75);
    if (!optionStarts.length) continue;
    const stem = cleanPart(group.slice(0, optionStarts[0].index));
    for (let index = 0; index < optionStarts.length; index += 1) {
      const match = optionStarts[index];
      const number = Number(match[1]);
      const end = optionStarts[index + 1]?.index ?? group.length;
      const optionSource = group.slice(match.index, end);
      const options = parseOptions(optionSource);
      if (!parsed.has(number)) parsed.set(number, { stem, options });
    }
  }

  const questions = [];
  const warnings = [];
  for (let number = 1; number <= 75; number += 1) {
    const data = parsed.get(number);
    const location = sourceIndex.questions.find((question) => question.number === number);
    if (!data) {
      warnings.push(`第 ${number} 题未能从题面文本拆分`);
      continue;
    }
    const visual = likelyVisual(data.stem, data.options);
    questions.push({
      id: `q-${year}-${number}`,
      year,
      number,
      stem: data.stem,
      options: { A: data.options.A ?? "", B: data.options.B ?? "", C: data.options.C ?? "", D: data.options.D ?? "" },
      answer: answers.get(number) ?? null,
      explanation: null,
      questionPage: location?.questionPage ?? null,
      answerPage: location?.answerPage ?? null,
      containsVisual: visual,
      confidence: visual ? "review-needed" : "high",
    });
  }
  const scoreable = questions.filter((question) => question.answer && Object.values(question.options).every(Boolean)).length;
  if (answers.size !== 75) warnings.push(`答案详解只能可靠定位 ${answers.size}/75 个答案`);
  return {
    paper: {
      year,
      status: questions.length === 75 && scoreable === 75 ? "complete" : "partial",
      expectedQuestions: 75,
      parsedQuestions: questions.length,
      scoreableQuestions: scoreable,
      warnings,
    },
    questions,
  };
}

function parseRecallStylePaper(year) {
  const material = materialById.get(`paper-${year}`);
  if (!material) throw new Error(`缺少 ${year} 年资料`);
  const pages = extractPages(path.join(localRoot, material.localRelativePath)).map(stripBoilerplate);
  const source = pages.join("\n");
  const blockPattern = new RegExp(`【${year} 下架构真题第\\s*(\\d+)\\s*题[^】]*】([\\s\\S]*?)(?=【${year} 下架构真题第|$)`, "g");
  const blocks = [...source.matchAll(blockPattern)];
  const questions = [];
  const warnings = [];
  let number = 1;
  for (const block of blocks) {
    if (year === 2021 && Number(block[1]) > 51) continue;
    const content = block[2];
    const solutionIndex = content.indexOf("解答：");
    if (solutionIndex < 0) continue;
    const questionText = normalizeText(content.slice(0, solutionIndex));
    const solutionText = normalizeText(content.slice(solutionIndex));
    const correctMatch = solutionText.match(/正确答案\s*([ABCD](?:[\s｜|、,，/]*[ABCD])*)/);
    const selectedMatch = solutionText.match(/答案选择\s*([ABCD](?:[\s｜|、,，/]*[ABCD])*)/);
    const answers = (correctMatch?.[1] ?? selectedMatch?.[1] ?? "").match(/[ABCD]/g) ?? [];
    const optionGroups = questionText.split(/\n\s*》\s*\n/g);
    const firstOption = optionGroups[0].search(/(?:^|\n)\s*A\s*[.．、]\s*/m);
    const stem = cleanPart(firstOption >= 0 ? optionGroups[0].slice(0, firstOption) : questionText);
    const optionSources = optionGroups.map((group, index) => index === 0 && firstOption >= 0 ? group.slice(firstOption) : group);
    const optionSets = optionSources.map(parseOptions).filter((options) => Object.keys(options).length >= 2);
    const itemCount = Math.max(answers.length, optionSets.length);
    for (let itemIndex = 0; itemIndex < itemCount && number <= 75; itemIndex += 1) {
      const options = optionSets[itemIndex] ?? {};
      const pageIndex = pages.findIndex((page) => page.includes(block[0]));
      const visual = likelyVisual(stem, options);
      questions.push({
        id: `q-${year}-${number}`,
        year,
        number,
        stem,
        options: { A: options.A ?? "", B: options.B ?? "", C: options.C ?? "", D: options.D ?? "" },
        answer: answers[itemIndex] ?? null,
        explanation: null,
        questionPage: pageIndex >= 0 ? pageIndex + 1 : null,
        answerPage: pageIndex >= 0 ? pageIndex + 1 : null,
        containsVisual: visual,
        confidence: visual || !answers[itemIndex] ? "review-needed" : "high",
      });
      number += 1;
    }
  }
  const scoreable = questions.filter((question) => question.answer && Object.values(question.options).every(Boolean)).length;
  if (questions.length < 75) warnings.push(`资料正文只能可靠拆分 ${questions.length}/75 题，未生成缺失题目`);
  if (year === 2020) warnings.push("PDF 正文明确注明为考生回忆的不完整题集，不能作为 75 题整卷计分");
  if (year === 2021) warnings.push("PDF 尾部包含重复拼接和无答案题段，解析器仅采用前 51 个带解答题组");
  return {
    paper: {
      year,
      status: questions.length === 75 && scoreable === 75 ? "complete" : "partial",
      expectedQuestions: 75,
      parsedQuestions: questions.length,
      scoreableQuestions: scoreable,
      warnings,
    },
    questions,
  };
}

function parseOcrOptions(value) {
  const markers = [...value.matchAll(/([ABCD])\s*[.．]\s*/g)];
  const result = {};
  for (let index = 0; index < Math.min(markers.length, 4); index += 1) {
    const marker = markers[index];
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? value.length;
    result[marker[1]] = cleanPart(value.slice(start, end));
  }
  return result;
}

async function parse2019Ocr() {
  if (!existsSync(ocr2019Path)) {
    return {
      paper: {
        year: 2019,
        status: "unavailable",
        expectedQuestions: 75,
        parsedQuestions: 0,
        scoreableQuestions: 0,
        warnings: ["扫描版没有可靠文本层；请先运行 Swift OCR 脚本生成本地定位缓存"],
      },
      questions: [],
    };
  }
  const pages = JSON.parse(await readFile(ocr2019Path, "utf8"));
  const questionPages = pages.filter((page) => page.page >= 2 && page.page <= 11);
  const joined = questionPages.map((page) => stripBoilerplate(page.text)).join("\n");
  const questionSource = joined.split(/\n答案\s*\n/u)[0];
  const candidates = [...questionSource.matchAll(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?[.．]\s*/gm)];
  const groups = [];
  let expected = 1;
  for (const candidate of candidates) {
    const start = Number(candidate[1]);
    const end = start === 71 && !candidate[2] ? 75 : Number(candidate[2] || candidate[1]);
    if (start !== expected || end < start || end > 75) continue;
    groups.push({ match: candidate, start, end });
    expected = end + 1;
    if (end === 75) break;
  }
  const answerSource = pages.filter((page) => page.page >= 11 && page.page <= 23).map((page) => stripBoilerplate(page.text)).join("\n");
  const candidateAnswers = new Map();
  for (const match of answerSource.matchAll(/(?:第\s*)?(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*(?:题\s*答案)?\s*[：:.．]\s*([ABCD](?:\s*[ABCD])*)/g)) {
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    const letters = match[3].match(/[ABCD]/g) ?? [];
    if (start < 1 || end > 75 || letters.length !== end - start + 1) continue;
    letters.forEach((letter, index) => candidateAnswers.set(start + index, letter));
  }

  const questions = [];
  const warnings = [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const endOffset = groups[groupIndex + 1]?.match.index ?? questionSource.length;
    const content = normalizeText(questionSource.slice(group.match.index + group.match[0].length, endOffset));
    const optionStarts = [...content.matchAll(/(?:^|\n)\s*A\s*[.．]\s*/gm)];
    const expectedOptionSets = group.end - group.start + 1;
    const stem = cleanPart(content.slice(0, optionStarts[0]?.index ?? content.length));
    for (let offset = 0; offset < expectedOptionSets; offset += 1) {
      const number = group.start + offset;
      const optionStart = optionStarts[offset]?.index;
      const optionEnd = optionStarts[offset + 1]?.index ?? content.length;
      const options = optionStart === undefined ? {} : parseOcrOptions(content.slice(optionStart, optionEnd));
      const page = questionPages.find((item) => item.text.match(new RegExp(`(?:^|\\n)${group.start}(?:\\s*-\\s*\\d+)?[.．]`)))?.page ?? null;
      const visual = likelyVisual(stem, options);
      questions.push({
        id: `q-2019-${number}`,
        year: 2019,
        number,
        stem,
        options: { A: options.A ?? "", B: options.B ?? "", C: options.C ?? "", D: options.D ?? "" },
        answer: null,
        candidateAnswer: candidateAnswers.get(number) ?? null,
        explanation: null,
        questionPage: page,
        answerPage: null,
        containsVisual: visual,
        confidence: "review-needed",
      });
    }
  }
  if (questions.length !== 75) warnings.push(`OCR 题号只能连续拆分 ${questions.length}/75 题`);
  warnings.push(`OCR 定位到 ${candidateAnswers.size}/75 个候选答案；逐题视觉核验前均不参与网页判分`);
  return {
    paper: {
      year: 2019,
      status: "partial",
      expectedQuestions: 75,
      parsedQuestions: questions.length,
      scoreableQuestions: 0,
      warnings,
    },
    questions,
  };
}

const results = [];
for (let year = 2009; year <= 2018; year += 1) results.push(parseHistoricalPaper(year));

results.push(await parse2019Ocr());
results.push(parseRecallStylePaper(2020));
results.push(parseRecallStylePaper(2021));

const questions = results.flatMap((result) => result.questions);
const duplicateIds = questions.map((question) => question.id).filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`题目 ID 重复：${[...new Set(duplicateIds)].join("、")}`);
for (const question of questions) {
  if (!question.stem) throw new Error(`${question.id} 缺少题干`);
  if (question.answer && !/[ABCD]/.test(question.answer)) throw new Error(`${question.id} 答案无效`);
}

const bank = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourcePolicy: "题目正文只存本地；OCR 仅作定位；含图或公式题保留 PDF 回退；回忆题不伪装为完整真题。",
  papers: results.map((result) => result.paper),
  questions,
};
const report = {
  schemaVersion: 1,
  generatedAt: bank.generatedAt,
  totals: {
    papers: bank.papers.length,
    completePapers: bank.papers.filter((paper) => paper.status === "complete").length,
    parsedQuestions: questions.length,
    scoreableQuestions: questions.filter((question) => question.answer && Object.values(question.options).every(Boolean)).length,
    reviewNeeded: questions.filter((question) => question.confidence === "review-needed").length,
  },
  papers: bank.papers,
};

if (!checkOnly) {
  await mkdir(localRoot, { recursive: true });
  await mkdir(browserDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(publicStatusPath, `${JSON.stringify({ schemaVersion: 1, totals: report.totals, papers: report.papers }, null, 2)}\n`, "utf8");
  await writeFile(browserPath, `window.SA_QUESTION_BANK=${JSON.stringify(bank).replaceAll("<", "\\u003c")};\n`, "utf8");
}

console.log(JSON.stringify({ ok: true, checkOnly, ...report.totals, papers: report.papers }, null, 2));
