import { promises as fs } from 'fs';
import * as core from '@actions/core';
import * as stylelint from 'stylelint';
import * as path from 'path';
import { BaseReviewer } from './base-reviewer';
import { ReviewResult } from '../types/reviewer';

interface StylelintResult {
    warnings: StylelintWarning[];
    deprecations: any[];
    invalidOptionWarnings: any[];
    errored: boolean;
}

interface StylelintWarning {
    line: number;
    column: number;
    rule: string;
    severity: string;
    text: string;
}

export default class CSSValidatorReviewer extends BaseReviewer {
    protected readonly name = 'CSSValidatorReviewer';

    constructor(options = {}) {
        super(options);
        this.logDebug('CSS 검증기 초기화됨');
        this.logDebug(`설정 경로: ${this._options.configPath || '.stylelintrc.json'}`);
        this.logDebug(`경고 허용 여부: ${this._options.allowWarnings === true}`);
    }

    async isEnabled(): Promise<boolean> {
        const enabled = this._options.enabled !== false;
        this.logDebug(`CSS 검증기 활성화 상태: ${enabled}`);
        return enabled;
    }

    protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
        const content = await fs.readFile(filePath, 'utf8');
        this.logDebug(`파일 내용 로드됨: ${filePath}`);

        try {
            const validationResults = await this.validateCSS(content, filePath);
            this.logDebug(`검증 결과 수: ${validationResults.length}`);

            return validationResults.map(warning => ({
                file: filePath,
                line: warning.line,
                message: `${warning.text} (${warning.rule})`,
                severity: warning.severity === 'error' ? 'error' : 'warning',
                reviewer: this.name
            }));
        } catch (error) {
            if (error instanceof Error) {
                core.error(`CSS 검증 중 오류 발생: ${error.message}`);
                this.logDebug(`스택 트레이스: ${error.stack}`);
            }
            return [];
        }
    }

    protected getDefaultFilePattern(): string {
        return "**/*.{css,scss,less}";
    }

    private async validateCSS(css: string, filePath: string): Promise<StylelintWarning[]> {
        this.logDebug('Stylelint 검증 시작...');

        try {
            if (this._options.useMockApi) {
                this.logDebug('Mock CSS 검증 사용 중');
                return this.getMockValidationResults();
            }

            // Stylelint 설정 로드 (프로젝트 내 설정 또는 기본 설정)
            const configFile = await this.loadStylelintConfig();

            const result = await stylelint.lint({
                code: css,
                codeFilename: path.basename(filePath),
                config: configFile
            });

            const lintResults = result.results[0] as StylelintResult;
            this.logDebug(`Stylelint 검증 완료: ${lintResults.warnings.length}개의 경고`);

            // 경고만 허용하는 경우 필터링
            if (this._options.allowWarnings) {
                return lintResults.warnings.filter(warning => warning.severity === 'error');
            }

            return lintResults.warnings;
        } catch (error) {
            if (error instanceof Error) {
                this.logDebug(`Stylelint 검증 중 오류: ${error.message}`);
            }
            throw error;
        }
    }

    private async loadStylelintConfig(): Promise<any> {
        const defaultConfig = {
            rules: {
                'color-no-invalid-hex': true,
                'font-family-no-duplicate-names': true,
                'unit-no-unknown': true,
                'property-no-unknown': true,
                'declaration-block-no-duplicate-properties': true,
                'declaration-block-no-shorthand-property-overrides': true,
                'selector-pseudo-class-no-unknown': true,
                'selector-pseudo-element-no-unknown': true,
                'selector-type-no-unknown': true,
                'media-feature-name-no-unknown': true,
                'comment-no-empty': true,
                'no-duplicate-selectors': true,
                'no-empty-source': true,
                'no-extra-semicolons': true,
                'no-invalid-double-slash-comments': true
            }
        };

        try {
            const workdir = this._options.workdir || '.';
            const configPath = path.join(workdir, this._options.configPath || '.stylelintrc.json');

            try {
                await fs.access(configPath);
                const configContent = await fs.readFile(configPath, 'utf8');
                const userConfig = JSON.parse(configContent);
                this.logDebug('사용자 정의 Stylelint 설정을 로드했습니다.');
                return userConfig;
            } catch (err) {
                this.logDebug('사용자 정의 Stylelint 설정 파일을 찾을 수 없습니다. 기본 설정을 사용합니다.');
            }
        } catch (error) {
            this.logDebug('사용자 정의 Stylelint 설정을 불러오는데 실패했습니다. 기본 설정을 사용합니다.');
        }

        this.logDebug('기본 Stylelint 설정을 사용합니다.');
        return defaultConfig;
    }

    private getMockValidationResults(): StylelintWarning[] {
        // 테스트용 Mock 검증 결과
        return [
            {
                line: 10,
                column: 5,
                rule: 'color-no-invalid-hex',
                severity: 'error',
                text: '유효하지 않은 hex 색상 "#FGH" 입니다'
            },
            {
                line: 15,
                column: 3,
                rule: 'property-no-unknown',
                severity: 'warning',
                text: '알 수 없는 속성 "heigth" 입니다'
            }
        ];
    }
}