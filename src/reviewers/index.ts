import AIReviewer from './ai-reviewer';
import AxeReviewer from './axe-reviewer';
import HTMLValidatorReviewer from './html-validator-reviewer';
import CSSValidatorReviewer from './css-validator-reviewer';
import InlineCodeDetectorReviewer from './inline-code-detector-reviewer';
import ImageOptimizerReviewer from './image-optimizer-reviewer';
import PageStructureReviewer from './page-structure-reviewer';
import { Reviewer } from '../types/reviewer';

export const createReviewer = (type: string, env?: NodeJS.ProcessEnv): Reviewer | null => {
  if (env?.DEBUG === 'true') {
    console.log(`[createReviewer] ${type} 리뷰어 생성 시작`);
  }

  switch (type) {
    case 'ai':
      return new AIReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.AI_REVIEWER_ENABLED === 'true',
        apiKey: env?.AI_REVIEWER_API_KEY || '',
        language: env?.AI_REVIEWER_LANGUAGE as 'ko' | 'en' | 'ja',
        model: env?.AI_REVIEWER_MODEL,
        maxTokens: parseInt(env?.AI_REVIEWER_MAX_TOKENS || '1000'),
        temperature: parseFloat(env?.AI_REVIEWER_TEMPERATURE || '0.7'),
        filePatterns: [env?.AI_REVIEWER_FILE_PATTERNS || "**/*.{js,jsx,ts,tsx}"],
        excludePatterns: [env?.AI_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
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

    case 'html':
      return new HTMLValidatorReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.HTML_REVIEWER_ENABLED === 'true',
        filePatterns: [env?.HTML_REVIEWER_FILE_PATTERNS || "**/*.{html,htm}"],
        excludePatterns: [env?.HTML_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
        workdir: env?.WORKSPACE_PATH || '.',
        validatorUrl: env?.HTML_REVIEWER_VALIDATOR_URL,
        useMockApi: env?.HTML_REVIEWER_USE_MOCK_API === 'true'
      });

    case 'css':
      return new CSSValidatorReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.CSS_REVIEWER_ENABLED === 'true',
        filePatterns: [env?.CSS_REVIEWER_FILE_PATTERNS || "**/*.{css,scss,less}"],
        excludePatterns: [env?.CSS_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
        workdir: env?.WORKSPACE_PATH || '.',
        configPath: env?.CSS_REVIEWER_CONFIG_PATH,
        useMockApi: env?.CSS_REVIEWER_USE_MOCK_API === 'true'
      });

    case 'inline-code':
      return new InlineCodeDetectorReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.INLINE_CODE_REVIEWER_ENABLED === 'true',
        filePatterns: [env?.INLINE_CODE_REVIEWER_FILE_PATTERNS || "**/*.{html,htm}"],
        excludePatterns: [env?.INLINE_CODE_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
        workdir: env?.WORKSPACE_PATH || '.',
        inlineScriptThreshold: parseInt(env?.INLINE_CODE_REVIEWER_SCRIPT_THRESHOLD || '5'),
        inlineStyleThreshold: parseInt(env?.INLINE_CODE_REVIEWER_STYLE_THRESHOLD || '10')
      });

    case 'image':
      return new ImageOptimizerReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.IMAGE_REVIEWER_ENABLED === 'true',
        filePatterns: [env?.IMAGE_REVIEWER_FILE_PATTERNS || "**/*.{html,htm,jpg,jpeg,png,gif,webp,svg}"],
        excludePatterns: [env?.IMAGE_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
        workdir: env?.WORKSPACE_PATH || '.',
        sizeThreshold: parseInt(env?.IMAGE_REVIEWER_SIZE_THRESHOLD || '200') * 1024,
        dimensionThreshold: parseInt(env?.IMAGE_REVIEWER_DIMENSION_THRESHOLD || '1000')
      });

    case 'page-structure':
      return new PageStructureReviewer({
        debug: env?.DEBUG === 'true',
        enabled: env?.PAGE_STRUCTURE_REVIEWER_ENABLED === 'true',
        filePatterns: [env?.PAGE_STRUCTURE_REVIEWER_FILE_PATTERNS || "**/*.{html,htm}"],
        excludePatterns: [env?.PAGE_STRUCTURE_REVIEWER_EXCLUDE_PATTERNS || "**/node_modules/**,**/dist/**"],
        workdir: env?.WORKSPACE_PATH || '.',
        strictHeadingOrder: env?.PAGE_STRUCTURE_REVIEWER_STRICT_HEADING_ORDER === 'true',
        checkMetaTags: env?.PAGE_STRUCTURE_REVIEWER_CHECK_META_TAGS !== 'false'
      });

    default:
      if (env?.DEBUG === 'true') {
        console.log(`[createReviewer] 알 수 없는 리뷰어 타입: ${type}`);
      }
      return null;
  }
};