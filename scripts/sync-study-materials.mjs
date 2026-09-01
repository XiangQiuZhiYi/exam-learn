import { access, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const manifestPath = path.join(projectDir, "data", "materials.json");
const localConfigPath = path.join(projectDir, "materials.local.json");

function parseArgs(argv) {
  const result = { check: false, source: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") result.check = true;
    else if (arg === "--source") {
      result.source = argv[index + 1];
      index += 1;
      if (!result.source) throw new Error("--source 需要提供目录路径");
    } else throw new Error(`未知参数：${arg}`);
  }
  return result;
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256(file) {
  const hash = createHash("sha256");
  const content = await readFile(file);
  hash.update(content);
  return hash.digest("hex");
}

function pageCount(file) {
  const binary = process.env.PDFINFO_BIN || "pdfinfo";
  const result = spawnSync(binary, [file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`无法读取 PDF 页数：${file}\n${result.stderr || result.stdout}`);
  const match = result.stdout.match(/^Pages:\s+(\d+)$/m);
  if (!match) throw new Error(`pdfinfo 未返回页数：${file}`);
  return Number(match[1]);
}

function assertSafeRelative(relativePath, field) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`${field} 必须是安全的相对路径：${relativePath}`);
  }
}

async function resolveSourceRoot(args, manifest) {
  if (args.source) return path.resolve(args.source);
  if (await exists(localConfigPath)) {
    const config = JSON.parse(await readFile(localConfigPath, "utf8"));
    if (!config.sourceRoot || typeof config.sourceRoot !== "string") {
      throw new Error("materials.local.json 必须包含字符串字段 sourceRoot");
    }
    return path.resolve(projectDir, config.sourceRoot);
  }
  return path.resolve(projectDir, manifest.sourceRootDefault);
}

async function validateFile(file, material) {
  if (!(await exists(file))) throw new Error(`资料不存在：${file}`);
  const stats = await stat(file);
  if (!stats.isFile()) throw new Error(`资料不是文件：${file}`);
  if (stats.size !== material.bytes) {
    throw new Error(`${material.id} 文件大小不符：预期 ${material.bytes}，实际 ${stats.size}`);
  }
  const actualHash = await sha256(file);
  if (actualHash !== material.sha256) {
    throw new Error(`${material.id} SHA-256 不符：预期 ${material.sha256}，实际 ${actualHash}`);
  }
  const actualPages = pageCount(file);
  if (actualPages !== material.pages) {
    throw new Error(`${material.id} 页数不符：预期 ${material.pages}，实际 ${actualPages}`);
  }
  return { bytes: stats.size, pages: actualPages, sha256: actualHash };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const sourceRoot = await resolveSourceRoot(args, manifest);
  const localRoot = path.resolve(projectDir, manifest.localRoot);
  const results = [];

  if (!(await exists(sourceRoot))) throw new Error(`来源目录不存在：${sourceRoot}`);
  if (!Array.isArray(manifest.materials) || manifest.materials.length !== 27) {
    throw new Error(`资料清单应包含 27 项，当前为 ${manifest.materials?.length ?? 0}`);
  }

  for (const material of manifest.materials) {
    assertSafeRelative(material.sourceRelativePath, "sourceRelativePath");
    assertSafeRelative(material.localRelativePath, "localRelativePath");
    const sourceFile = path.resolve(sourceRoot, material.sourceRelativePath);
    const localFile = path.resolve(localRoot, material.localRelativePath);
    const sourceMeta = await validateFile(sourceFile, material);

    if (!args.check) {
      await mkdir(path.dirname(localFile), { recursive: true });
      await copyFile(sourceFile, localFile);
    }

    const localExists = await exists(localFile);
    if (localExists) await validateFile(localFile, material);
    else if (args.check) throw new Error(`本地资料尚未同步：${localFile}`);

    results.push({ id: material.id, localRelativePath: material.localRelativePath, ...sourceMeta });
  }

  if (!args.check) {
    await writeFile(path.join(localRoot, "sync-report.json"), `${JSON.stringify({ schemaVersion: 1, syncedAt: new Date().toISOString(), sourceRoot, materials: results }, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({ ok: true, mode: args.check ? "check" : "sync", sourceRoot, localRoot, count: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
