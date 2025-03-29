/// <reference types="node" />

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface WorkspaceInputs {
  workdir: string;
  skip_ai_review: string;
  skip_accessibility: string;
}

interface PackageJson {
  name: string;
  version: string;
  private: boolean;
  engines: {
    node: string;
  };
  dependencies: Record<string, string>;
}

interface VersionsConfig {
  core: Record<string, string>;
  reviewers: {
    ai?: {
      version: string;
      dependencies: Record<string, string>;
    };
    axe?: {
      version: string;
      dependencies: Record<string, string>;
    };
  };
}

// 버전 정보를 코드 내에서 직접 관리
const versions: VersionsConfig = {
  core: {
    '@actions/core': '^1.10.1',
    '@actions/exec': '^1.1.1',
    '@actions/github': '^6.0.0'
  },
  reviewers: {
    ai: {
      version: '^4.0.0',
      dependencies: {
        'openai': '^4.28.0',
        '@octokit/rest': '^20.0.2',
        'langchain': '^0.1.21'
      }
    },
    axe: {
      version: '^4.8.5',
      dependencies: {
        'axe-core': '^4.8.5',
        'puppeteer': '^22.3.0',
        '@axe-core/puppeteer': '^4.8.5'
      }
    }
  }
};

function createPackageJson(workdir: string): void {
  console.log('\n=== package.json 생성 시작 ===');
  
  try {
    // 필요한 의존성 수집
    const requiredDeps: Record<string, string> = {};
    const inputs = getInputs();
    
    // 1. 코어 의존성 추가
    Object.entries(versions.core).forEach(([pkg, version]) => {
      requiredDeps[pkg] = version;
    });
    
    // 2. 리뷰어별 의존성 추가
    if (inputs.skip_ai_review !== 'true' && versions.reviewers.ai) {
      // AI 리뷰어 메인 패키지
      Object.entries(versions.reviewers.ai.dependencies).forEach(([pkg, version]) => {
        requiredDeps[pkg] = version;
      });
    }
    
    if (inputs.skip_accessibility !== 'true' && versions.reviewers.axe) {
      // Axe 접근성 검사 패키지
      Object.entries(versions.reviewers.axe.dependencies).forEach(([pkg, version]) => {
        requiredDeps[pkg] = version;
      });
    }
    
    // package.json 생성
    const packageJson: PackageJson = {
      name: 'code-review-action-workspace',
      version: '1.0.0',
      private: true,
      engines: {
        node: '>=20'
      },
      dependencies: requiredDeps
    };
    
    // package.json 파일 쓰기
    const targetPath = path.join(workdir, 'package.json');
    fs.writeFileSync(targetPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json 생성 완료:', targetPath);
    
    // 설치될 패키지 목록 출력
    console.log('\n설치될 패키지 목록:');
    Object.entries(requiredDeps).forEach(([pkg, version]) => {
      console.log(`- ${pkg}@${version}`);
    });

    // npm 패키지 설치
    console.log('\n⬇️ 패키지 설치 중...');
    
    // npm cache를 정리
    console.log('npm cache 정리 중...');
    execSync('npm cache clean --force', { stdio: 'inherit' });

    // package-lock.json이 있다면 삭제
    if (fs.existsSync('package-lock.json')) {
      console.log('기존 package-lock.json 삭제 중...');
      fs.unlinkSync('package-lock.json');
    }

    // node_modules가 있다면 삭제
    if (fs.existsSync('node_modules')) {
      console.log('기존 node_modules 삭제 중...');
      fs.rmSync('node_modules', { recursive: true, force: true });
    }

    // 패키지 설치
    execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
    console.log('✅ 패키지 설치 완료');

    // PATH에 node_modules/.bin 추가
    const binPath = path.join(process.cwd(), 'node_modules', '.bin');
    if (process.env.GITHUB_PATH) {
      fs.appendFileSync(process.env.GITHUB_PATH, `${binPath}\n`);
      console.log('✅ node_modules/.bin을 PATH에 추가함');
    }
    
  } catch (err) {
    console.error('❌ 작업 공간 설정 중 오류 발생:', err);
    throw err;
  }
}

function getInputs(): WorkspaceInputs {
  return {
    workdir: process.env.INPUT_WORKDIR || '.',
    skip_ai_review: process.env.INPUT_SKIP_AI_REVIEW || 'false',
    skip_accessibility: process.env.INPUT_SKIP_ACCESSIBILITY || 'false'
  };
}

// 메인 실행
try {
  const inputs = getInputs();
  createPackageJson(inputs.workdir);
  console.log('\n=== 작업 공간 설정 완료 ===');
  console.log('📍 작업 디렉토리:', inputs.workdir);
} catch (error) {
  console.error('\n❌ 작업 공간 설정 실패');
  process.exit(1);
}