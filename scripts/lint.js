const { spawnSync } = require("node:child_process");
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");

const roots = ["lib", "pages", "scripts", "tests"];
const files = [];
function visit(path) {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    if (statSync(full).isDirectory()) visit(full);
    else if (/\.(js|jsx)$/.test(entry)) files.push(full);
  }
}
roots.forEach(visit);

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (/\btry\s*\{\s*(?:const|let|var)?\s*[^}]*\b(?:require|import)\b/s.test(source)) {
    console.error(`${file}: imports must not be wrapped in try/catch`);
    process.exitCode = 1;
  }
}

for (const file of files.filter(file => file.endsWith(".js"))) {
  const check = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (check.status) process.exitCode = check.status;
}
if (!process.exitCode) console.log(`Checked ${files.length} JavaScript files.`);
