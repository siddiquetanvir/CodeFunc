document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const personaSelect = document.getElementById('persona') as HTMLSelectElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLElement;

  // Load saved settings
  const items = await chrome.storage.local.get(['apiKey', 'persona']);
  if (items.apiKey) {
    apiKeyInput.value = items.apiKey;
  }
  if (items.persona) {
    personaSelect.value = items.persona;
  }

  // Save on button click
  saveBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({
      apiKey: apiKeyInput.value.trim(),
      persona: personaSelect.value,
    });
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
});
