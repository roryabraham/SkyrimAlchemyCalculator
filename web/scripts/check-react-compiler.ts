/**
 * Smoke-test babel-plugin-react-compiler on App.tsx without a full Vite build.
 * Run from repo root: `bun run --cwd web check:react-compiler`
 */
import { transformSync } from "@babel/core";
import reactCompiler from "babel-plugin-react-compiler";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const appPath = join(dir, "..", "src", "App.tsx");
const code = readFileSync(appPath, "utf8");

const out = transformSync(code, {
  filename: appPath,
  plugins: [[reactCompiler, {}]],
  ast: false,
  code: true,
  configFile: false,
  babelrc: false,
  parserOpts: {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  },
});

if (!out || typeof out.code !== "string" || out.code.length === 0) {
  throw new Error("Babel produced no output");
}

console.log("React Compiler OK:", appPath);
