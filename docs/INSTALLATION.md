# PCFA Installation and Setup

This guide covers local installation for the MVP Chrome / Chromium extension.

## Requirements

- Chrome or Chromium with extension developer mode available.
- WebGPU-enabled browser profile for the default WebLLM model provider.
- Node.js 18 or newer for local validation commands.
- Optional: Ollama for local server model analysis.

PCFA does not require npm dependencies for the current MVP.

## Validate the Extension

From the repository root:

```sh
npm run build
```

The command validates:

- `manifest.json` shape and Manifest V3 version,
- JavaScript syntax for extension scripts,
- basic formatting for tracked source and documentation files.

## Load in Chrome or Chromium

1. Open Chrome or Chromium.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click "Load unpacked".
5. Select the repository root:

```text
/home/nier/workspace/signal-ward
```

6. Confirm that "Personal Cognitive Firewall Assistant" appears in the extension list.
7. Pin the extension if you want faster side panel access.

## Configure WebLLM

WebLLM is the default provider. On first use, PCFA downloads the selected WebLLM model into the browser cache and runs analysis in the browser through WebGPU. Open the PCFA side panel and click "Check" in the provider status row to warm up the model.

Default WebLLM settings:

- Provider: `webllm`
- Model: `Llama-3.2-1B-Instruct-q4f16_1-MLC`
- Temperature: `0`
- Max tokens: `700`

If WebLLM or the selected provider is unavailable, PCFA uses the built-in local heuristic scorer.

## Configure Ollama

Ollama is optional.

Install and start Ollama, then pull the default model:

```sh
ollama serve
ollama pull llama3.2
```

PCFA sends local model requests to:

```text
http://localhost:11434
```

Open the PCFA side panel, choose provider `ollama`, and click "Check" in the provider status row to verify the connection.

## LM Studio or OpenAI-Compatible Servers

PCFA can use WebLLM by default, Ollama, a local OpenAI-compatible server, or an explicitly approved OpenAI-compatible endpoint. Ollama calls:

```text
http://localhost:11434/api/generate
http://localhost:11434/api/tags
```

LM Studio and many local inference servers expose OpenAI-compatible endpoints, commonly under a base URL like:

```text
http://localhost:1234/v1
```

For LM Studio, start the local API server from the Developer tab, or start it from the terminal:

```sh
lms server start
```

Then verify the OpenAI-compatible model list:

```sh
curl http://localhost:1234/v1/models
```

In the side panel, use these settings:

- Provider: `openai-compatible`
- Base URL: `http://localhost:1234/v1`
- Model: the model identifier reported by `/v1/models`
- API key: a local placeholder such as `lm-studio`, unless your server enforces a real key
- Chat endpoint: `/v1/chat/completions`

PCFA currently sends analysis through `/v1/chat/completions` and checks health through `/v1/models`. For privacy, OpenAI-compatible base URLs must point to localhost, `127.0.0.1`, IPv6 localhost, or a specific extension-allowlisted remote origin such as `https://ai.yihua.app`.

## Recommended First Settings

- Provider: `webllm`
- WebLLM model: `Llama-3.2-1B-Instruct-q4f16_1-MLC`
- Collapse threshold: `72%`
- Heuristic-only mode: off, unless you do not want model calls.
- Store raw visible text locally: off.

Raw visible text storage is disabled by default. Scores and minimal item metadata are stored in `chrome.storage.local`.

## Update After Code Changes

After editing extension files:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Click the reload button on the PCFA extension card.
4. Refresh any open X, Threads, or Facebook tabs.

## Troubleshooting

If the extension does not appear, run `npm run build` and check Chrome's extension error panel.

If no posts are annotated, refresh the X, Threads, or Facebook tab and make sure the URL matches one of the configured host permissions.

If Ollama is unavailable, verify that `ollama serve` is running and that `http://localhost:11434/api/tags` responds locally.

For live X / Threads and Ollama verification prep, see [Real-World Validation Prep](REAL_WORLD_VALIDATION.md).
