(() => {
  const DEFAULT_OPENAI_BASE_URL = "http://localhost:1234/v1";
  const LOCAL_OPENAI_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
  const APPROVED_REMOTE_OPENAI_ORIGINS = ["https://ai.yihua.app"];

  function normalizeOpenAIBaseUrlSetting(value) {
    try {
      return normalizeLocalOpenAIBaseUrl(value);
    } catch {
      return DEFAULT_OPENAI_BASE_URL;
    }
  }

  function normalizeLocalOpenAIBaseUrl(value) {
    const rawValue = String(value || DEFAULT_OPENAI_BASE_URL).trim();
    const url = new URL(addDefaultHttpProtocol(rawValue));
    const isLocalhost = LOCAL_OPENAI_HOSTS.includes(url.hostname);
    const isApprovedRemote = APPROVED_REMOTE_OPENAI_ORIGINS.includes(url.origin);
    if ((!isLocalhost && !isApprovedRemote) || !["http:", "https:"].includes(url.protocol)) {
      throw new Error(
        "OpenAI-compatible base URL must point to localhost, 127.0.0.1, or an approved remote endpoint."
      );
    }
    return url.href.replace(/\/+$/, "");
  }

  function addDefaultHttpProtocol(value) {
    if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value)) {
      return value;
    }
    return `http://${value}`;
  }

  const api = {
    DEFAULT_OPENAI_BASE_URL,
    normalizeOpenAIBaseUrlSetting,
    normalizeLocalOpenAIBaseUrl
  };

  globalThis.PCFA_SETTINGS = api;
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
