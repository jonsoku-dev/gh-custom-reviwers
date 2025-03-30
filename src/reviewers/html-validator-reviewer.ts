import { promises as fs } from 'fs';
import * as core from '@actions/core';
import fetch from 'node-fetch';
import { BaseReviewer } from './base-reviewer';
import { ReviewResult } from '../types/reviewer';

interface W3CValidationMessage {
    type: string;
    lastLine: number;
    lastColumn: number;
    firstColumn: number;
    message: string;
    extract: string;
    hiliteStart: number;
    hiliteLength: number;
}

interface W3CValidationResponse {
    messages: W3CValidationMessage[];
}

export default class HTMLValidatorReviewer extends BaseReviewer {
    protected readonly name = 'HTMLValidatorReviewer';
    private readonly validatorUrl: string;

    constructor(options = {}) {
        super(options);
        this.validatorUrl = this._options.validatorUrl || 'https://validator.w3.org/nu/';
        this.logDebug('HTML 검증기 초기화됨');
        this.logDebug(`검증기 URL: ${this.validatorUrl}`);
    }

    async isEnabled(): Promise<boolean> {
        const enabled = this._options.enabled !== false;
        this.logDebug(`HTML 검증기 활성화 상태: ${enabled}`);
        return enabled;
    }

    protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
        const content = await fs.readFile(filePath, 'utf8');
        this.logDebug(`파일 내용 로드됨: ${filePath}`);

        try {
            const validationResults = await this.validateHTML(content);
            this.logDebug(`검증 결과 수: ${validationResults.length}`);

            return validationResults.map(result => ({
                file: filePath,
                line: result.lastLine || 1,
                message: `${result.type}: ${result.message}`,
                severity: result.type === 'error' ? 'error' : 'warning',
                reviewer: this.name
            }));
        } catch (error) {
            if (error instanceof Error) {
                core.error(`HTML 검증 중 오류 발생: ${error.message}`);
                this.logDebug(`스택 트레이스: ${error.stack}`);
            }
            return [];
        }
    }

    protected getDefaultFilePattern(): string {
        return "**/*.{html,htm}";
    }

    private async validateHTML(html: string): Promise<W3CValidationMessage[]> {
        this.logDebug('W3C 검증 API 호출 중...');

        try {
            if (this._options.useMockApi) {
                this.logDebug('Mock W3C 검증 사용 중');
                return this.getMockValidationResults();
            }

            const response = await fetch(this.validatorUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Accept': 'application/json'
                },
                body: html
            });

            if (!response.ok) {
                throw new Error(`W3C 검증 API 오류: ${response.status} ${response.statusText}`);
            }

            const validationResult = await response.json() as W3CValidationResponse;
            this.logDebug(`W3C 검증 완료: ${validationResult.messages.length}개의 메시지`);

            return validationResult.messages;
        } catch (error) {
            if (error instanceof Error) {
                this.logDebug(`W3C 검증 API 호출 중 오류: ${error.message}`);
            }
            throw error;
        }
    }

    private getMockValidationResults(): W3CValidationMessage[] {
        // 테스트용 Mock 검증 결과
        return [
            {
                type: 'error',
                lastLine: 10,
                lastColumn: 7,
                firstColumn: 5,
                message: '닫는 태그가 누락되었습니다: </div>',
                extract: '<div>\n  <p>콘텐츠</p>\n',
                hiliteStart: 0,
                hiliteLength: 5
            },
            {
                type: 'warning',
                lastLine: 15,
                lastColumn: 22,
                firstColumn: 5,
                message: '속성 "alt"가 "img" 요소에 필요합니다',
                extract: '<img src="image.jpg">',
                hiliteStart: 0,
                hiliteLength: 22
            }
        ];
    }
}