"use strict";
/// <reference types="node" />
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
const fsSync = __importStar(require("fs"));
const path = __importStar(require("path"));
function getOptionalDependencies(inputs) {
    const packages = {
        dependencies: [],
        devDependencies: []
    };
    // 기본 패키지는 package.json에 이미 포함되어 있으므로 건너뜁니다.
    console.log('\n📦 선택적 패키지 확인 중...');
    // 접근성 검사 관련 패키지 스킵 여부 확인
    if (inputs.skip_accessibility === 'true') {
        console.log('  ⏩ 접근성 검사 패키지 스킵됨');
    }
    else {
        console.log('  ✓ 접근성 검사 패키지 포함됨');
    }
    return packages;
}
function setupWorkspace(inputs) {
    console.log('\n=== 작업 공간 설정 시작 ===');
    const workdir = process.env.INPUT_WORKDIR || '.';
    try {
        console.log('\n⬇️ 패키지 설치 중...');
        process.chdir(workdir);
        // npm cache를 정리
        console.log('npm cache 정리 중...');
        (0, child_process_1.execSync)('npm cache clean --force', { stdio: 'inherit' });
        // package-lock.json이 있다면 삭제
        if (fsSync.existsSync('package-lock.json')) {
            console.log('기존 package-lock.json 삭제 중...');
            fsSync.unlinkSync('package-lock.json');
        }
        // node_modules가 있다면 삭제
        if (fsSync.existsSync('node_modules')) {
            console.log('기존 node_modules 삭제 중...');
            fsSync.rmSync('node_modules', { recursive: true, force: true });
        }
        // 전체 패키지 설치
        console.log('패키지 설치 중...');
        (0, child_process_1.execSync)('npm install --legacy-peer-deps', { stdio: 'inherit' });
        console.log('✓ 패키지 설치 완료');
        // 설치된 버전 확인
        console.log('\n📋 설치된 패키지 버전 확인:');
        (0, child_process_1.execSync)('npm list --depth=0', {
            stdio: 'inherit'
        });
        // PATH에 node_modules/.bin 추가
        console.log('\n🔄 PATH 환경 변수 업데이트 중...');
        const binPath = path.join(process.cwd(), 'node_modules', '.bin');
        if (process.env.GITHUB_PATH) {
            fsSync.appendFileSync(process.env.GITHUB_PATH, `${binPath}\n`);
            console.log('✓ node_modules/.bin을 PATH에 추가함');
        }
        console.log('\n=== 작업 공간 설정 완료 ===');
        console.log('📍 작업 디렉토리:', workdir);
    }
    catch (error) {
        const execError = error;
        console.error('\n❌ 작업 공간 설정 중 오류 발생:');
        console.error('오류 메시지:', execError.message);
        if (execError.stdout)
            console.error('표준 출력:', execError.stdout.toString());
        if (execError.stderr)
            console.error('오류 출력:', execError.stderr.toString());
        throw error;
    }
}
// GitHub Actions 입력 값 가져오기 및 로깅
console.log('\n=== 설정값 ===');
const inputs = {
    skip_eslint: process.env.INPUT_SKIP_ESLINT || 'false',
    skip_stylelint: process.env.INPUT_SKIP_STYLELINT || 'false',
    skip_markdownlint: process.env.INPUT_SKIP_MARKDOWNLINT || 'false',
    skip_ai_review: process.env.INPUT_SKIP_AI_REVIEW || 'false',
    skip_accessibility: process.env.INPUT_SKIP_ACCESSIBILITY || 'false'
};
console.log('환경변수 디버그 정보:');
Object.keys(process.env).forEach(key => {
    if (key.startsWith('INPUT_')) {
        console.log(`${key}:`, process.env[key]);
    }
});
console.log('\n설정된 입력값:');
Object.entries(inputs).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
});
// 작업 공간 설정 실행
try {
    setupWorkspace(inputs);
}
catch (error) {
    console.error('\n❌ 작업 공간 설정 실패');
    process.exit(1);
}
//# sourceMappingURL=setup-workspace.js.map