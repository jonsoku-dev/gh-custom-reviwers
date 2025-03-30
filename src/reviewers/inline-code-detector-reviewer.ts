import { promises as fs } from 'fs';
import * as core from '@actions/core';
import { JSDOM } from 'jsdom';
import { BaseReviewer } from './base-reviewer';
import { ReviewResult } from '../types/reviewer';

interface InlineCodeResult {
    type: 'script' | 'style';
    lineNumber: number;
    code: string;
    size: number;
}

export default class InlineCodeDetectorReviewer extends BaseReviewer {
    protected readonly name = 'InlineCodeDetectorReviewer';
    private readonly inlineScriptThreshold: number;
    private readonly inlineStyleThreshold: number;

    constructor(options = {}) {
        super(options);
        this.inlineScriptThreshold = this._options.inlineScriptThreshold || 5;
        this.inlineStyleThreshold = this._options.inlineStyleThreshold || 10;
        this.logDebug('인라인 코드 검출기 초기화됨');
        this.logDebug(`인라인 스크립트 임계값: ${this.inlineScriptThreshold}줄`);
        this.logDebug(`인라인 스타일 임계값: ${this.inlineStyleThreshold}줄`);
    }

    async isEnabled(): Promise<boolean> {
        const enabled = this._options.enabled !== false;
        this.logDebug(`인라인 코드 검출기 활성화 상태: ${enabled}`);
        return enabled;
    }

    protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
        const content = await fs.readFile(filePath, 'utf8');
        this.logDebug(`파일 내용 로드됨: ${filePath}`);

        try {
            const inlineResults = this.detectInlineCode(content);
            this.logDebug(`검출된 인라인 코드 수: ${inlineResults.length}`);

            return inlineResults.map(result => {
                const threshold = result.type === 'script'
                    ? this.inlineScriptThreshold
                    : this.inlineStyleThreshold;

                const isTooLarge = result.size > threshold;
                const message = isTooLarge
                    ? `${result.size}줄의 인라인 ${result.type === 'script' ? '스크립트' : '스타일'}가 감지되었습니다. 외부 파일로 분리하는 것을 권장합니다.`
                    : `${result.size}줄의 인라인 ${result.type === 'script' ? '스크립트' : '스타일'}가 감지되었습니다.`;

                return {
                    file: filePath,
                    line: result.lineNumber,
                    message: message,
                    severity: isTooLarge ? 'warning' : 'info',
                    reviewer: this.name
                };
            });
        } catch (error) {
            if (error instanceof Error) {
                core.error(`인라인 코드 검출 중 오류 발생: ${error.message}`);
                this.logDebug(`스택 트레이스: ${error.stack}`);
            }
            return [];
        }
    }

    protected getDefaultFilePattern(): string {
        return "**/*.{html,htm}";
    }

    private detectInlineCode(html: string): InlineCodeResult[] {
        this.logDebug('인라인 코드 검출 시작...');

        try {
            // 라인 넘버를 찾기 위한 준비
            const lines = html.split('\n');
            const dom = new JSDOM(html);
            const document = dom.window.document;

            const results: InlineCodeResult[] = [];

            // 인라인 스크립트 검출
            const scripts = document.querySelectorAll('script:not([src])');
            scripts.forEach(script => {
                const scriptContent = script.textContent || '';
                if (scriptContent.trim()) {
                    const scriptLines = scriptContent.split('\n');
                    const lineNumber = this.findElementLineNumber(script.outerHTML, lines);

                    results.push({
                        type: 'script',
                        lineNumber,
                        code: scriptContent,
                        size: scriptLines.length
                    });
                }
            });

            // 인라인 스타일 검출
            const styles = document.querySelectorAll('style');
            styles.forEach(style => {
                const styleContent = style.textContent || '';
                if (styleContent.trim()) {
                    const styleLines = styleContent.split('\n');
                    const lineNumber = this.findElementLineNumber(style.outerHTML, lines);

                    results.push({
                        type: 'style',
                        lineNumber,
                        code: styleContent,
                        size: styleLines.length
                    });
                }
            });

            // style 속성 검출
            const elementsWithStyleAttr = document.querySelectorAll('[style]');
            elementsWithStyleAttr.forEach(element => {
                const styleAttr = element.getAttribute('style') || '';
                if (styleAttr.trim()) {
                    const lineNumber = this.findElementLineNumber(element.outerHTML, lines);

                    results.push({
                        type: 'style',
                        lineNumber,
                        code: styleAttr,
                        size: 1
                    });
                }
            });

            this.logDebug(`검출 완료: ${results.length}개의 인라인 코드 발견`);
            return results;
        } catch (error) {
            if (error instanceof Error) {
                this.logDebug(`인라인 코드 검출 중 오류: ${error.message}`);
            }
            throw error;
        }
    }

    private findElementLineNumber(elementHTML: string, lines: string[]): number {
        // 간단한 라인 넘버 찾기 (정확하지 않을 수 있음)
        const shortElement = elementHTML.split('\n')[0];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(shortElement)) {
                return i + 1;
            }
        }
        return 1;
    }
}