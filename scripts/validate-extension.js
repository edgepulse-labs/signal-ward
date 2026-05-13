const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const requiredManifestKeys = [
  "manifest_version",
  "name",
  "version",
  "permissions",
  "background",
  "content_scripts",
  "side_panel"
];

for (const key of requiredManifestKeys) {
  if (!(key in manifest)) {
    throw new Error(`manifest.json is missing ${key}.`);
  }
}

if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must use Manifest V3.");
}

const requiredIconFiles = [
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-48.png",
  "assets/icons/icon-128.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-source.png"
];

for (const file of requiredIconFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`${file} is missing.`);
  }
}

const jsFiles = [
  "src/background.js",
  "src/content.js",
  "src/i18n.js",
  "src/settings.js",
  "src/sidepanel.js",
  "scripts/validate-extension.js",
  "scripts/validate-fixtures.js",
  "scripts/unit-tests.js"
];

const formattedFiles = [
  ".editorconfig",
  ".env.example",
  ".gitignore",
  "manifest.json",
  "_locales/en/messages.json",
  "_locales/zh_TW/messages.json",
  "package.json",
  "tsconfig.json",
  "fixtures/feed-extraction.json",
  "scripts/validate-extension.js",
  "scripts/validate-fixtures.js",
  "scripts/unit-tests.js",
  "src/background.js",
  "src/content.css",
  "src/content.js",
  "src/i18n.js",
  "src/settings.js",
  "src/sidepanel.css",
  "src/sidepanel.html",
  "src/sidepanel.js",
  "src/types.d.ts",
  "docs/COLLECTIVE_DEFENSE_PLAN.md",
  "docs/COLLECTIVE_DEFENSE_PLAN.zh-TW.md",
  "docs/EDGEPULSE_COLLECTOR_INTEGRATION.md",
  "docs/EDGEPULSE_COLLECTOR_INTEGRATION.zh-TW.md",
  "docs/EXECUTION_PLAN.md",
  "docs/EXECUTION_PLAN.zh-TW.md",
  "docs/FOCUS_INFORMATION_CLASSIFICATION.md",
  "docs/FOCUS_INFORMATION_CLASSIFICATION.zh-TW.md",
  "docs/ICON_GENERATION_PROMPT.md",
  "docs/ICON_GENERATION_PROMPT.zh-TW.md",
  "docs/INSTALLATION.md",
  "docs/INSTALLATION.zh-TW.md",
  "docs/REAL_WORLD_VALIDATION.md",
  "docs/REAL_WORLD_VALIDATION.zh-TW.md",
  "docs/UNIT_TEST_PLAN_AND_RESULTS.md",
  "docs/UNIT_TEST_PLAN_AND_RESULTS.zh-TW.md",
  "docs/USAGE.md",
  "docs/USAGE.zh-TW.md",
  "docs/adr/0001-local-first-data-handling.md"
];

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error(`${file} failed JavaScript syntax validation.`);
  }
}

for (const file of formattedFiles) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  if (!content.endsWith("\n")) {
    throw new Error(`${file} must end with a newline.`);
  }
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (/[ \t]$/.test(line)) {
      throw new Error(`${file}:${index + 1} has trailing whitespace.`);
    }
    if (/^\t+/.test(line)) {
      throw new Error(`${file}:${index + 1} uses tab indentation.`);
    }
  });
}

const fixtureResult = spawnSync(process.execPath, [path.join(root, "scripts/validate-fixtures.js")], {
  encoding: "utf8"
});
if (fixtureResult.status !== 0) {
  process.stderr.write(fixtureResult.stderr || fixtureResult.stdout);
  throw new Error("Fixture validation failed.");
}

console.log("Extension manifest, JavaScript syntax, formatting, and fixtures passed.");
