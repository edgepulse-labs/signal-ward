const assert = require("assert/strict");

const settings = require("../src/settings.js");

assert.equal(
  settings.normalizeLocalOpenAIBaseUrl("http://localhost:1234/v1"),
  "http://localhost:1234/v1"
);
assert.equal(
  settings.normalizeLocalOpenAIBaseUrl("localhost:1234/v1"),
  "http://localhost:1234/v1"
);
assert.equal(
  settings.normalizeLocalOpenAIBaseUrl("127.0.0.1:1234/v1/"),
  "http://127.0.0.1:1234/v1"
);
assert.equal(settings.normalizeLocalOpenAIBaseUrl("http://[::1]:1234/v1"), "http://[::1]:1234/v1");
assert.equal(settings.normalizeLocalOpenAIBaseUrl("https://ai.yihua.app/v1/"), "https://ai.yihua.app/v1");
assert.equal(settings.normalizeOpenAIBaseUrlSetting("https://ai.yihua.app/"), "https://ai.yihua.app");
assert.equal(
  settings.normalizeOpenAIBaseUrlSetting("https://api.openai.com/v1"),
  settings.DEFAULT_OPENAI_BASE_URL
);
assert.throws(() => settings.normalizeLocalOpenAIBaseUrl("https://api.openai.com/v1"));

console.log("Unit tests passed.");
