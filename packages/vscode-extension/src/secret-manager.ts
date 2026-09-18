import * as vscode from 'vscode';

const SECRET_KEY = 'codefunc.geminiApiKey';

export class SecretManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Retrieves the API key from VS Code SecretStorage,
   * falling back to environment variables (OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY).
   */
  async getApiKey(): Promise<string | undefined> {
    const secret = await this.context.secrets.get(SECRET_KEY);
    if (secret && secret.trim()) {
      return secret.trim();
    }

    const envKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.GEMINI_API_KEY;
    if (envKey && envKey.trim()) {
      return envKey.trim();
    }

    return undefined;
  }

  /**
   * Interactively prompts the user to enter their API key.
   */
  async promptForApiKey(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      title: 'CodeFunc: Enter AI API Key',
      prompt: 'Supports Anthropic (sk-ant-...), OpenRouter (sk-or-...), Groq (gsk_...), or Gemini. Auto-detected!',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'sk-ant-... (Claude) or sk-or-... (OpenRouter) or gsk_... (Groq) or AQ... (Gemini)',
      validateInput: (value) => {
        if (!value || !value.trim()) {
          return 'API key cannot be empty';
        }
        return null;
      },
    });

    if (input) {
      await this.context.secrets.store(SECRET_KEY, input.trim());
      vscode.window.showInformationMessage('CodeFunc: API key saved securely in SecretStorage.');
      return input.trim();
    }

    return undefined;
  }

  /**
   * Removes the stored API key.
   */
  async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEY);
    vscode.window.showInformationMessage('CodeFunc: Gemini API key removed.');
  }
}

