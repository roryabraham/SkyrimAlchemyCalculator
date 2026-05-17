/**
 * Run babel-plugin-react-compiler on every web/src module (smoke test without a full Vite build).
 * Run from repo root: `bun run --cwd web check:react-compiler`
 */
import { transformSync } from "@babel/core";
import reactCompiler from "babel-plugin-react-compiler";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

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

for await (const filePath of walkTsFiles(srcRoot)) {
  const code = await readFile(filePath, "utf8");
  const isTsx = filePath.endsWith(".tsx");
  const out = transformSync(code, {
    filename: filePath,
    plugins: [
      [
        reactCompiler,
        {
          // Default is "none" — errors are logged only; CI must fail on violations.
          panicThreshold: "all_errors",
        },
      ],
    ],
    ast: false,
    code: true,
    configFile: false,
    babelrc: false,
    parserOpts: {
      sourceType: "module",
      plugins: isTsx ? (["typescript", "jsx"] as const) : (["typescript"] as const),
    },
  });

  if (!out || typeof out.code !== "string" || out.code.length === 0) {
    throw new Error(`Babel produced no output for ${relative(srcRoot, filePath)}`);
  }
}

console.log("React Compiler OK:", relative(join(srcRoot, ".."), srcRoot), "(all modules)");
