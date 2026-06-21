import { ChatCompletionsProvider } from "./chat-completions-provider";

export class DeepSeekProvider extends ChatCompletionsProvider {
  constructor() {
    super({
      providerType: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      missingKeyMessage: "DEEPSEEK_API_KEY is not set",
      inputTokenCostPerMillion: 0.27,
      outputTokenCostPerMillion: 1.10,
    });
  }
}
