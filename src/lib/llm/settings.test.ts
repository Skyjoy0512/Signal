import { afterEach, describe, expect, it, vi } from "vitest";
import { getLlmSettingsView, saveLlmSettings, validateLlmSettingsInput, type LlmSettingsInput } from "./settings";

function validInput(overrides: Partial<LlmSettingsInput> = {}): LlmSettingsInput {
  return {
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    reasoningModel: "deepseek-chat",
    workerModel: "deepseek-chat",
    criticModel: "deepseek-chat",
    reasoningTemperature: 0.3,
    criticTemperature: 0.5,
    enableCritic: false,
    apiKey: "",
    inputCostPerMillion: 0,
    outputCostPerMillion: 0,
    dailyCostLimitUsd: 3,
    ...overrides,
  };
}

describe("validateLlmSettingsInput", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to environment settings when Supabase env is missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("LLM_PROVIDER", "deepseek");

    await expect(getLlmSettingsView()).resolves.toMatchObject({
      provider: "deepseek",
      source: "environment",
    });
  });

  it("returns a clear error when saving GUI settings without Supabase env", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(saveLlmSettings(validInput())).rejects.toThrow(/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("accepts valid settings", () => {
    expect(validateLlmSettingsInput(validInput()).provider).toBe("deepseek");
  });

  it("rejects invalid provider, empty model, and high temperature", () => {
    expect(() => validateLlmSettingsInput(validInput({ provider: "bad" as LlmSettingsInput["provider"] }))).toThrow(/provider/i);
    expect(() => validateLlmSettingsInput(validInput({ workerModel: "" }))).toThrow(/workerModel/);
    expect(() => validateLlmSettingsInput(validInput({ reasoningTemperature: 2 }))).toThrow(/temperature/i);
  });

  it("rejects invalid base URLs", () => {
    expect(() => validateLlmSettingsInput(validInput({ baseUrl: "http://api.example.com" }))).toThrow(/https/i);
    expect(() => validateLlmSettingsInput(validInput({ baseUrl: "https://localhost:11434" }))).toThrow(/localhost/i);
    expect(() => validateLlmSettingsInput(validInput({ baseUrl: "https://192.168.0.10" }))).toThrow(/private/i);
    expect(() => validateLlmSettingsInput(validInput({ baseUrl: "https://169.254.169.254" }))).toThrow(/metadata|private/i);
  });

  it("rejects negative or implausibly high costs", () => {
    expect(() => validateLlmSettingsInput(validInput({ dailyCostLimitUsd: -1 }))).toThrow(/0 or greater/);
    expect(() => validateLlmSettingsInput(validInput({ inputCostPerMillion: 20000 }))).toThrow(/too high/);
  });
});
