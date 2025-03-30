import { beforeEach, describe, expect, it, vi } from 'vitest';
import AxeReviewer from './axe-reviewer';
import { promises as fs } from 'fs';
import path from 'path';
import * as glob from 'glob';

const mockReadFile = vi.hoisted(() => vi.fn());
const mockGlobSync = vi.hoisted(() => vi.fn());
const mockAxeRun = vi.hoisted(() => vi.fn());
const mockJsdom = vi.hoisted(() => vi.fn());

vi.mock('fs', () => ({
    promises: {
        readFile: mockReadFile
    }
}));

vi.mock('glob', () => ({
    sync: mockGlobSync
}));

vi.mock('axe-core', () => ({
    source: 'mock axe source',
    run: mockAxeRun
}));

vi.mock('jsdom', () => ({
    JSDOM: mockJsdom,
    VirtualConsole: vi.fn().mockImplementation(() => ({
        on: vi.fn()
    }))
}));

vi.mock('@actions/core', () => ({
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
}));

describe('AxeReviewer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadFile.mockImplementation((filePath, encoding) => {
            if (filePath.endsWith('.html')) {
                return Promise.resolve('<div>테스트</div>');
            }
            return Promise.reject(new Error('파일을 찾을 수 없습니다.'));
        });

        mockGlobSync.mockImplementation((pattern) => {
            if (pattern === '**/*.{html,jsx,tsx}') {
                return ['test.html'];
            } else if (pattern === '**/node_modules/**' || pattern === '**/dist/**') {
                return [];
            }
            return [];
        });

        mockAxeRun.mockResolvedValue({
            violations: [
                {
                    help: '접근성 문제 발견',
                    nodes: [{ html: '<div>테스트</div>' }]
                }
            ]
        });

        mockJsdom.mockImplementation(() => ({
            window: {
                document: {
                    createElement: () => ({ textContent: '' }),
                    head: { appendChild: vi.fn() },
                    body: {}
                },
                close: vi.fn(),
                axe: {
                    run: mockAxeRun
                }
            }
        }));
    });

    describe('reviewFile', () => {
        it('HTML 파일을 분석하고 접근성 문제를 보고해야 함', async () => {
            const reviewer = new AxeReviewer({ workdir: '.' });
            const results = await reviewer.review(['test.html']);
            expect(mockReadFile).toHaveBeenCalledWith(path.join('.', 'test.html'), 'utf8');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                file: 'test.html',
                severity: 'error',
                reviewer: 'AxeReviewer'
            });
        });

        it('기본 파일 패턴에 맞는 파일만 처리해야 함', async () => {
            const reviewer = new AxeReviewer({ workdir: '.' });
            const files = ['test.html', 'test.js'];
            await reviewer.review(files);
            expect(mockReadFile).toHaveBeenCalledWith(path.join('.', 'test.html'), 'utf8');
            expect(mockReadFile).not.toHaveBeenCalledWith(path.join('.', 'test.js'), 'utf8');
        });
    });
}); 