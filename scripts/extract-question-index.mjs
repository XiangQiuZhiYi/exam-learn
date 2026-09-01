import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const manifestPath = path.join(projectDir, "data", "materials.json");
const outputPath = path.join(projectDir, "data", "question-index.json");
const shouldWrite = process.argv.includes("--write");
const bundledPopplerRoot = path.join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "native", "poppler", "poppler");
const bundledPdftotext = path.join(bundledPopplerRoot, "bin", "pdftotext");
const pdftotextBinary = process.env.PDFTOTEXT_BIN || (existsSync(bundledPdftotext) ? bundledPdftotext : "pdftotext");

function extractPages(file) {
  const result = spawnSync(pdftotextBinary, ["-layout", file, "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: existsSync(path.join(bundledPopplerRoot, "share", "poppler"))
      ? { ...process.env, POPPLER_DATADIR: path.join(bundledPopplerRoot, "share", "poppler") }
      : process.env,
  });
  if (result.error) throw new Error(`无法启动 pdftotext：${result.error.message}。可通过 PDFTOTEXT_BIN 指定程序路径。`);
  if (result.status !== 0) throw new Error(`无法提取 PDF 文本：${file}\n${result.stderr || result.stdout}`);
  return result.stdout.split("\f").filter((page, index, pages) => index < pages.length - 1 || page.trim());
}

function locateQuestion(pages, questionNumber) {
  const marker = new RegExp(`[（(]\\s*${questionNumber}\\s*[）)]`);
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const match = marker.exec(page);
    if (!match) continue;
    const occurrence = match.index;
    const bullet = page.lastIndexOf("●", occurrence);
    const start = bullet >= 0 ? bullet : Math.max(0, occurrence - 360);
    const end = Math.min(page.length, occurrence + 260);
    return {
      page: index + 1,
      snippet: page.slice(start, end).replace(/\s+/g, " ").trim(),
    };
  }
  return null;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const materialById = new Map(manifest.materials.map((material) => [material.id, material]));
const localRoot = path.resolve(projectDir, manifest.localRoot);
const papers = [];

for (let year = 2009; year <= 2018; year += 1) {
  const paper = materialById.get(`paper-${year}`);
  const answer = materialById.get(`answer-${year}`);
  if (!paper || !answer) throw new Error(`缺少 ${year} 年题面或答案资料`);
  const questionPages = extractPages(path.join(localRoot, paper.localRelativePath));
  const answerPages = extractPages(path.join(localRoot, answer.localRelativePath));
  const questions = [];
  for (let questionNumber = 1; questionNumber <= 75; questionNumber += 1) {
    const questionLocation = locateQuestion(questionPages, questionNumber);
    const answerLocation = locateQuestion(answerPages, questionNumber);
    if (!questionLocation || !answerLocation) {
      throw new Error(`${year} 年第 ${questionNumber} 题无法定位：题面=${Boolean(questionLocation)}，答案=${Boolean(answerLocation)}`);
    }
    questions.push({
      number: questionNumber,
      questionPage: questionLocation.page,
      answerPage: answerLocation.page,
      snippet: questionLocation.snippet,
    });
  }
  papers.push({ year, paperId: paper.id, answerId: answer.id, questions });
}

const output = { schemaVersion: 1, generatedFrom: "materials/local", papers };
if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, papers: papers.length, questions: papers.reduce((sum, paper) => sum + paper.questions.length, 0), output: shouldWrite ? path.relative(projectDir, outputPath) : null }, null, 2));
