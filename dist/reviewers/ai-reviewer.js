"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const fsSync = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
class AIReviewer {
    openai;
    _options;
    name = 'AIReviewer';
    constructor(options = {}) {
        this._options = options;
        if (this._options.debug) {
            console.log('AI 리뷰어 생성자 호출됨');
            console.log('AI 리뷰어 초기 옵션:');
            console.log(JSON.stringify({ ...this._options, apiKey: this._options.apiKey ? '***' : undefined }, null, 2));
        }
        this.initializeOpenAI();
    }
    initializeOpenAI() {
        if (this._options.debug) {
            console.log('AI 리뷰어 OpenAI 초기화 시작');
        }
        if (!this._options.apiKey) {
            const error = new Error('OpenAI API 키가 설정되지 않았습니다.');
            core.error(error.message);
            throw error;
        }
        try {
            this.openai = new openai_1.default({ apiKey: this._options.apiKey });
            if (this._options.debug) {
                console.log('OpenAI 클라이언트가 성공적으로 초기화되었습니다.');
                console.log('AI 리뷰어 초기화됨');
                const debugConfig = { ...this._options, apiKey: '***' };
                console.log(`설정: ${JSON.stringify(debugConfig, null, 2)}`);
            }
        }
        catch (error) {
            core.error('OpenAI 클라이언트 초기화 중 오류 발생');
            throw error;
        }
    }
    get options() {
        return this._options;
    }
    set options(newOptions) {
        this._options = newOptions;
        if (this._options.debug) {
            console.log('AI 리뷰어 옵션 업데이트 시작');
            console.log('AI 리뷰어 옵션이 업데이트되었습니다.');
            const debugConfig = { ...this._options, apiKey: '***' };
            console.log(`새 설정: ${JSON.stringify(debugConfig, null, 2)}`);
            console.log('AI 리뷰어 옵션 업데이트 완료');
        }
        this.initializeOpenAI();
    }
    async isEnabled() {
        const enabled = this._options.enabled !== false && !!this._options.apiKey;
        if (this._options.debug) {
            console.log(`AI 리뷰어 활성화 상태: ${enabled}`);
        }
        return enabled;
    }
    async review(files) {
        const results = [];
        const workdir = this._options.workdir || '.';
        if (this._options.debug) {
            console.log(`검토할 작업 디렉토리: ${workdir}`);
            console.log(`검토할 파일 목록: ${JSON.stringify(files, null, 2)}`);
        }
        const targetFiles = files.length > 0 ? files : fsSync.readdirSync(workdir)
            .filter(file => {
            const isTargetFile = file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx');
            const matchesPattern = !this._options.filePatterns?.length ||
                this._options.filePatterns.some(pattern => file.match(pattern));
            const isExcluded = this._options.excludePatterns?.some(pattern => file.match(pattern));
            return isTargetFile && matchesPattern && !isExcluded;
        });
        if (this._options.debug) {
            console.log(`필터링된 대상 파일: ${JSON.stringify(targetFiles, null, 2)}`);
        }
        for (const file of targetFiles) {
            try {
                const filePath = path_1.default.join(workdir, file);
                if (this._options.debug) {
                    console.log(`파일 분석 시작: ${filePath}`);
                }
                const content = await fs_1.promises.readFile(filePath, 'utf8');
                const suggestions = await this.analyzeCode(content);
                if (this._options.debug) {
                    console.log(`파일 ${filePath}에 대한 제안사항:`);
                    suggestions.forEach((suggestion, index) => {
                        console.log(`  ${index + 1}. ${suggestion}`);
                    });
                }
                suggestions.forEach((suggestion, index) => {
                    results.push({
                        file: filePath,
                        line: 1,
                        message: suggestion,
                        severity: 'info',
                        reviewer: this.name
                    });
                });
            }
            catch (error) {
                core.warning(`파일 분석 중 오류 발생 (${file}): ${error}`);
                if (this._options.debug && error instanceof Error) {
                    console.log(`스택 트레이스: ${error.stack}`);
                }
            }
        }
        if (this._options.debug) {
            console.log(`총 ${results.length}개의 리뷰 결과가 생성되었습니다.`);
        }
        return results;
    }
    async analyzeCode(code) {
        try {
            if (this._options.debug) {
                console.log('OpenAI API 호출 시작...');
                console.log(`사용 모델: ${this._options.model || 'gpt-4o'}`);
                console.log(`사용 언어: ${this._options.language || 'ko'}`);
            }
            const response = await this.openai.chat.completions.create({
                model: this._options.model || 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: '당신은 전문적인 코드 리뷰어입니다. 코드의 품질, 가독성, 성능, 보안 측면에서 개선사항을 제안해주세요.'
                    },
                    {
                        role: 'system',
                        content: `리스폰스 언어: ${this._options.language || 'ko'}`
                    },
                    {
                        role: 'user',
                        content: `다음 코드를 리뷰하고 개선사항을 제안해주세요:\n\n${code}`
                    },
                ],
                max_tokens: this._options.maxTokens || 1000,
                temperature: this._options.temperature || 0.7,
            });
            const suggestions = response.choices[0].message.content
                ?.split('\n')
                .filter(line => line.trim().length > 0)
                .map(line => line.replace(/^[0-9]+\.\s*/, '')) || [];
            if (this._options.debug) {
                console.log('OpenAI API 응답 받음');
                console.log(`원본 응답: ${response.choices[0].message.content}`);
                console.log(`처리된 제안사항 수: ${suggestions.length}`);
            }
            return suggestions;
        }
        catch (error) {
            if (error instanceof Error) {
                core.error(error.message);
                if (this._options.debug) {
                    console.log(`OpenAI API 오류 상세: ${error.stack}`);
                }
            }
            else {
                core.error('OpenAI API 호출 중 알 수 없는 오류가 발생했습니다.');
            }
            return [];
        }
    }
}
exports.default = AIReviewer;
