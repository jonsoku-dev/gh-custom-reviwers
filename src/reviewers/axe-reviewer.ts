import { JSDOM, VirtualConsole, DOMWindow } from 'jsdom';
import * as axeCore from 'axe-core';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as glob from 'glob';
import { Reviewer, ReviewResult, ReviewerOptions, AxeViolation } from '../types/reviewer';

export default class AxeReviewer implements Reviewer {
  private _options: ReviewerOptions;
  private readonly name = 'AxeReviewer';

  constructor(options: ReviewerOptions = {}) {
    this._options = options;
    
    if (this._options.debug) {
      console.log('Axe 리뷰어 생성자 호출됨');
      console.log('Axe 리뷰어 초기 옵션:');
      console.log(JSON.stringify(this._options, null, 2));
    }
  }

  get options(): ReviewerOptions {
    return this._options;
  }

  set options(newOptions: ReviewerOptions) {
    this._options = newOptions;
    
    if (this._options.debug) {
      console.log('Axe 리뷰어 옵션 업데이트됨');
      console.log(`새 설정: ${JSON.stringify(this._options, null, 2)}`);
    }
  }

  async isEnabled(): Promise<boolean> {
    const enabled = this._options.enabled !== false;
    if (this._options.debug) {
      console.log(`Axe 리뷰어 활성화 상태: ${enabled}`);
    }
    return enabled;
  }

  async review(files: string[]): Promise<ReviewResult[]> {
    const results: ReviewResult[] = [];
    const workdir = this._options.workdir || '.';

    if (this._options.debug) {
      console.log(`검토할 작업 디렉토리: ${workdir}`);
      console.log(`검토할 파일 목록: ${JSON.stringify(files, null, 2)}`);
    }

    const targetFiles = files.length > 0 ? files : glob.sync('**/*.html', {
      cwd: workdir,
      ignore: this._options.excludePatterns || ['node_modules/**', 'dist/**', 'build/**'],
    });

    if (this._options.debug) {
      console.log(`필터링된 대상 파일: ${JSON.stringify(targetFiles, null, 2)}`);
    }

    const axeConfig = await this.loadAxeConfig();

    for (const file of targetFiles) {
      try {
        const filePath = path.join(workdir, file);
        const html = await fs.readFile(filePath, 'utf8');
        
        const virtualConsole = new VirtualConsole();
        virtualConsole.on("error", () => {});
        virtualConsole.on("warn", () => {});
        virtualConsole.on("info", () => {});
        virtualConsole.on("dir", () => {});

        const dom = await this.createDOM(html, filePath, virtualConsole);
        const violations = await this.runAxe(dom, axeConfig);
        
        violations.forEach((violation: AxeViolation) => {
          results.push({
            file: filePath,
            line: 1,
            message: `${violation.help} - ${violation.nodes.map(n => n.html).join(', ')}`,
            severity: 'error',
            reviewer: this.name
          });
        });

        dom.window.close();
      } catch (error) {
        core.warning(`파일 분석 중 오류 발생 (${file}): ${error}`);
        if (this._options.debug && error instanceof Error) {
          console.log(`스택 트레이스: ${error.stack}`);
        }
      }
    }

    return results;
  }

  private async loadAxeConfig() {
    const defaultConfig = {
      reporter: 'v2',
      rules: {
        'color-contrast': { enabled: true },
        'aria-allowed-attr': { enabled: true },
        'aria-hidden-body': { enabled: true },
        'aria-hidden-focus': { enabled: true },
        'aria-input-field-name': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-required-children': { enabled: true },
        'aria-required-parent': { enabled: true },
        'aria-roles': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'image-alt': { enabled: true }
      }
    };

    try {
      const configPath = path.join(this._options.workdir || '.', '.axerc.json');
      if (fsSync.existsSync(configPath)) {
        const userConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      if (this._options.debug) {
        console.log('사용자 정의 axe 설정을 불러오는데 실패했습니다. 기본 설정을 사용합니다.');
      }
    }

    return defaultConfig;
  }

  private async createDOM(html: string, filePath: string, virtualConsole: VirtualConsole): Promise<JSDOM> {
    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <base href="file://${path.dirname(filePath)}/">
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    return new JSDOM(template, {
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      virtualConsole,
      url: `file://${path.resolve(filePath)}`,
      contentType: 'text/html',
      includeNodeLocations: true
    });
  }

  private async runAxe(dom: JSDOM, config: any): Promise<AxeViolation[]> {
    const window = dom.window;
    (window as any).axe = axeCore;
    
    const script = window.document.createElement('script');
    script.textContent = axeCore.source;
    window.document.head.appendChild(script);

    const results = await (window as any).axe.run(window.document.body, config);
    return results.violations;
  }
} 