export interface ReviewResult {
  file: string;
  line: number;
  message: string;
  severity: 'info' | 'warning' | 'error';
  reviewer: string;
}

export interface AxeViolation {
  help: string;
  nodes: Array<{
    html: string;
  }>;
}

export interface ReviewerOptions {
  // 기본 설정
  workdir?: string;
  enabled?: boolean;
  debug?: boolean;
  filePatterns?: string[];
  excludePatterns?: string[];
  useMockApi?: boolean;

  // AI 리뷰어 옵션
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  language?: 'ko' | 'en' | 'ja';

  // Axe 리뷰어 옵션
  standard?: 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';

  // HTML 검증기 옵션
  validatorUrl?: string;
  validateNested?: boolean;

  // CSS 검증기 옵션
  configPath?: string;
  allowWarnings?: boolean;

  // 인라인 코드 검출기 옵션
  inlineScriptThreshold?: number;
  inlineStyleThreshold?: number;

  // 이미지 최적화 검사기 옵션
  sizeThreshold?: number;
  dimensionThreshold?: number;
  checkWebpConversion?: boolean;

  // 페이지 구조 분석기 옵션
  strictHeadingOrder?: boolean;
  requireSemanticTags?: boolean;
  checkMetaTags?: boolean;
}

export interface Reviewer {
  options: ReviewerOptions;
  isEnabled(): Promise<boolean>;
  review(files: string[]): Promise<ReviewResult[]>;
}