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
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const versions = {
    core: {
        '@actions/core': '1.10.1',
        '@actions/github': '6.0.0',
        'typescript': '^5.0.0',
        'ts-node': '10.9.2',
        '@types/node': '^20.0.0',
        '@types/jsdom': '21.1.6',
        '@types/glob': '8.1.0'
    },
    reviewers: {
        ai: {
            version: '1.0.0',
            dependencies: {
                'openai': '4.90.0',
                '@actions/github': '6.0.0',
                'jsdom': '26.0.0',
                'glob': '11.0.1'
            }
        },
        axe: {
            version: '1.0.0',
            dependencies: {
                'axe-core': '4.10.3',
                'jsdom': '26.0.0'
            }
        }
    }
};
function createPackageJson(workdir) {
    console.log('\n=== package.json 생성 시작 ===');
    try {
        const requiredDeps = {};
        const inputs = getInputs();
        Object.entries(versions.core).forEach(([pkg, version]) => {
            requiredDeps[pkg] = version;
        });
        if (inputs.skip_ai_review !== 'true' && versions.reviewers.ai) {
            Object.entries(versions.reviewers.ai.dependencies).forEach(([pkg, version]) => {
                requiredDeps[pkg] = version;
            });
        }
        if (inputs.skip_accessibility !== 'true' && versions.reviewers.axe) {
            Object.entries(versions.reviewers.axe.dependencies).forEach(([pkg, version]) => {
                requiredDeps[pkg] = version;
            });
        }
        const packageJson = {
            name: 'code-review-action-workspace',
            version: '1.0.0',
            private: true,
            engines: {
                node: '>=20'
            },
            dependencies: requiredDeps
        };
        const targetPath = path.join(workdir, 'package.json');
        fs.writeFileSync(targetPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ package.json 생성 완료:', targetPath);
        console.log('\n설치될 패키지 목록:');
        Object.entries(requiredDeps).forEach(([pkg, version]) => {
            console.log(`- ${pkg}@${version}`);
        });
        console.log('\n⬇️ 패키지 설치 중...');
        console.log('npm cache 정리 중...');
        (0, child_process_1.execSync)('npm cache clean --force', { stdio: 'inherit' });
        if (fs.existsSync('package-lock.json')) {
            console.log('기존 package-lock.json 삭제 중...');
            fs.unlinkSync('package-lock.json');
        }
        if (fs.existsSync('node_modules')) {
            console.log('기존 node_modules 삭제 중...');
            fs.rmSync('node_modules', { recursive: true, force: true });
        }
        (0, child_process_1.execSync)('npm install --legacy-peer-deps', { stdio: 'inherit' });
        console.log('✅ 패키지 설치 완료');
        const binPath = path.join(process.cwd(), 'node_modules', '.bin');
        if (process.env.GITHUB_PATH) {
            fs.appendFileSync(process.env.GITHUB_PATH, `${binPath}\n`);
            console.log('✅ node_modules/.bin을 PATH에 추가함');
        }
    }
    catch (err) {
        console.error('❌ 작업 공간 설정 중 오류 발생:', err);
        throw err;
    }
}
function getInputs() {
    return {
        workdir: process.env.INPUT_WORKDIR || '.',
        skip_ai_review: process.env.INPUT_SKIP_AI_REVIEW || 'false',
        skip_accessibility: process.env.INPUT_SKIP_ACCESSIBILITY || 'false'
    };
}
try {
    const inputs = getInputs();
    createPackageJson(inputs.workdir);
    console.log('\n=== 작업 공간 설정 완료 ===');
    console.log('📍 작업 디렉토리:', inputs.workdir);
}
catch (error) {
    console.error('\n❌ 작업 공간 설정 실패');
    process.exit(1);
}
