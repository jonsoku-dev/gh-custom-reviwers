/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MockOpenAI = void 0;
class MockOpenAI {
    chat = {
        completions: {
            create: async ({ messages }) => {
                return {
                    choices: [
                        {
                            message: {
                                content: `
1. 코드 스타일: 일관된 들여쓰기와 포맷팅을 유지하세요.
2. 변수명: 더 명확한 변수명을 사용하면 좋을 것 같습니다.
3. 주석: 복잡한 로직에 대한 설명이 필요해 보입니다.
4. 에러 처리: try-catch 블록을 추가하는 것이 좋겠습니다.
5. 테스트: 단위 테스트 추가를 권장합니다.`.trim()
                            }
                        }
                    ]
                };
            }
        }
    };
}
exports.MockOpenAI = MockOpenAI;

})();

module.exports = __webpack_exports__;
/******/ })()
;