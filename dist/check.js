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
const jsdom_1 = require("jsdom");
const axeCore = __importStar(require("axe-core"));
const fsSync = __importStar(require("fs"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("glob"));
async function runAccessibilityCheck() {
    try {
        const accessibilityLevel = process.env.ACCESSIBILITY_LEVEL || 'AA';
        const contrastRatio = parseFloat(process.env.COLOR_CONTRAST_RATIO || '4.5');
        const skipAriaCheck = process.env.SKIP_ARIA_CHECK === 'true';
        const skipAltTextCheck = process.env.SKIP_ALT_TEXT_CHECK === 'true';
        let axeConfig = {
            reporter: 'v2',
            rules: {}
        };
        if (accessibilityLevel === 'A') {
            axeConfig.runOnly = {
                type: 'tag',
                values: ['wcag2a']
            };
        }
        else if (accessibilityLevel === 'AA') {
            axeConfig.runOnly = {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa']
            };
        }
        else if (accessibilityLevel === 'AAA') {
            axeConfig.runOnly = {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag2aaa']
            };
        }
        axeConfig.rules['color-contrast'] = {
            enabled: true,
            options: {
                noScroll: true,
                levels: {
                    normal: {
                        minRatio: contrastRatio
                    }
                }
            }
        };
        try {
            const configPath = path.resolve(process.cwd(), '.axerc.json');
            if (fsSync.existsSync(configPath)) {
                const userConfig = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
                axeConfig = { ...axeConfig, ...userConfig };
                if (!axeConfig.rules['color-contrast']) {
                    axeConfig.rules['color-contrast'] = {
                        enabled: true,
                        options: {
                            noScroll: true,
                            levels: {
                                normal: {
                                    minRatio: contrastRatio
                                }
                            }
                        }
                    };
                }
            }
        }
        catch (error) {
            core.warning('axe 설정 파일 로드 실패');
        }
        if (skipAriaCheck) {
            const ariaRules = axeCore.getRules()
                .filter(rule => rule.ruleId.startsWith('aria-'))
                .map(rule => rule.ruleId);
            ariaRules.forEach((ruleId) => {
                axeConfig.rules[ruleId] = { enabled: false };
            });
        }
        if (skipAltTextCheck) {
            axeConfig.rules['image-alt'] = { enabled: false };
        }
        const files = glob.sync('**/*.html', {
            ignore: ['node_modules/**', 'build/**', 'dist/**'],
        });
        if (files.length === 0) {
            return;
        }
        const results = [];
        for (const file of files) {
            const html = fsSync.readFileSync(file, 'utf8');
            const virtualConsole = new jsdom_1.VirtualConsole();
            virtualConsole.on("error", () => { });
            virtualConsole.on("warn", () => { });
            virtualConsole.on("info", () => { });
            virtualConsole.on("dir", () => { });
            const template = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <base href="file://${path.dirname(file)}/">
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;
            const dom = new jsdom_1.JSDOM(template, {
                runScripts: 'dangerously',
                resources: 'usable',
                pretendToBeVisual: true,
                virtualConsole,
                url: `file://${path.resolve(file)}`,
                contentType: 'text/html',
                includeNodeLocations: true,
                beforeParse(window) {
                    window._resourceLoader = {
                        abort: () => { }
                    };
                }
            });
            const window = dom.window;
            const document = window.document;
            window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
            window.cancelAnimationFrame = (id) => clearTimeout(id);
            window.HTMLElement.prototype.scrollIntoView = () => { };
            window.HTMLElement.prototype.getBoundingClientRect = () => ({
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                toJSON() {
                    return {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        width: 0,
                        height: 0,
                        x: 0,
                        y: 0
                    };
                }
            });
            try {
                window.axe = axeCore;
                const source = axeCore.source;
                const script = window.document.createElement('script');
                script.textContent = source;
                window.document.head.appendChild(script);
                const axeResults = await window.axe.run(document.body, axeConfig);
                results.push({
                    file,
                    violations: axeResults.violations,
                });
            }
            catch (error) {
                core.warning(`${file} 파일 검사 중 오류 발생`);
            }
            finally {
                try {
                    if (window._resourceLoader) {
                        window._resourceLoader.abort();
                    }
                    window.close();
                }
                catch (error) { }
            }
        }
        const summary = generateAccessibilitySummary(results);
        core.setOutput('accessibility_violations', summary.totalViolations);
        fsSync.writeFileSync('accessibility-results.json', JSON.stringify({
            summary,
            details: results
        }, null, 2));
        if (summary.totalViolations > 0) {
            core.setFailed(`접근성 검사: ${summary.totalViolations}개의 위반사항 발견`);
        }
    }
    catch (error) {
        const err = error;
        core.setFailed(`접근성 검사 실패: ${err.message}`);
    }
}
function generateAccessibilitySummary(results) {
    const summary = {
        totalViolations: 0,
        fileResults: {},
    };
    results.forEach(result => {
        const violations = result.violations.length;
        summary.totalViolations += violations;
        summary.fileResults[result.file] = violations;
    });
    return summary;
}
runAccessibilityCheck();
//# sourceMappingURL=check.js.map