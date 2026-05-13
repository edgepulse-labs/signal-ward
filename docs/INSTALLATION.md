# PCFA Installation and Setup

This guide covers local installation for the MVP Chrome / Chromium extension.

## Requirements

- Chrome or Chromium with extension developer mode available.
- Node.js 18 or newer for local validation commands.
- Optional: Ollama for local model analysis.

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

## Configure Ollama

Ollama is optional. If it is unavailable, PCFA uses the built-in local heuristic scorer.

Install and start Ollama, then pull the default model:

```sh
ollama serve
ollama pull llama3.2
```

PCFA sends local model requests to:

```text
http://localhost:11434
```

Open the PCFA side panel and click "Check" in the Ollama status row to verify the connection.

## Recommended First Settings

- Ollama model: `llama3.2`
- Collapse threshold: `72%`
- Heuristic-only mode: off, unless you do not want Ollama calls.
- Store raw visible text locally: off.

Raw visible text storage is disabled by default. Scores and minimal item metadata are stored in `chrome.storage.local`.

## Update After Code Changes

After editing extension files:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Click the reload button on the PCFA extension card.
4. Refresh any open X or Threads tabs.

## Troubleshooting

If the extension does not appear, run `npm run build` and check Chrome's extension error panel.

If no posts are annotated, refresh the X or Threads tab and make sure the URL matches one of the configured host permissions.

If Ollama is unavailable, verify that `ollama serve` is running and that `http://localhost:11434/api/tags` responds locally.
