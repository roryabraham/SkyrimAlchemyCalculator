/**
 * Download rhysd/actionlint release binary (verified against official checksums.txt), cache under
 * `.cache/actionlint/`, and run it on `.github/workflows/`.
 *
 * Run from repo root: `bun run check:actionlint`
 */
import { createHash } from "node:crypto";
import { chmod, mkdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { text } from "node:stream/consumers";

const VERSION = "1.7.12";

/** From https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_checksums.txt */
const TARBALL_SHA256: Record<string, string> = {
  darwin_amd64: "5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644",
  darwin_arm64: "aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f",
  linux_amd64: "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8",
  linux_arm64: "325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6",
};

function archiveSuffix(): string {
  const { platform, arch } = process;
  if (platform === "darwin") {
    return arch === "arm64" ? "darwin_arm64" : "darwin_amd64";
  }
  if (platform === "linux") {
    return arch === "arm64" ? "linux_arm64" : "linux_amd64";
  }
  throw new Error(
    `actionlint: unsupported OS/arch ${platform}/${arch} (need darwin or linux x64/arm64)`,
  );
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  const buf = await Bun.file(path).arrayBuffer();
  hash.update(new Uint8Array(buf));
  return hash.digest("hex");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const repoRoot = join(import.meta.dir, "..");
const suffix = archiveSuffix();
const expectedSha = TARBALL_SHA256[suffix];
if (!expectedSha) {
  throw new Error(`actionlint: missing checksum mapping for ${suffix}`);
}

const cacheDir = join(repoRoot, ".cache", "actionlint", VERSION, suffix);
const tarballName = `actionlint_${VERSION}_${suffix}.tar.gz`;
const tarballPath = join(cacheDir, tarballName);
const binaryPath = join(cacheDir, "actionlint");

await mkdir(cacheDir, { recursive: true });

let needDownload = true;
if (await fileExists(tarballPath)) {
  const actual = await sha256File(tarballPath);
  if (actual === expectedSha) {
    needDownload = false;
  } else {
    await unlink(tarballPath);
  }
}

if (needDownload) {
  const url = `https://github.com/rhysd/actionlint/releases/download/v${VERSION}/${tarballName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`actionlint: download failed ${res.status} ${url}`);
  }
  await Bun.write(tarballPath, await res.arrayBuffer());
  const actual = await sha256File(tarballPath);
  if (actual !== expectedSha) {
    await unlink(tarballPath);
    throw new Error(
      `actionlint: SHA256 mismatch for ${tarballName} (got ${actual}, expected ${expectedSha})`,
    );
  }
}

if (!(await fileExists(binaryPath))) {
  const tar = Bun.spawn(["tar", "xzf", tarballPath, "-C", cacheDir, "actionlint"], {
    cwd: cacheDir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const err = (await text(tar.stderr)).trim();
  const code = await tar.exited;
  if (code !== 0) {
    throw new Error(`actionlint: tar extract failed (${code})${err ? `: ${err}` : ""}`);
  }
}

await chmod(binaryPath, 0o755);

const proc = Bun.spawn([binaryPath, "-color"], {
  cwd: repoRoot,
  stdout: "inherit",
  stderr: "inherit",
});
const exitCode = await proc.exited;
if (exitCode !== 0) {
  process.exit(exitCode);
}
