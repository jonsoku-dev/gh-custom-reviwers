# Unified Lint Action

[![Release](https://github.com/jonsoku-dev/unified-lint-action/workflows/Release/badge.svg)](https://github.com/jonsoku-dev/unified-lint-action/releases)
[![Reviewdog](https://github.com/jonsoku-dev/unified-lint-action/workflows/Reviewdog/badge.svg)](https://github.com/jonsoku-dev/unified-lint-action/actions?query=workflow%3AReviewdog)

> 統合リントGitHubアクション（ESLint、Stylelint、Markdownlint、Misspell）

[English](./README.en.md) | 日本語 | [한국어](./README.md)

## 概要

このアクションは、以下のリントツールを統合して実行し、reviewdogを通じて結果を報告します：

- ESLint（Prettier付き）
- Stylelint
- Markdownlint
- Misspell

👉 [詳細なアーキテクチャドキュメントを見る](./アーキテクチャ.md)

## 使用方法

```yaml
name: Lint

on: [pull_request]

jobs:
  lint:
    name: Lint Check
    runs-on: ubuntu-latest
    permissions: # PRにコメントするために必要な権限
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: jonsoku-dev/unified-lint-action@v1
        with:
          github_token: ${{ secrets.github_token }}
          reporter: github-pr-review
```

## 入力パラメータ

### 基本設定

| パラメータ | 説明 | 必須 | デフォルト値 |
|------------|------|------|--------------|
| `github_token` | GitHubトークン | ✅ | `${{ github.token }}` |
| `workdir` | 作業ディレクトリ | ❌ | `.` |
| `reporter` | reviewdogレポーター | ❌ | `github-pr-review` |
| `filter_mode` | reviewdogフィルターモード (`added`: 変更された行のみ, `diff_context`: 変更された行とその周辺, `file`: 修正されたファイル全体, `nofilter`: すべてのファイル) | ❌ | `added` |
| `level` | レポートレベル | ❌ | `info` |
| `fail_level` | 失敗レベル | ❌ | `warning` |

### 権限設定

アクションがPRにコメントするには以下の権限が必要です：

```yaml
permissions:
  contents: read      # コードを読み取るための権限
  pull-requests: write # PRにコメントするための権限
```