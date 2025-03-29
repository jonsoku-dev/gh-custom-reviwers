"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewer = void 0;
const ai_reviewer_1 = __importDefault(require("./ai-reviewer"));
const createReviewer = (type, env) => {
    console.log(env, '[createReviewer] env');
    switch (type) {
        case 'ai':
            return new ai_reviewer_1.default({
                debug: env?.DEBUG === 'true',
                enabled: env?.AI_REVIEWER_ENABLED === 'true',
                apiKey: env?.AI_REVIEWER_API_KEY || 'API_KEY 없음',
                language: env?.AI_REVIEWER_LANGUAGE,
                model: env?.AI_REVIEWER_MODEL,
                maxTokens: parseInt(env?.AI_REVIEWER_MAX_TOKENS || '1000'),
                temperature: parseFloat(env?.AI_REVIEWER_TEMPERATURE || '0.7'),
                filePatterns: env?.AI_REVIEWER_FILE_PATTERNS?.split(','),
                excludePatterns: env?.AI_REVIEWER_EXCLUDE_PATTERNS?.split(','),
                workdir: env?.WORKSPACE_PATH || '.'
            });
        default:
            return null;
    }
};
exports.createReviewer = createReviewer;
