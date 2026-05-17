/**
 * For React Compiler projects, useMemo / useCallback / React.memo are redundant.
 * Run from repo root: `bun run --cwd web check:no-manual-memo`
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

const rules: { id: string; re: RegExp }[] = [
  { id: "useMemo", re: /\buseMemo\b/ },
  { id: "useCallback", re: /\buseCallback\b/ },
  { id: "React.memo", re: /\bReact\.memo\b/ },
];

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkTsFiles(p);
    } else {
      const ext = extname(ent.name);
      if (ext === ".ts" || ext === ".tsx") {
        yield p;
      }
    }
  }
}

const hits: string[] = [];

for await (const filePath of walkTsFiles(srcRoot)) {
  const text = await readFile(filePath, "utf8");
  const rel = relative(srcRoot, filePath);
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { id, re } of rules) {
      if (re.test(line)) {
        hits.push(`${rel}:${i + 1}  forbidden ${id}: ${line.trim()}`);
      }
    }
  }
}

if (hits.length > 0) {
  console.error(
    "Manual memoization APIs are not allowed (use React Compiler instead):\n\n" +
      hits.join("\n") +
      "\n",
  );
  process.exit(1);
}

console.log("No manual memoization OK:", relative(join(srcRoot, ".."), srcRoot));
