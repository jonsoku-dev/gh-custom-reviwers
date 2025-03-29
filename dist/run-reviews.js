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
const core = __importStar(require("@actions/core"));
const reviewer_manager_1 = require("./reviewers/reviewer-manager");
const reviewers_1 = require("./reviewers");
async function runReviews() {
    try {
        const isDebug = process.env.DEBUG === 'true';
        if (isDebug) {
            core.info('디버그 모드가 활성화되었습니다.');
        }
        const enabledReviewers = process.env.ENABLED_REVIEWERS?.split(',').filter(Boolean) || [];
        if (enabledReviewers.length === 0) {
            core.warning('활성화된 리뷰어가 없습니다.');
            return;
        }
        const manager = new reviewer_manager_1.ReviewerManager({
            workdir: process.env.WORKSPACE_PATH || '.',
            debug: isDebug
        });
        for (const reviewerType of enabledReviewers) {
            try {
                if (isDebug) {
                    core.debug(`${reviewerType} 리뷰어 생성 시도...`);
                }
                if (!process.env) {
                    core.warning('환경 변수가 없습니다.');
                }
                const reviewer = (0, reviewers_1.createReviewer)(reviewerType, process.env);
                if (reviewer) {
                    manager.registerReviewer(reviewer);
                    core.info(`${reviewerType} 리뷰어가 등록되었습니다.`);
                }
                else {
                    core.warning(`${reviewerType} 리뷰어를 생성할 수 없습니다.`);
                }
            }
            catch (error) {
                core.warning(`${reviewerType} 리뷰어 생성 중 오류 발생: ${error}`);
                if (isDebug && error instanceof Error) {
                    core.debug(`스택 트레이스: ${error.stack}`);
                }
            }
        }
        await manager.runReviews();
        core.info('모든 리뷰가 완료되었습니다.');
    }
    catch (error) {
        core.error(`리뷰 실행 중 오류 발생: ${error}`);
        if (process.env.DEBUG === 'true' && error instanceof Error) {
            core.debug(`스택 트레이스: ${error.stack}`);
        }
        if (process.env.FAIL_ON_ERROR === 'true') {
            core.setFailed(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        }
    }
}
if (require.main === module) {
    runReviews();
}
