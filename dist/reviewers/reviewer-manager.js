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
exports.ReviewerManager = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class ReviewerManager {
    reviewers = new Map();
    options;
    resultsDir;
    constructor(options = {}) {
        this.options = options;
        this.resultsDir = path_1.default.join(this.options.workdir || '.', '.github', 'review-results');
    }
    registerReviewer(reviewer) {
        this.reviewers.set(reviewer.constructor.name, reviewer);
        if (this.options.debug) {
            console.log(`리뷰어 등록됨: ${reviewer.constructor.name}`);
        }
    }
    getReviewer(type) {
        return this.reviewers.get(type);
    }
    async runReviews() {
        if (this.options.debug) {
            console.log(`리뷰 실행 시작 (등록된 리뷰어: ${Array.from(this.reviewers.keys()).join(', ')})`);
            console.log(`전체 옵션: ${JSON.stringify({ ...this.options, apiKey: '***' }, null, 2)}`);
        }
        const results = [];
        for (const [name, reviewer] of this.reviewers.entries()) {
            try {
                const reviewerType = name.replace('Reviewer', '').toLowerCase();
                if (this.options.debug) {
                    console.log(`${name} 리뷰어 실행 시작`);
                }
                if (await reviewer.isEnabled()) {
                    if (this.options.debug) {
                        console.log(`${name} 리뷰어 실행 중...`);
                    }
                    const files = await this.getTargetFiles(name);
                    if (this.options.debug) {
                        console.log(`${name} 리뷰어가 검사할 파일 수: ${files.length}`);
                    }
                    const reviewResults = await reviewer.review(files);
                    for (const result of reviewResults) {
                        const message = `[${result.reviewer}] ${result.file}:${result.line} - ${result.message}`;
                        switch (result.severity) {
                            case 'error':
                                core.error(message);
                                break;
                            case 'warning':
                                core.warning(message);
                                break;
                            default:
                                core.notice(message);
                        }
                    }
                    results.push(...reviewResults);
                    if (this.options.debug) {
                        console.log(`${name} 리뷰어 완료 (발견된 문제: ${reviewResults.length}개)`);
                    }
                }
                else {
                    if (this.options.debug) {
                        console.log(`${name} 리뷰어가 비활성화되어 있어 건너뜁니다.`);
                    }
                }
            }
            catch (error) {
                core.error(`${name} 리뷰어 실행 중 오류 발생: ${error}`);
                if (this.options.debug && error instanceof Error) {
                    console.log(`스택 트레이스: ${error.stack}`);
                }
            }
        }
        await this.saveResults(results);
        await this.createActionsSummary(results);
        if (this.options.debug) {
            console.log(`모든 리뷰 완료. 총 ${results.length}개의 문제가 발견되었습니다.`);
        }
    }
    async createActionsSummary(results) {
        try {
            const groupedResults = this.groupResults(results);
            const severityCounts = groupedResults.reduce((counts, result) => {
                counts[result.severity] = (counts[result.severity] || 0) + 1;
                return counts;
            }, {});
            let summaryContent = '# 코드 품질 검사 결과\n\n';
            summaryContent += `총 ${groupedResults.length}개의 문제가 발견되었습니다.\n\n`;
            summaryContent += '## 심각도별 통계\n\n';
            Object.entries(severityCounts).forEach(([severity, count]) => {
                const icon = {
                    error: '🔴',
                    warning: '⚠️',
                    info: 'ℹ️'
                }[severity] || '';
                summaryContent += `${icon} **${severity}**: ${count}개\n`;
            });
            summaryContent += '\n---\n\n';
            const reviewerGroups = groupedResults.reduce((groups, result) => {
                if (!groups[result.reviewer]) {
                    groups[result.reviewer] = [];
                }
                groups[result.reviewer].push(result);
                return groups;
            }, {});
            for (const [reviewer, reviewerResults] of Object.entries(reviewerGroups)) {
                summaryContent += `## ${reviewer} (${reviewerResults.length}개)\n\n`;
                for (const result of reviewerResults) {
                    const severityIcon = {
                        error: '🔴',
                        warning: '⚠️',
                        info: 'ℹ️'
                    }[result.severity] || '';
                    summaryContent += `### ${severityIcon} \`${result.file}:${result.line}\`\n\n`;
                    const lines = result.message.split('\n');
                    let inCodeBlock = false;
                    let isCurrentCode = false;
                    let isImprovedCode = false;
                    let currentCodeBlock = '';
                    let improvedCodeBlock = '';
                    let codeLanguage = 'typescript';
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('```')) {
                            if (!inCodeBlock) {
                                inCodeBlock = true;
                                const langMatch = trimmedLine.match(/^```(\w+)/);
                                if (langMatch) {
                                    codeLanguage = langMatch[1];
                                }
                                isCurrentCode = lines[lines.indexOf(line) - 1]?.trim() === '현재 코드:';
                                isImprovedCode = lines[lines.indexOf(line) - 1]?.trim() === '개선된 코드:';
                                continue;
                            }
                            else {
                                inCodeBlock = false;
                                if (isCurrentCode) {
                                    currentCodeBlock = currentCodeBlock.trim();
                                }
                                else if (isImprovedCode) {
                                    improvedCodeBlock = improvedCodeBlock.trim();
                                }
                                continue;
                            }
                        }
                        if (inCodeBlock) {
                            if (isCurrentCode) {
                                currentCodeBlock += line + '\n';
                            }
                            else if (isImprovedCode) {
                                improvedCodeBlock += line + '\n';
                            }
                            else {
                                summaryContent += line + '\n';
                            }
                            continue;
                        }
                        if (trimmedLine) {
                            if (trimmedLine === '현재 코드:' || trimmedLine === '개선된 코드:') {
                                summaryContent += `#### ${trimmedLine}\n\n`;
                            }
                            else if (trimmedLine.startsWith('**')) {
                                summaryContent += trimmedLine + '\n\n';
                            }
                            else if (trimmedLine.startsWith('-')) {
                                summaryContent += trimmedLine + '\n';
                            }
                            else {
                                summaryContent += trimmedLine + '\n\n';
                            }
                        }
                    }
                    if (currentCodeBlock && improvedCodeBlock) {
                        summaryContent += '<details><summary>코드 변경사항 보기</summary>\n\n';
                        summaryContent += '#### 현재 코드\n\n';
                        summaryContent += `\`\`\`${codeLanguage}\n${currentCodeBlock}\`\`\`\n\n`;
                        summaryContent += '#### 개선된 코드\n\n';
                        summaryContent += `\`\`\`${codeLanguage}\n${improvedCodeBlock}\`\`\`\n\n`;
                        const changes = this.generateChangeSummary(currentCodeBlock, improvedCodeBlock);
                        if (changes) {
                            summaryContent += '#### 변경사항 요약\n\n' + changes + '\n';
                        }
                        summaryContent += '</details>\n\n';
                    }
                    summaryContent += '---\n\n';
                }
            }
            await core.summary
                .addRaw(summaryContent)
                .write();
        }
        catch (error) {
            core.error(`GitHub Actions 요약 생성 중 오류 발생: ${error}`);
        }
    }
    processCodeLine(line) {
        let processedLine = line;
        if (line.trim().startsWith('//')) {
            return `<span class="comment">${line}</span>`;
        }
        processedLine = processedLine.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="string">$1</span>');
        processedLine = processedLine.replace(/\b(\w+)\(/g, '<span class="function">$1</span>(');
        processedLine = processedLine.replace(/(const|let|var|function|class|interface|type|import|export|return|if|else|for|while|try|catch|async|await|new|this)\b/g, '<span class="keyword">$1</span>');
        return processedLine;
    }
    createCodeBlockWithLineNumbers(code, language, startLine) {
        const lines = code.split('\n');
        const numberedLines = lines.map((line, index) => {
            const lineNumber = startLine + index;
            const processedLine = this.processCodeLine(line);
            return `<div class="code-line"><span class="line-number">${lineNumber}</span>${processedLine}</div>`;
        });
        return numberedLines.join('\n');
    }
    generateChangeSummary(currentCode, improvedCode) {
        const currentLines = currentCode.split('\n');
        const improvedLines = improvedCode.split('\n');
        let summary = '';
        const addedLines = improvedLines.filter(line => !currentLines.includes(line));
        const removedLines = currentLines.filter(line => !improvedLines.includes(line));
        if (addedLines.length > 0) {
            summary += '**추가된 내용:**\n\n';
            addedLines.forEach(line => {
                summary += `- ✨ \`${line.trim()}\`\n`;
            });
            summary += '\n';
        }
        if (removedLines.length > 0) {
            summary += '**제거된 내용:**\n\n';
            removedLines.forEach(line => {
                summary += `- 🗑️ \`${line.trim()}\`\n`;
            });
            summary += '\n';
        }
        return summary;
    }
    groupResults(results) {
        const grouped = [];
        let currentGroup = null;
        for (const result of results) {
            if (result.message.startsWith('```') || result.message.startsWith('-') || result.message.startsWith('**')) {
                if (currentGroup) {
                    currentGroup.message += '\n' + result.message;
                }
                continue;
            }
            if (!currentGroup ||
                currentGroup.file !== result.file ||
                currentGroup.severity !== result.severity ||
                currentGroup.reviewer !== result.reviewer) {
                if (currentGroup) {
                    grouped.push(currentGroup);
                }
                currentGroup = { ...result };
            }
            else {
                currentGroup.message += '\n' + result.message;
            }
        }
        if (currentGroup) {
            grouped.push(currentGroup);
        }
        return grouped;
    }
    formatMessage(message) {
        return message;
    }
    async getTargetFiles(reviewerName) {
        const workdir = this.options.workdir || '.';
        const reviewer = this.reviewers.get(reviewerName);
        if (!reviewer) {
            return [];
        }
        try {
            const allFiles = await fs_1.promises.readdir(workdir);
            return allFiles.filter(file => {
                const isSourceFile = file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx');
                const matchesPattern = !this.options.filePatterns?.length ||
                    this.options.filePatterns.some(pattern => file.match(pattern));
                const isExcluded = this.options.excludePatterns?.some(pattern => file.match(pattern));
                return isSourceFile && matchesPattern && !isExcluded;
            });
        }
        catch (error) {
            core.error(`파일 목록 생성 중 오류 발생: ${error}`);
            return [];
        }
    }
    async getResults() {
        try {
            const resultsFile = path_1.default.join(this.resultsDir, 'review-results.json');
            const content = await fs_1.promises.readFile(resultsFile, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            core.error(`결과 읽기 중 오류 발생: ${error}`);
            return [];
        }
    }
    async saveResults(results) {
        try {
            await fs_1.promises.mkdir(this.resultsDir, { recursive: true });
            const resultsFile = path_1.default.join(this.resultsDir, 'review-results.json');
            let existingResults = [];
            try {
                const content = await fs_1.promises.readFile(resultsFile, 'utf8');
                existingResults = JSON.parse(content);
                if (this.options.debug) {
                    console.log(`기존 리뷰 결과 ${existingResults.length}개를 불러왔습니다.`);
                }
            }
            catch (error) {
                if (this.options.debug) {
                    console.log('기존 리뷰 결과 파일이 없습니다. 새로 생성합니다.');
                }
            }
            const timestamp = new Date().toISOString();
            const newResults = results.map(result => ({
                ...result,
                timestamp,
            }));
            const updatedResults = [...existingResults, ...newResults];
            await fs_1.promises.writeFile(resultsFile, JSON.stringify(updatedResults, null, 2));
            if (this.options.debug) {
                console.log(`리뷰 결과가 ${resultsFile}에 저장되었습니다. (총 ${updatedResults.length}개)`);
            }
            const summary = await this.generateSummary(updatedResults);
            const summaryFile = path_1.default.join(this.resultsDir, 'review-summary.md');
            await fs_1.promises.writeFile(summaryFile, summary);
            if (this.options.debug) {
                console.log(`리뷰 요약이 ${summaryFile}에 저장되었습니다.`);
            }
        }
        catch (error) {
            core.error(`결과 저장 중 오류 발생: ${error}`);
        }
    }
    async generateSummary(results) {
        let summary = '# 코드 품질 검사 결과 요약\n\n';
        const dateGroups = results.reduce((groups, result) => {
            const date = result.timestamp?.split('T')[0] || '날짜 없음';
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(result);
            return groups;
        }, {});
        const sortedDates = Object.keys(dateGroups).sort().reverse();
        for (const date of sortedDates) {
            const dateResults = dateGroups[date];
            summary += `## ${date} 검사 결과\n\n`;
            summary += `총 ${dateResults.length}개의 문제가 발견되었습니다.\n\n`;
            const reviewerGroups = dateResults.reduce((groups, result) => {
                const reviewer = result.reviewer;
                if (!groups[reviewer]) {
                    groups[reviewer] = [];
                }
                groups[reviewer].push(result);
                return groups;
            }, {});
            for (const [reviewer, reviewerResults] of Object.entries(reviewerGroups)) {
                summary += `### ${reviewer}\n`;
                summary += `- 발견된 문제: ${reviewerResults.length}개\n\n`;
                const severityCounts = reviewerResults.reduce((counts, result) => {
                    counts[result.severity] = (counts[result.severity] || 0) + 1;
                    return counts;
                }, {});
                summary += '#### 심각도별 통계\n';
                for (const [severity, count] of Object.entries(severityCounts)) {
                    summary += `- ${severity}: ${count}개\n`;
                }
                summary += '\n';
                const fileGroups = reviewerResults.reduce((groups, result) => {
                    if (!groups[result.file]) {
                        groups[result.file] = [];
                    }
                    groups[result.file].push(result);
                    return groups;
                }, {});
                for (const [file, fileResults] of Object.entries(fileGroups)) {
                    summary += `#### ${file}\n\n`;
                    for (const result of fileResults) {
                        const severityIcon = {
                            error: '🔴',
                            warning: '⚠️',
                            info: 'ℹ️'
                        }[result.severity] || '';
                        summary += `${severityIcon} **${result.severity.toUpperCase()}** - ${result.message} (라인 ${result.line})\n`;
                    }
                    summary += '\n';
                }
            }
            summary += '---\n\n';
        }
        return summary;
    }
}
exports.ReviewerManager = ReviewerManager;
