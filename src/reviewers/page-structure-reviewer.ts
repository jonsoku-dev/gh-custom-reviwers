import { promises as fs } from 'fs';
import * as core from '@actions/core';
import { JSDOM } from 'jsdom';
import { BaseReviewer } from './base-reviewer';
import { ReviewResult } from '../types/reviewer';

interface StructureIssue {
    type: string;
    message: string;
    element: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
}

export default class PageStructureReviewer extends BaseReviewer {
    protected readonly name = 'PageStructureReviewer';
    private readonly strictHeadingOrder: boolean;
    private readonly requireSemanticTags: boolean;
    private readonly checkMetaTags: boolean;

    constructor(options = {}) {
        super(options);
        this.strictHeadingOrder = this._options.strictHeadingOrder === true;
        this.requireSemanticTags = this._options.requireSemanticTags === true;
        this.checkMetaTags = this._options.checkMetaTags !== false;

        this.logDebug('페이지 구조 분석기 초기화됨');
        this.logDebug(`엄격한 헤딩 순서 검사: ${this.strictHeadingOrder}`);
        this.logDebug(`필수 시맨틱 태그 검사: ${this.requireSemanticTags}`);
        this.logDebug(`메타 태그 검사: ${this.checkMetaTags}`);
    }

    async isEnabled(): Promise<boolean> {
        const enabled = this._options.enabled !== false;
        this.logDebug(`페이지 구조 분석기 활성화 상태: ${enabled}`);
        return enabled;
    }

    protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
        const content = await fs.readFile(filePath, 'utf8');
        this.logDebug(`파일 내용 로드됨: ${filePath}`);

