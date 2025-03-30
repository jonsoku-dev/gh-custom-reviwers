import { promises as fs } from 'fs';
import * as core from '@actions/core';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { BaseReviewer } from './base-reviewer';
import { ReviewResult } from '../types/reviewer';

interface ImageInfo {
    src: string;
    width: number | null;
    height: number | null;
    alt: string | null;
    size: number;
    type: string;
    lineNumber: number;
}

export default class ImageOptimizerReviewer extends BaseReviewer {
    protected readonly name = 'ImageOptimizerReviewer';
    private readonly sizeThreshold: number;
    private readonly dimensionThreshold: number;
    private readonly checkWebpConversion: boolean;

    constructor(options = {}) {
        super(options);
        this.sizeThreshold = this._options.sizeThreshold || 200 * 1024; // 기본값 200KB
        this.dimensionThreshold = this._options.dimensionThreshold || 1000; // 기본값 1000px
        this.checkWebpConversion = this._options.checkWebpConversion !== false; // 기본적으로 활성화

        this.logDebug('이미지 최적화 검사기 초기화됨');
        this.logDebug(`이미지 크기 임계값: ${Math.round(this.sizeThreshold / 1024)}KB`);
        this.logDebug(`이미지 차원 임계값: ${this.dimensionThreshold}px`);
        this.logDebug(`WebP 변환 검사: ${this.checkWebpConversion}`);
    }

    async isEnabled(): Promise<boolean> {
        const enabled = this._options.enabled !== false;
        this.logDebug(`이미지 최적화 검사기 활성화 상태: ${enabled}`);
        return enabled;
    }

    protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
        if (this.isImageFile(filePath)) {
            return await this.reviewImageFile(filePath);
        } else if (this.isHtmlFile(filePath)) {
            return await this.reviewHtmlFile(filePath);
        }

        return [];
    }

    protected getDefaultFilePattern(): string {
        return "**/*.{html,htm,jpg,jpeg,png,gif,webp,svg}";
    }

    private isImageFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    }

    private isHtmlFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.html', '.htm'].includes(ext);
    }

    private async reviewImageFile(filePath: string): Promise<ReviewResult[]> {
        try {
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;
            const ext = path.extname(filePath).toLowerCase();

            const results: ReviewResult[] = [];

            // 이미지 파일 크기 검사
            if (fileSize > this.sizeThreshold) {
                results.push({
                    file: filePath,
                    line: 1,
                    message: `이미지 파일 크기가 ${Math.round(fileSize / 1024)}KB로 권장 크기(${Math.round(this.sizeThreshold / 1024)}KB)를 초과합니다. 최적화를 고려하세요.`,
                    severity: 'warning',
                    reviewer: this.name
                });
            }

            // SVG 파일의 경우 최적화 제안
            if (ext === '.svg') {
                const content = await fs.readFile(filePath, 'utf8');
                if (content.includes('<?xml') || content.includes('<!DOCTYPE')) {
                    results.push({
                        file: filePath,
                        line: 1,
                        message: 'SVG 파일에서 XML 선언이나 DOCTYPE이 발견되었습니다. 파일 크기를 줄이기 위해 제거를 고려하세요.',
                        severity: 'info',
                        reviewer: this.name
                    });
                }
            }

            // JPEG 또는 PNG 포맷인 경우 WebP 변환 제안
            if (this.checkWebpConversion && ['.jpg', '.jpeg', '.png'].includes(ext)) {
                results.push({
                    file: filePath,
                    line: 1,
                    message: `${ext.substring(1).toUpperCase()} 이미지를 WebP 형식으로 변환하면 파일 크기를 줄일 수 있습니다.`,
                    severity: 'info',
                    reviewer: this.name
                });
            }

            return results;
        } catch (error) {
            if (error instanceof Error) {
                core.error(`이미지 파일 검사 중 오류 발생: ${error.message}`);
                this.logDebug(`스택 트레이스: ${error.stack}`);
            }
            return [];
        }
    }

    private async reviewHtmlFile(filePath: string): Promise<ReviewResult[]> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            const dom = new JSDOM(content);
            const document = dom.window.document;

            const images = document.querySelectorAll('img');
            const results: ReviewResult[] = [];

            for (const img of Array.from(images)) {
                const src = img.getAttribute('src') || '';
                const width = img.hasAttribute('width') ? parseInt(img.getAttribute('width') || '0', 10) : null;
                const height = img.hasAttribute('height') ? parseInt(img.getAttribute('height') || '0', 10) : null;
                const alt = img.getAttribute('alt');
                const lineNumber = this.findElementLineNumber(img.outerHTML, lines);

                // 이미지 속성 검사

                // alt 속성 확인
                if (!alt) {
                    results.push({
                        file: filePath,
                        line: lineNumber,
                        message: `이미지에 alt 속성이 없습니다: ${src}`,
                        severity: 'warning',
                        reviewer: this.name
                    });
                }

                // width/height 속성 확인
                if (width === null || height === null) {
                    results.push({
                        file: filePath,
                        line: lineNumber,
                        message: `이미지에 width 또는 height 속성이 없습니다: ${src}. CLS 방지를 위해 명시적 크기를 설정하세요.`,
                        severity: 'info',
                        reviewer: this.name
                    });
                }

                // 큰 차원 확인
                if ((width && width > this.dimensionThreshold) || (height && height > this.dimensionThreshold)) {
                    results.push({
                        file: filePath,
                        line: lineNumber,
                        message: `이미지 크기가 너무 큽니다: ${src} (${width}x${height}). 최적화를 고려하세요.`,
                        severity: 'warning',
                        reviewer: this.name
                    });
                }

                // loading 속성 확인
                if (!img.hasAttribute('loading')) {
                    results.push({
                        file: filePath,
                        line: lineNumber,
                        message: `이미지에 loading 속성이 없습니다: ${src}. 성능 향상을 위해 loading="lazy"를 고려하세요.`,
                        severity: 'info',
                        reviewer: this.name
                    });
                }

                // srcset 사용 제안
                if (!img.hasAttribute('srcset')) {
                    results.push({
                        file: filePath,
                        line: lineNumber,
                        message: `이미지에 srcset 속성이 없습니다: ${src}. 반응형 이미지를 위해 srcset 사용을 고려하세요.`,
                        severity: 'info',
                        reviewer: this.name
                    });
                }
            }

            return results;
        } catch (error) {
            if (error instanceof Error) {
                core.error(`HTML 파일 내 이미지 검사 중 오류 발생: ${error.message}`);
                this.logDebug(`스택 트레이스: ${error.stack}`);
            }
            return [];
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