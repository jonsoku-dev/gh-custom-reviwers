import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as core from '@actions/core';
import { ReviewerManager } from './reviewers/reviewer-manager';
import { createReviewer } from './reviewers';
import { runReviews } from './run-reviews';
import { BaseReviewer } from './reviewers/base-reviewer';

// core 액션 모듈 모킹
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  setFailed: vi.fn(),
}));

// ReviewerManager 모킹
vi.mock('./reviewers/reviewer-manager', () => {
  return {
    ReviewerManager: vi.fn().mockImplementation(function() {
      return {
        registerReviewer: vi.fn(),
        runReviews: vi.fn().mockResolvedValue(undefined),
        getReviewer: vi.fn(),
        hasReviewer: vi.fn(),
        createResultsDirectory: vi.fn(),
        saveResults: vi.fn(),
        loadResults: vi.fn(),
        clearResults: vi.fn(),
        getResults: vi.fn(),
        getAllResults: vi.fn(),
        createActionsSummary: vi.fn(),
        processCodeLine: vi.fn(),
        createCodeBlockWithLineNumbers: vi.fn(),
        generateChangeSummary: vi.fn(),
        createMarkdownTable: vi.fn(),
        createMarkdownLink: vi.fn(),
        createMarkdownList: vi.fn(),
        createMarkdownHeading: vi.fn(),
        groupResults: vi.fn(),
        formatMessage: vi.fn(),
        getTargetFiles: vi.fn(),
        generateSummary: vi.fn(),
      } as unknown as ReviewerManager;
    }),
  };
});

// createReviewer 모킹
vi.mock('./reviewers', () => ({
  createReviewer: vi.fn(),
}));

describe('runReviews', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('디버그 모드가 활성화된 경우 디버그 메시지를 출력해야 함', async () => {
    process.env.DEBUG = 'true';
    process.env.ENABLED_REVIEWERS = 'ai,axe';

    await runReviews();

    expect(core.info).toHaveBeenCalledWith('디버그 모드가 활성화되었습니다.');
  });

  it('활성화된 리뷰어가 없는 경우 경고를 출력해야 함', async () => {
    process.env.ENABLED_REVIEWERS = '';

    await runReviews();

    expect(core.warning).toHaveBeenCalledWith('활성화된 리뷰어가 없습니다.');
  });

  it('리뷰어 생성 및 등록이 성공적으로 이루어져야 함', async () => {
    process.env.ENABLED_REVIEWERS = 'ai,axe';
    const mockReviewer = {
      type: 'ai',
      options: {},
      isEnabled: () => true,
      review: vi.fn(),
    } as unknown as BaseReviewer;
    vi.mocked(createReviewer).mockReturnValue(mockReviewer);

    await runReviews();

    expect(createReviewer).toHaveBeenCalledTimes(2);
    expect(ReviewerManager).toHaveBeenCalledWith({
      workdir: '.',
      debug: false,
    });
    expect(vi.mocked(ReviewerManager).mock.results[0].value.registerReviewer).toHaveBeenCalledWith(mockReviewer);
  });

  it('리뷰어 생성 중 오류 발생 시 경고를 출력해야 함', async () => {
    process.env.ENABLED_REVIEWERS = 'ai';
    vi.mocked(createReviewer).mockImplementation(() => {
      throw new Error('리뷰어 생성 실패');
    });

    await runReviews();

    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('리뷰어 생성 중 오류 발생'));
  });

  it('FAIL_ON_ERROR가 true인 경우 오류 발생 시 실패로 처리해야 함', async () => {
    process.env.ENABLED_REVIEWERS = 'ai';
    process.env.FAIL_ON_ERROR = 'true';
    const mockManager = {
      registerReviewer: vi.fn(),
      runReviews: vi.fn().mockRejectedValue(new Error('리뷰 실행 실패')),
      getReviewer: vi.fn(),
      hasReviewer: vi.fn(),
      createResultsDirectory: vi.fn(),
      saveResults: vi.fn(),
      loadResults: vi.fn(),
      clearResults: vi.fn(),
      getResults: vi.fn(),
      getAllResults: vi.fn(),
      createActionsSummary: vi.fn(),
      processCodeLine: vi.fn(),
      createCodeBlockWithLineNumbers: vi.fn(),
      generateChangeSummary: vi.fn(),
      createMarkdownTable: vi.fn(),
      createMarkdownLink: vi.fn(),
      createMarkdownList: vi.fn(),
      createMarkdownHeading: vi.fn(),
      groupResults: vi.fn(),
      formatMessage: vi.fn(),
      getTargetFiles: vi.fn(),
      generateSummary: vi.fn(),
    } as unknown as ReviewerManager;
    vi.mocked(ReviewerManager).mockImplementation(() => mockManager);

    await runReviews();

    expect(core.setFailed).toHaveBeenCalledWith('리뷰 실행 실패');
  });
}); 