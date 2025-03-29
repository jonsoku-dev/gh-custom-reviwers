import { Reviewer, ReviewResult, ReviewerOptions } from '../types/reviewer';
export default class AIReviewer implements Reviewer {
    private openai;
    private _options;
    private readonly name;
    constructor(options?: ReviewerOptions);
    private initializeOpenAI;
    get options(): ReviewerOptions;
    set options(newOptions: ReviewerOptions);
    isEnabled(): Promise<boolean>;
    review(files: string[]): Promise<ReviewResult[]>;
    private analyzeCode;
}
