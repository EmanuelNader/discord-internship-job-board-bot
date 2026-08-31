import { readFileSync } from "node:fs";

const checks = [
  ["dist/index.js", "./config/env.js"],
  ["dist/adapters/index.js", "./greenhouse.js"],
];

for (const [file, needle] of checks) {
  const src = readFileSync(file, "utf8");
  if (!src.includes(needle)) {
    console.error(
      `${file} is missing ESM specifier ${needle}. Build with tsc-alias --resolve-full-paths.`
    );
    process.exit(1);
  }
}
