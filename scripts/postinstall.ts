/**
 * Run DB seed only when `data/alchemy.sqlite` is missing so `bun install` does not overwrite a committed DB.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dbPath = join(root, "data", "alchemy.sqlite");

if (!existsSync(dbPath)) {
  const result = Bun.spawnSync(["bun", "run", "scripts/seed-db.ts"], {
    cwd: root,
    stdio: ["inherit", "inherit", "inherit"],
  });
  process.exit(result.exitCode ?? 1);
}
