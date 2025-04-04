import * as axeCore from 'axe-core';
import * as fsSync from 'fs';
import { promises as fs } from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import * as path from 'path';
import { AxeViolation, ReviewResult } from '../types/reviewer';
import { BaseReviewer } from './base-reviewer';

export default class AxeReviewer extends BaseReviewer {
  protected readonly name = 'AxeReviewer';

  async isEnabled(): Promise<boolean> {
    const enabled = this._options.enabled !== false;
    if (this._options.debug) {
      console.log(`Axe 리뷰어 활성화 상태: ${enabled}`);
    }
    return enabled;
  }

  protected async reviewFile(filePath: string): Promise<ReviewResult[]> {
    const results: ReviewResult[] = [];
    const html = await fs.readFile(filePath, 'utf8');

    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => { });
    virtualConsole.on("warn", () => { });
    virtualConsole.on("info", () => { });
    virtualConsole.on("dir", () => { });

    const dom = await this.createDOM(html, filePath, virtualConsole);
    const axeConfig = await this.loadAxeConfig();
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
    return results;
  }

  protected getDefaultFilePattern(): string {
    return "**/*.{html,jsx,tsx}";
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