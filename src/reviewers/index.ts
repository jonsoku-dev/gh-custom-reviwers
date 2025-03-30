import AIReviewer from './ai-reviewer';
import AxeReviewer from './axe-reviewer';
import { Reviewer } from '../types/reviewer';

export const createReviewer = (type: string, env?: NodeJS.ProcessEnv): Reviewer | null => {
  console.log(env, '[createReviewer] env');
  switch (type) {
    case 'ai':
      return new AIReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.AI_REVIEWER_ENABLED === 'true',
        apiKey: env?.AI_REVIEWER_API_KEY || 'API_KEY 없음',
        language: env?.AI_REVIEWER_LANGUAGE as 'ko' | 'en' | 'ja',
        model: env?.AI_REVIEWER_MODEL,
        maxTokens: parseInt(env?.AI_REVIEWER_MAX_TOKENS || '1000'),
        temperature: parseFloat(env?.AI_REVIEWER_TEMPERATURE || '0.7'),
        filePatterns: env?.AI_REVIEWER_FILE_PATTERNS?.split(','),
        excludePatterns: env?.AI_REVIEWER_EXCLUDE_PATTERNS?.split(','),
        workdir: env?.WORKSPACE_PATH || '.',
        useMockApi: env?.AI_REVIEWER_USE_MOCK_API === 'true'
      });
    case 'axe':
      return new AxeReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.AXE_REVIEWER_ENABLED === 'true',
        filePatterns: [env?.AXE_REVIEWER_FILE_PATTERNS || "**/*.{html,jsx,tsx}"],
        excludePatterns: [env?.AXE_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
        workdir: env?.WORKSPACE_PATH || '.',
        standard: (env?.AXE_REVIEWER_STANDARD || 'WCAG2AA') as 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA'
      });
    default:
      return null;
  }
}; 