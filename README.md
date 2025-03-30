# Unified Lint Action

[![Release](https://github.com/jonsoku-dev/unified-lint-action/workflows/Release/badge.svg)](https://github.com/jonsoku-dev/unified-lint-action/releases)
[![Reviewdog](https://github.com/jonsoku-dev/unified-lint-action/workflows/Reviewdog/badge.svg)](https://github.com/jonsoku-dev/unified-lint-action/actions?query=workflow%3AReviewdog)

> 통합 린트 GitHub 액션 (ESLint, Stylelint, Markdownlint, Misspell)

[English](./README.en.md) | [日本語](./README.ja.md) | 한국어

## 개요

이 액션은 다음 린트 도구들을 통합하여 실행하고 reviewdog를 통해 결과를 보고합니다:

- ESLint (with Prettier)
- Stylelint
- Markdownlint
- Misspell

👉 [상세 아키텍처 문서 보기](./아키텍처.md)

## 사용법

```yaml
name: Lint

on: [pull_request]

jobs:
  lint:
    name: Lint Check
    runs-on: ubuntu-latest
    permissions: # PR에 코멘트를 달기 위한 권한
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: jonsoku-dev/unified-lint-action@v1
        with:
          github_token: ${{ secrets.github_token }}
          reporter: github-pr-review
```

## 입력 매개변수

### 기본 설정

| 매개변수 | 설명 | 필수 | 기본값 |
|----------|------|------|---------|
| `github_token` | GitHub 토큰 | ✅ | `${{ github.token }}` |
| `workdir` | 작업 디렉토리 | ❌ | `.` |
| `reporter` | reviewdog 리포터 | ❌ | `github-pr-review` |
| `filter_mode` | reviewdog 필터 모드 (`added`: 변경된 라인만, `diff_context`: 변경된 라인과 주변 컨텍스트, `file`: 수정된 파일 전체, `nofilter`: 모든 파일) | ❌ | `added` |
| `level` | 리포트 레벨 | ❌ | `info` |
| `fail_level` | 실패 레벨 | ❌ | `warning` |

### 권한 설정

액션이 PR에 코멘트를 달기 위해서는 다음 권한이 필요합니다:

```yaml
permissions:
  contents: read      # 코드를 읽기 위한 권한
  pull-requests: write # PR에 코멘트를 달기 위한 권한
```