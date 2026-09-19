import { summarizeFile, FileSummary } from '@codefunc/core';

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE_FILE') {
    handleSummarize(request.payload)
      .then((summary) => sendResponse({ success: true, summary }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['apiKey', 'provider', 'model', 'persona'], (items) => {
      sendResponse(items);
    });
    return true;
  }
});

async function handleSummarize(payload: {
  code: string;
  filePath: string;
  languageId?: string;
}): Promise<FileSummary> {
  const settings = await chrome.storage.local.get(['apiKey', 'provider', 'model', 'persona']);

  const summary = await summarizeFile({
    code: payload.code,
    filePath: payload.filePath,
    languageId: payload.languageId,
    apiKey: settings.apiKey || '',
    provider: settings.provider || 'auto',
    model: settings.model || undefined,
    persona: settings.persona || 'General Developer',
  });

  return summary;
}
