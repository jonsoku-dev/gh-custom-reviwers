import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseReviewer } from './base-reviewer';
import { promises as fs } from 'fs';
import path from 'path';
import * as glob from 'glob';
import { ReviewResult } from '../types/reviewer';

// 테스트를 위한 구체적인 구현체
class TestReviewer extends BaseReviewer {
    protected readonly name = 'TestReviewer';
    private enabled = true;

    async isEnabled(): Promise<boolean> {
        return this.enabled;
    }

    setEnabled(value: boolean) {
        this.enabled = value;
    }

    protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
        return [{
            file: filePath,
            line: 1,
            message: '테스트 리뷰 결과',
            severity: 'info',
            reviewer: this.name
        }];
    }

    protected getDefaultFilePattern(): string {
        return "**/*.test";
    }
}

const mockGlobSync = vi.hoisted(() => vi.fn());

vi.mock('glob', () => ({
    sync: mockGlobSync
}));

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
}));

describe('BaseReviewer', () => {
    let reviewer: TestReviewer;

    beforeEach(() => {
        vi.clearAllMocks();
        reviewer = new TestReviewer({ debug: true });
        
        mockGlobSync.mockImplementation((pattern) => {
            if (pattern === '**/*.test') {
                return ['example.test'];
            } else if (pattern === '**/node_modules/**' || pattern === '**/dist/**') {
                return [];
            }
            return [];
        });
    });

    describe('옵션 관리', () => {
        it('생성자에서 전달된 옵션이 올바르게 설정되어야 함', () => {
            const options = { debug: true, workdir: '/test' };
            const reviewer = new TestReviewer(options);
            expect(reviewer.options).toEqual(options);
        });

        it('options setter로 옵션을 업데이트할 수 있어야 함', () => {
            const newOptions = { debug: false, workdir: '/new-test' };
            reviewer.options = newOptions;
            expect(reviewer.options).toEqual(newOptions);
        });
    });

    describe('파일 패턴 처리', () => {
        it('기본 파일 패턴을 사용해야 함', async () => {
            const results = await reviewer.review(['example.test', 'example.txt']);
            expect(results).toHaveLength(1);
            expect(results[0].file).toContain('example.test');
        });

        it('사용자 정의 파일 패턴을 사용할 수 있어야 함', async () => {
            mockGlobSync.mockImplementation((pattern) => {
                if (pattern === '**/*.custom') {
                    return ['test.custom'];
                }
                return [];
            });

            reviewer.options = {
                ...reviewer.options,
                filePatterns: ['**/*.custom']
            };

            const results = await reviewer.review(['test.custom', 'test.other']);
            expect(results).toHaveLength(1);
            expect(results[0].file).toContain('test.custom');
        });

        it('제외 패턴이 적용되어야 함', async () => {
            mockGlobSync.mockImplementation((pattern, options) => {
                if (pattern === '**/node_modules/**') {
                    return ['node_modules/test.test'];
                }
                if (pattern === '**/*.test') {
                    return ['example.test', 'node_modules/test.test'];
                }
                return [];
            });

            const results = await reviewer.review(['example.test', 'node_modules/test.test']);
            expect(results).toHaveLength(1);
            expect(results[0].file).toContain('example.test');
        });
    });

    describe('디버그 로깅', () => {
        it('디버그 모드가 활성화된 경우 로그가 출력되어야 함', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            await reviewer.review(['example.test']);
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TestReviewer]'));
        });

        it('디버그 모드가 비활성화된 경우 로그가 출력되지 않아야 함', async () => {
            reviewer.options = { debug: false };
            const consoleSpy = vi.spyOn(console, 'log');
            await reviewer.review(['example.test']);
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });
}); 