        try {
            const structureIssues = this.analyzePageStructure(content);
            this.logDebug(`구조 이슈 수: ${structureIssues.length}`);

            return structureIssues.map(issue => ({
                file: filePath,
                line: issue.line,
                message: `${issue.type}: ${issue.message} (${issue.element})`,
                severity: issue.severity,
                reviewer: this.name
            }));
        } catch (error) {
            if (error instanceof Error) {
                core.error(`페이지 구조 분석 중 오류 발생: ${error.message}`);
                this.logDebug(`스택 트레이스: ${error.stack}`);
            }
            return [];
        }
    }

    protected getDefaultFilePattern(): string {
        return "**/*.{html,htm}";
    }

    private analyzePageStructure(html: string): StructureIssue[] {
        this.logDebug('페이지 구조 분석 시작...');

        try {
            const lines = html.split('\n');
            const dom = new JSDOM(html);
            const document = dom.window.document;

            const issues: StructureIssue[] = [];

            // 1. 기본 구조 확인
            this.validateBasicStructure(document, lines, issues);

            // 2. 헤딩 구조 확인
            this.validateHeadingStructure(document, lines, issues);

            // 3. 시맨틱 태그 사용 확인
            this.validateSemanticTags(document, lines, issues);

            // 4. 중첩 구조 확인
            this.validateNesting(document, lines, issues);

            // 5. 메타 정보 확인
            if (this.checkMetaTags) {
                this.validateMetaInfo(document, lines, issues);
            }

            this.logDebug(`구조 분석 완료: ${issues.length}개의 이슈 발견`);
            return issues;
        } catch (error) {
            if (error instanceof Error) {
                this.logDebug(`페이지 구조 분석 중 오류: ${error.message}`);
            }
            throw error;
        }
    }

    private validateBasicStructure(document: Document, lines: string[], issues: StructureIssue[]): void {
        // DOCTYPE 확인
        if (!document.doctype) {
            issues.push({
                type: '기본 구조',
                message: 'DOCTYPE 선언이 누락되었습니다',
                element: '<!DOCTYPE html>',
                line: 1,
                severity: 'warning'
            });
        }

        // html 태그의 lang 속성 확인
        const htmlElement = document.documentElement;
        if (!htmlElement.hasAttribute('lang')) {
            issues.push({
                type: '기본 구조',
                message: 'html 태그에 lang 속성이 누락되었습니다',
                element: '<html>',
                line: this.findElementLineNumber('<html', lines),
                severity: 'warning'
            });
        }

        // head 태그 확인
        if (!document.head) {
            issues.push({
                type: '기본 구조',
                message: 'head 태그가 누락되었습니다',
                element: '<head>',
                line: 1,
                severity: 'error'
            });
        }

        // title 태그 확인
        if (!document.querySelector('title')) {
            issues.push({
                type: '기본 구조',
                message: 'title 태그가 누락되었습니다',
                element: '<title>',
                line: document.head ? this.findElementLineNumber('<head', lines) : 1,
                severity: 'error'
            });
        }

        // body 태그 확인
        if (!document.body) {
            issues.push({
                type: '기본 구조',
                message: 'body 태그가 누락되었습니다',
                element: '<body>',
                line: 1,
                severity: 'error'
            });
        }
    }

    private validateHeadingStructure(document: Document, lines: string[], issues: StructureIssue[]): void {
        // h1 확인
        const h1Elements = document.querySelectorAll('h1');
        if (h1Elements.length === 0) {
            issues.push({
                type: '헤딩 구조',
                message: '문서에 h1 태그가 없습니다. 주요 제목을 나타내는 h1이 있어야 합니다',
                element: '<h1>',
                line: 1,
                severity: 'warning'
            });
        } else if (h1Elements.length > 1) {
            issues.push({
                type: '헤딩 구조',
                message: '문서에 h1 태그가 여러 개 있습니다. h1은 일반적으로 페이지당 하나만 사용해야 합니다',
                element: '<h1>',
                line: this.findElementLineNumber('<h1', lines),
                severity: 'warning'
            });
        }

        // 헤딩 순서 확인
        if (this.strictHeadingOrder) {
            let previousLevel = 0;
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));

            for (const heading of headings) {
                const currentLevel = parseInt(heading.tagName.substring(1), 10);
                const lineNumber = this.findElementLineNumber(`<${heading.tagName.toLowerCase()}`, lines);

                if (previousLevel > 0 && currentLevel > previousLevel + 1) {
                    issues.push({
                        type: '헤딩 구조',
                        message: `헤딩 순서가 올바르지 않습니다. h${previousLevel} 다음에 h${currentLevel}가 있습니다`,
                        element: `<${heading.tagName.toLowerCase()}>`,
                        line: lineNumber,
                        severity: 'warning'
                    });
                }

                previousLevel = currentLevel;
            }
        }
    }

    private validateSemanticTags(document: Document, lines: string[], issues: StructureIssue[]): void {
        // 시맨틱 태그 사용 검사
        const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
        const usedSemanticTags = semanticTags.filter(tag => document.querySelector(tag));

        if (usedSemanticTags.length === 0) {
            const severity = this.requireSemanticTags ? 'warning' : 'info';
            issues.push({
                type: '시맨틱 구조',
                message: '시맨틱 태그가 사용되지 않았습니다. 웹 접근성과 SEO를 위해 시맨틱 태그 사용을 권장합니다',
                element: 'header, nav, main, section, article, aside, footer',
                line: 1,
                severity
            });
        }

        // div 태그만 많이 사용하는 경우
        const divCount = document.querySelectorAll('div').length;
        if (divCount > 10 && usedSemanticTags.length < 3) {
            issues.push({
                type: '시맨틱 구조',
                message: `div 태그가 많이 사용되었습니다(${divCount}개). 적절한 시맨틱 태그로 대체하는 것을 고려하세요`,
                element: '<div>',
                line: this.findElementLineNumber('<div', lines),
                severity: 'info'
            });
        }

        // main 태그 확인
        const mainElements = document.querySelectorAll('main');
        if (mainElements.length === 0 && this.requireSemanticTags) {
            issues.push({
                type: '시맨틱 구조',
                message: 'main 태그가 없습니다. 주요 콘텐츠를 나타내기 위해 main 태그 사용을 권장합니다',
                element: '<main>',
                line: 1,
                severity: 'warning'
            });
        } else if (mainElements.length > 1) {
            issues.push({
                type: '시맨틱 구조',
                message: 'main 태그가 여러 개 있습니다. main 태그는 페이지당 하나만 사용해야 합니다',
                element: '<main>',
                line: this.findElementLineNumber('<main', lines),
                severity: 'error'
            });
        }
    }

    private validateNesting(document: Document, lines: string[], issues: StructureIssue[]): void {
        // 버튼 안에 버튼이 있는지 확인
        const nestedButtons = Array.from(document.querySelectorAll('button button, button a, a button'));
        for (const element of nestedButtons) {
            issues.push({
                type: '중첩 구조',
                message: '버튼 또는 링크가 다른 버튼이나 링크 안에 중첩되어 있습니다',
                element: element.outerHTML.substring(0, 50) + '...',
                line: this.findElementLineNumber(element.outerHTML.substring(0, 20), lines),
                severity: 'error'
            });
        }

        // 헤딩 태그 안에 헤딩 태그가 있는지 확인
        const nestedHeadings = Array.from(document.querySelectorAll('h1 h1, h1 h2, h1 h3, h2 h1, h2 h2, h3 h1'));
        for (const element of nestedHeadings) {
            issues.push({
                type: '중첩 구조',
                message: '헤딩 태그가 다른 헤딩 태그 안에 중첩되어 있습니다',
                element: element.outerHTML.substring(0, 50) + '...',
                line: this.findElementLineNumber(element.outerHTML.substring(0, 20), lines),
                severity: 'error'
            });
        }

        // 리스트 구조 확인
        const listItems = document.querySelectorAll('li');
        for (const li of Array.from(listItems)) {
            if (!li.parentElement || (li.parentElement.tagName !== 'UL' && li.parentElement.tagName !== 'OL')) {
                issues.push({
                    type: '중첩 구조',
                    message: 'li 태그는 ul 또는 ol 태그 안에 있어야 합니다',
                    element: li.outerHTML.substring(0, 50) + '...',
                    line: this.findElementLineNumber(li.outerHTML.substring(0, 20), lines),
                    severity: 'error'
                });
            }
        }
    }

    private validateMetaInfo(document: Document, lines: string[], issues: StructureIssue[]): void {
        // meta viewport 확인
        if (!document.querySelector('meta[name="viewport"]')) {
            issues.push({
                type: '메타 정보',
                message: 'viewport 메타 태그가 누락되었습니다. 반응형 웹을 위해 필요합니다',
                element: '<meta name="viewport" content="width=device-width, initial-scale=1">',
                line: document.head ? this.findElementLineNumber('<head', lines) : 1,
                severity: 'warning'
            });
        }

        // meta charset 확인
        if (!document.querySelector('meta[charset]')) {
            issues.push({
                type: '메타 정보',
                message: 'charset 메타 태그가 누락되었습니다. 문자 인코딩을 지정하기 위해 필요합니다',
                element: '<meta charset="UTF-8">',
                line: document.head ? this.findElementLineNumber('<head', lines) : 1,
                severity: 'warning'
            });
        }

        // meta description 확인
        if (!document.querySelector('meta[name="description"]')) {
            issues.push({
                type: '메타 정보',
                message: 'description 메타 태그가 누락되었습니다. SEO를 위해 권장됩니다',
                element: '<meta name="description" content="...">',
                line: document.head ? this.findElementLineNumber('<head', lines) : 1,
                severity: 'info'
            });
        }
    }

    private findElementLineNumber(elementStart: string, lines: string[]): number {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(elementStart)) {
                return i + 1;
            }
        }
        return 1;
    }
}