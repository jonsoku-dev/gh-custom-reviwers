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
  
  // AI 리뷰어 옵션
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  filePatterns?: string[];
  excludePatterns?: string[];
  language?: 'ko' | 'en' | 'ja';
  // Axe Reviewer specific
  standard?: 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';
  useMockApi?: boolean;
}

export interface Reviewer {
  options: ReviewerOptions;
  isEnabled(): Promise<boolean>;
  review(files: string[]): Promise<ReviewResult[]>;
} 