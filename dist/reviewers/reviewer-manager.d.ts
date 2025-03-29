import { Reviewer, ReviewResult, ReviewerOptions } from '../types/reviewer';
export declare class ReviewerManager {
    private reviewers;
    private options;
    private resultsDir;
    constructor(options?: ReviewerOptions);
    registerReviewer(reviewer: Reviewer): void;
    getReviewer(type: string): Reviewer | undefined;
    runReviews(): Promise<void>;
    private createActionsSummary;
    private processCodeLine;
    private createCodeBlockWithLineNumbers;
    private generateChangeSummary;
    private groupResults;
    private formatMessage;
    private getTargetFiles;
    getResults(): Promise<ReviewResult[]>;
    private saveResults;
    generateSummary(results: ReviewResult[]): Promise<string>;
}
