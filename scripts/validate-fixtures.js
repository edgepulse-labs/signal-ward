const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const fixturePath = path.join(root, "fixtures/feed-extraction.json");
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

if (!Array.isArray(fixtures) || fixtures.length < 2) {
  throw new Error("feed-extraction fixtures must include X and Threads examples.");
}

for (const fixture of fixtures) {
  assertString(fixture.name, "name");
  assertString(fixture.platform, `${fixture.name}.platform`);
  assertString(fixture.host, `${fixture.name}.host`);
  assertString(fixture.selector, `${fixture.name}.selector`);
  assertString(fixture.html, `${fixture.name}.html`);

  if (!["x", "threads"].includes(fixture.platform)) {
    throw new Error(`${fixture.name} has unsupported platform ${fixture.platform}.`);
  }
  if (!fixture.html.includes(fixture.expected.textIncludes)) {
    throw new Error(`${fixture.name} HTML does not include expected text.`);
  }
  if (!fixture.html.includes(fixture.expected.authorHandle)) {
    throw new Error(`${fixture.name} HTML does not include expected author handle.`);
  }
  if (!fixture.html.includes(fixture.expected.urlIncludes)) {
    throw new Error(`${fixture.name} HTML does not include expected URL fragment.`);
  }
  if (
    typeof fixture.expected.minimumExtractionConfidence !== "number" ||
    fixture.expected.minimumExtractionConfidence < 0 ||
    fixture.expected.minimumExtractionConfidence > 1
  ) {
    throw new Error(`${fixture.name} must define a normalized minimum extraction confidence.`);
  }
}

console.log("Fixture examples passed structural validation.");

function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Fixture field ${label} must be a non-empty string.`);
  }
}
