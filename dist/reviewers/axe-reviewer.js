"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const axeCore = __importStar(require("axe-core"));
const fsSync = __importStar(require("fs"));
const fs_1 = require("fs");
const jsdom_1 = require("jsdom");
const path = __importStar(require("path"));
const base_reviewer_1 = require("./base-reviewer");
class AxeReviewer extends base_reviewer_1.BaseReviewer {
    name = 'AxeReviewer';
    async isEnabled() {
        const enabled = this._options.enabled !== false;
        if (this._options.debug) {
            console.log(`Axe 리뷰어 활성화 상태: ${enabled}`);
        }
        return enabled;
    }
    async reviewFile(filePath) {
        const results = [];
        const html = await fs_1.promises.readFile(filePath, 'utf8');
        const virtualConsole = new jsdom_1.VirtualConsole();
        virtualConsole.on("error", () => { });
        virtualConsole.on("warn", () => { });
        virtualConsole.on("info", () => { });
        virtualConsole.on("dir", () => { });
        const dom = await this.createDOM(html, filePath, virtualConsole);
        const axeConfig = await this.loadAxeConfig();
        const violations = await this.runAxe(dom, axeConfig);
        violations.forEach((violation) => {
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
    getDefaultFilePattern() {
        return "**/*.{html,jsx,tsx}";
    }
    async loadAxeConfig() {
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
                const userConfig = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
                return { ...defaultConfig, ...userConfig };
            }
        }
        catch (error) {
            if (this._options.debug) {
                console.log('사용자 정의 axe 설정을 불러오는데 실패했습니다. 기본 설정을 사용합니다.');
            }
        }
        return defaultConfig;
    }
    async createDOM(html, filePath, virtualConsole) {
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
        return new jsdom_1.JSDOM(template, {
            runScripts: 'dangerously',
            resources: 'usable',
            pretendToBeVisual: true,
            virtualConsole,
            url: `file://${path.resolve(filePath)}`,
            contentType: 'text/html',
            includeNodeLocations: true
        });
    }
    async runAxe(dom, config) {
        const window = dom.window;
        window.axe = axeCore;
        const script = window.document.createElement('script');
        script.textContent = axeCore.source;
        window.document.head.appendChild(script);
        const results = await window.axe.run(window.document.body, config);
        return results.violations;
    }
}
exports.default = AxeReviewer;
