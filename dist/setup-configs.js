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
const fsSync = __importStar(require("fs"));
const path = __importStar(require("path"));
function copyConfigFiles(toolName, configPath) {
    console.log(`\n[${toolName}] 설정 파일 복사 시작`);
    // GitHub Actions 환경에서의 configs 디렉토리 경로 설정
    const actionPath = process.env.GITHUB_ACTION_PATH || __dirname;
    let sourceDir = path.join(actionPath, 'configs', toolName);
    console.log(`[${toolName}] 액션 경로:`, actionPath);
    console.log(`[${toolName}] 소스 디렉토리 경로:`, sourceDir);
    if (!fsSync.existsSync(sourceDir)) {
        console.error(`[${toolName}] 소스 디렉토리가 존재하지 않습니다:`, sourceDir);
        // 상위 디렉토리 탐색
        const parentSourceDir = path.join(actionPath, '..', 'configs', toolName);
        console.log(`[${toolName}] 상위 디렉토리 탐색:`, parentSourceDir);
        if (fsSync.existsSync(parentSourceDir)) {
            console.log(`[${toolName}] 상위 디렉토리에서 configs 발견`);
            sourceDir = parentSourceDir;
        }
        else {
            throw new Error(`소스 디렉토리를 찾을 수 없음: ${sourceDir} 또는 ${parentSourceDir}`);
        }
    }
    try {
        const files = fsSync.readdirSync(sourceDir);
        console.log(`[${toolName}] 복사할 파일 목록:`, files);
        files.forEach((file) => {
            const sourcePath = path.join(sourceDir, file);
            const targetPath = path.join(process.cwd(), file);
            try {
                if (configPath && file.endsWith('.json')) {
                    // 사용자 정의 설정 파일이 있는 경우
                    console.log(`[${toolName}] 사용자 정의 설정 파일 사용:`, configPath);
                    if (!fsSync.existsSync(configPath)) {
                        throw new Error(`사용자 정의 설정 파일을 찾을 수 없음: ${configPath}`);
                    }
                    fsSync.copyFileSync(configPath, targetPath);
                }
                else {
                    // 기본 설정 파일 복사
                    console.log(`[${toolName}] 기본 설정 파일 복사:`, file);
                    if (!fsSync.existsSync(sourcePath)) {
                        throw new Error(`소스 파일을 찾을 수 없음: ${sourcePath}`);
                    }
                    fsSync.copyFileSync(sourcePath, targetPath);
                }
                console.log(`[${toolName}] ✓ ${file} 복사 완료 -> ${targetPath}`);
            }
            catch (error) {
                const err = error;
                console.error(`[${toolName}] ✗ ${file} 복사 실패:`, err.message);
                throw err;
            }
        });
        console.log(`[${toolName}] 모든 설정 파일 복사 완료`);
    }
    catch (error) {
        const err = error;
        console.error(`[${toolName}] 설정 파일 복사 중 오류 발생:`, err.message);
        throw err;
    }
}
function createConfig(inputs) {
    console.log('\n=== 설정 파일 생성 시작 ===');
    console.log('현재 작업 디렉토리:', process.cwd());
    try {
        // AI 리뷰어 설정
        if (inputs.skip_ai_review !== 'true') {
            copyConfigFiles('ai', inputs.ai_config_path);
        }
        else {
            console.log('\n[ai] 건너뛰기');
        }
        // Axe 설정
        if (inputs.skip_accessibility !== 'true') {
            copyConfigFiles('axe', inputs.axe_config_path);
        }
        else {
            console.log('\n[axe] 건너뛰기');
        }
        console.log('\n✅ 모든 설정 파일 생성 완료');
        console.log('현재 작업 디렉토리:', process.cwd());
    }
    catch (error) {
        const err = error;
        console.error('\n❌ 설정 파일 생성 중 오류 발생:', err.message);
        process.exit(1);
    }
}
// GitHub Actions 입력 값 가져오기 및 로깅
console.log('\n=== 설정값 ===');
const inputs = {
    skip_ai_review: process.env.INPUT_SKIP_AI_REVIEW || 'false',
    skip_accessibility: process.env.INPUT_SKIP_ACCESSIBILITY || 'false',
    ai_config_path: process.env.INPUT_AI_CONFIG_PATH || '',
    axe_config_path: process.env.INPUT_AXE_CONFIG_PATH || ''
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
// 설정 파일 생성
createConfig(inputs);
//# sourceMappingURL=setup-configs.js.map