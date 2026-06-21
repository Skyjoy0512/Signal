import { RuleBasedAnalysisEngine } from "./logic-engine";
import { LlmScoreEnhancer } from "./llm-enhancer";
import type { AnalysisLogicEngine, AnalysisSubject, InvestmentAnalysisResult, LlmEnhancer, LlmEnhancerConfig } from "./types";

export interface InvestmentAnalysisEngineConfig {
  logicEngine?: AnalysisLogicEngine;
  llmEnhancer?: LlmEnhancer | null;
  llm?: LlmEnhancerConfig;
}

export class InvestmentAnalysisEngine {
  private readonly logicEngine: AnalysisLogicEngine;
  private readonly llmEnhancer: LlmEnhancer | null;

  constructor(config: InvestmentAnalysisEngineConfig = {}) {
    this.logicEngine = config.logicEngine ?? new RuleBasedAnalysisEngine();
    this.llmEnhancer = config.llmEnhancer ?? (config.llm?.enabled ? new LlmScoreEnhancer(config.llm) : null);
  }

  analyzeWithRules(subject: AnalysisSubject): InvestmentAnalysisResult {
    return { ...this.logicEngine.analyze(subject), llm: null, costUsd: 0 };
  }

  async analyzeWithLlm(subject: AnalysisSubject): Promise<InvestmentAnalysisResult> {
    const logic = this.logicEngine.analyze(subject);
    if (!this.llmEnhancer) return { ...logic, llm: null, costUsd: 0 };
    const enhanced = await this.llmEnhancer.enhance(subject, logic);
    return { ...logic, scores: enhanced.scores, classification: enhanced.classification, llm: enhanced.llm, costUsd: enhanced.costUsd };
  }
}
