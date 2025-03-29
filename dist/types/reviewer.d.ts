export interface ReviewResult {
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    reviewer: string;
}
export interface ReviewerOptions {
    workdir?: string;
    enabled?: boolean;
    debug?: boolean;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    filePatterns?: string[];
    excludePatterns?: string[];
    language?: string;
}
export interface Reviewer {
    options: ReviewerOptions;
    isEnabled(): Promise<boolean>;
    review(files: string[]): Promise<ReviewResult[]>;
}
