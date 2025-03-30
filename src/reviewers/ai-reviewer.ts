import * as core from '@actions/core';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import { MockOpenAI } from '../mocks/openai';
import { ReviewResult } from '../types/reviewer';
import { BaseReviewer } from './base-reviewer';

export default class AIReviewer extends BaseReviewer {
  private openai!: OpenAI | MockOpenAI;
  protected readonly name = 'AIReviewer';

  constructor(options = {}) {
    super(options);
    this.initializeOpenAI();
  }

  private initializeOpenAI() {
    if (this._options.debug) {
      console.log('AI 리뷰어 OpenAI 초기화 시작');
      console.log(`Mock API 사용 여부: ${this._options.useMockApi}`);
    }

    try {
      if (this._options.useMockApi) {
        this.openai = new MockOpenAI();
        core.info('Mock OpenAI API가 활성화되었습니다.');
        if (this._options.debug) {
          console.log('Mock OpenAI 클라이언트가 초기화되었습니다.');
          console.log('실제 API 호출 대신 Mock 응답이 사용됩니다.');
        }
      } else {
        if (!this._options.apiKey) {
          const error = new Error('OpenAI API 키가 설정되지 않았습니다.');
          core.error(error.message);
          throw error;
        }

        this.openai = new OpenAI({ apiKey: this._options.apiKey });
        core.info('실제 OpenAI API가 활성화되었습니다.');
        if (this._options.debug) {
          console.log('실제 OpenAI 클라이언트가 초기화되었습니다.');
        }
      }

      if (this._options.debug) {
        console.log('AI 리뷰어 초기화됨');
        const debugConfig = {
          ...this._options,
          apiKey: '***',
          usingMockApi: this._options.useMockApi
        };
        console.log(`설정: ${JSON.stringify(debugConfig, null, 2)}`);
      }
    } catch (error) {
      core.error('OpenAI 클라이언트 초기화 중 오류 발생');
      throw error;
    }
  }

  async isEnabled(): Promise<boolean> {
    const enabled = this._options.enabled !== false && !!this._options.apiKey;
    if (this._options.debug) {
      console.log(`AI 리뷰어 활성화 상태: ${enabled}`);
    }
    return enabled;
  }

  protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
    const content = await fs.readFile(filePath, 'utf8');
    const suggestions = await this.analyzeCode(content);

    if (this._options.debug) {
      console.log(`파일 ${filePath}에 대한 제안사항:`);
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    return suggestions.map(suggestion => ({
      file: filePath,
      line: 1,
      message: suggestion,
      severity: 'info',
      reviewer: this.name
    }));
  }

  protected getDefaultFilePattern(): string {
    return "**/*.{js,jsx,ts,tsx}";
  }

  private async analyzeCode(code: string): Promise<string[]> {
    try {
      if (this._options.debug) {
        console.log('OpenAI API 호출 시작...');
        console.log(`API 타입: ${this._options.useMockApi ? 'Mock API' : '실제 OpenAI API'}`);
        console.log(`사용 모델: ${this._options.model || 'gpt-4o'}`);
        console.log(`사용 언어: ${this._options.language || 'ko'}`);
      }

      const response = await this.openai.chat.completions.create({
        model: this._options.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 전문적인 코드 리뷰어입니다. 코드의 품질, 가독성, 성능, 보안 측면에서 개선사항을 제안해주세요.'
          },
          {
            role: 'system',
            content: `리스폰스 언어: ${this._options.language || 'ko'}`
          },
          {
            role: 'user',
            content: `다음 코드를 리뷰하고 개선사항을 제안해주세요:\n\n${code}`
          },
        ],
        max_tokens: this._options.maxTokens || 1000,
        temperature: this._options.temperature || 0.7,
      });

      const suggestions = response.choices[0].message.content
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[0-9]+\.\s*/, '')) || [];

      if (this._options.debug) {
        console.log('OpenAI API 응답 받음');
        console.log(`원본 응답: ${response.choices[0].message.content}`);
        console.log(`처리된 제안사항 수: ${suggestions.length}`);
      }

      return suggestions;
    } catch (error) {
      if (error instanceof Error) {
        core.error(error.message);
        if (this._options.debug) {
          console.log(`OpenAI API 오류 상세: ${error.stack}`);
        }
      } else {
        core.error('OpenAI API 호출 중 알 수 없는 오류가 발생했습니다.');
      }
      return [];
    }
  }
} 