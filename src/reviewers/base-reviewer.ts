import * as core from '@actions/core';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { Reviewer, ReviewResult, ReviewerOptions } from '../types/reviewer';

export abstract class BaseReviewer implements Reviewer {
  protected _options: ReviewerOptions;
  protected abstract readonly name: string;

  constructor(options: ReviewerOptions = {}) {
    this._options = options;
    this.logDebug('리뷰어 생성자 호출됨');
    this.logDebug('리뷰어 초기 옵션:', this._options);
  }

  protected logDebug(message: string, ...args: any[]) {
    if (this._options.debug) {
      if (args.length > 0) {
        console.log(`[${this.name}] ${message}`, ...args);
      } else {
        console.log(`[${this.name}] ${message}`);
      }
    }
  }

  get options(): ReviewerOptions {
    return this._options;
  }

  set options(newOptions: ReviewerOptions) {
    this._options = newOptions;
    this.logDebug('리뷰어 옵션 업데이트됨');
    this.logDebug('새 설정:', this._options);
  }

  abstract isEnabled(): Promise<boolean>;
  protected abstract reviewFile(filePath: string): Promise<ReviewResult[]>;

  async review(files: string[]): Promise<ReviewResult[]> {
    const results: ReviewResult[] = [];
    const workdir = this._options.workdir || '.';

    this.logDebug(`검토할 작업 디렉토리: ${workdir}`);
    this.logDebug('입력된 전체 파일 목록:', files);
    this.logDebug('리뷰어 옵션:', {
      ...this._options,
      enabled: this._options.enabled,
      filePatterns: this._options.filePatterns,
      excludePatterns: this._options.excludePatterns
    });

    // 파일 패턴과 제외 패턴 처리
    const filePattern = this._options.filePatterns?.[0] || this.getDefaultFilePattern();
    const excludePattern = this._options.excludePatterns?.[0] || "**/node_modules/**,**/dist/**";
    const excludePatterns = excludePattern.split(',').map(p => p.trim());

    this.logDebug('\n=== 파일 패턴 설정 ===');
    this.logDebug('파일 패턴:', filePattern);
    this.logDebug('제외 패턴:', excludePatterns);

    // glob 패턴으로 파일 필터링
    const targetFiles = files.filter(file => {
      const relativePath = path.relative(workdir, path.join(workdir, file));
      
      const isMatched = glob.sync(filePattern, {
        cwd: workdir,
        dot: false
      }).some(match => match === relativePath);

      const isExcluded = excludePatterns.some(excludePattern =>
        glob.sync(excludePattern, {
          cwd: workdir,
          dot: false
        }).some(match => match === relativePath)
      );

      this.logDebug(`\n파일 검사: ${file}`);
      this.logDebug(`- 패턴 매칭: ${isMatched}`);
      this.logDebug(`- 제외 여부: ${isExcluded}`);

      return isMatched && !isExcluded;
    });

    this.logDebug('\n=== 최종 검사 대상 ===');
    this.logDebug(`검사 대상 파일 수: ${targetFiles.length}`);
    this.logDebug('검사 대상 파일 목록:', targetFiles);

    for (const file of targetFiles) {
      try {
        const filePath = path.join(workdir, file);
        this.logDebug(`파일 분석 시작: ${filePath}`);

        const fileResults = await this.reviewFile(filePath);
        results.push(...fileResults);

      } catch (error) {
        core.warning(`파일 분석 중 오류 발생 (${file}): ${error}`);
        if (this._options.debug && error instanceof Error) {
          this.logDebug(`스택 트레이스: ${error.stack}`);
        }
      }
    }

    this.logDebug(`총 ${results.length}개의 리뷰 결과가 생성되었습니다.`);

    return results;
  }

  protected abstract getDefaultFilePattern(): string;
} 