import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIReviewer from './ai-reviewer';
import { promises as fs } from 'fs';
import path from 'path';
import * as glob from 'glob';

const mockReadFile = vi.hoisted(() => vi.fn());
const mockGlobSync = vi.hoisted(() => vi.fn());
const mockOpenAIClient = vi.hoisted(() => ({
    chat: {
        completions: {
            create: vi.fn().mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: '코드 개선 필요'
                        }
                    }
                ]
            })
        }
    }
}));

vi.mock('fs', () => ({
    promises: {
        readFile: mockReadFile
    }
}));

vi.mock('glob', () => ({
    sync: mockGlobSync
}));

vi.mock('openai', () => {
    return {
        default: class MockOpenAI {
            constructor() {
                return mockOpenAIClient;
            }
        }
    };
});

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
}));

describe('AIReviewer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadFile.mockImplementation((filePath, encoding) => {
            if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
                return Promise.resolve('테스트 파일 내용');
            }
            return Promise.reject(new Error('파일을 찾을 수 없습니다.'));
        });

        mockGlobSync.mockImplementation((pattern) => {
            if (pattern === '**/*.{js,jsx,ts,tsx}') {
                return ['test.ts'];
            } else if (pattern === '**/node_modules/**' || pattern === '**/dist/**') {
                return [];
            }
            return [];
        });
    });

    describe('초기화', () => {
        it('Mock API 모드에서는 API 키 없이도 초기화되어야 함', () => {
            expect(() => new AIReviewer({ useMockApi: true }))
                .not.toThrow();
        });
    });

    describe('reviewFile', () => {
        it('파일을 읽고 AI 분석을 수행해야 함', async () => {
            const reviewer = new AIReviewer({ useMockApi: true, workdir: '.' });
            const results = await reviewer.review(['test.ts']);
            expect(mockReadFile).toHaveBeenCalledWith(path.join('.', 'test.ts'), 'utf8');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toMatchObject({
                file: 'test.ts',
                severity: 'info',
                reviewer: 'AIReviewer'
            });
        });

        it('기본 파일 패턴에 맞는 파일만 처리해야 함', async () => {
            const reviewer = new AIReviewer({ useMockApi: true, workdir: '.' });
            const files = ['test.ts', 'test.css'];
            await reviewer.review(files);
            expect(mockReadFile).toHaveBeenCalledWith(path.join('.', 'test.ts'), 'utf8');
            expect(mockReadFile).not.toHaveBeenCalledWith(path.join('.', 'test.css'), 'utf8');
        });
    });
}); 