# Bitcoin Arbitrage Monitoring System - Testing Guide

## 概要

このドキュメントは、Bitcoin Arbitrage Monitoring Systemの包括的なテストスイートについて説明します。

## テストの種類

### 1. ユニットテスト (`tests/unit/`)

各コンポーネントを個別にテストします。

- **ExchangeAPI** (`exchanges.test.js`)
  - 各取引所APIクライアントの動作
  - エラーハンドリング
  - データフォーマット

- **ArbitrageDetector** (`arbitrage.test.js`)
  - アービトラージ機会の検知ロジック
  - 閾値設定
  - 手数料計算

- **Database** (`database.test.js`)
  - SQLite操作
  - データ保存・取得
  - トランザクション処理

### 2. 統合テスト (`tests/integration/`)

システム全体の連携をテストします。

- **API Endpoints** (`api.test.js`)
  - REST API エンドポイントの動作
  - リクエスト/レスポンス形式
  - エラーハンドリング

- **WebSocket** (`websocket.test.js`)
  - リアルタイム通信
  - 接続管理
  - メッセージブロードキャスト

- **External APIs** (`external-apis.test.js`)
  - 実際の取引所APIとの連携
  - レスポンス形式の検証
  - エラー耐性

### 3. パフォーマンステスト (`tests/performance/`)

システムの性能と負荷耐性をテストします。

- **Load Test** (`load-test.test.js`)
  - API応答時間
  - 同時接続処理
  - メモリ使用量
  - ストレステスト

## テストの実行

### 基本的な使用方法

```bash
# ユニットテストの実行
npm test
# または
node tests/test-runner.js unit

# 統合テストの実行（サーバーを起動してから実行）
node tests/test-runner.js integration

# パフォーマンステストの実行
node tests/test-runner.js performance

# 外部API統合テスト（実際のAPIを呼び出す）
node tests/test-runner.js external-api

# カバレッジ付きの全テスト（推奨）
npm run test:coverage
# または
node tests/test-runner.js coverage

# ウォッチモード（開発中）
node tests/test-runner.js watch
```

### 高度なオプション

```bash
# サーバーの状態確認
node tests/test-runner.js --check-server

# テストアーティファクトのクリーンアップ
node tests/test-runner.js --cleanup

# 利用可能なテストタイプを確認
node tests/test-runner.js help
```

## 前提条件

### 統合・パフォーマンステスト
```bash
# サーバーを起動
npm run dev
# または
npm run server
```

### 外部APIテスト
```bash
# 実際のAPIを呼び出すため注意
export SKIP_REAL_API_TESTS=false
npm run test:external-api
```

## テスト設定

### Jest設定 (`tests/setup/jest.config.js`)
- テスト環境の設定
- カバレッジの閾値
- タイムアウト設定

### セットアップファイル (`tests/setup/jest.setup.js`)
- カスタムマッチャー
- テストユーティリティ
- モック設定

## カバレッジ実績

| コンポーネント | 現在のカバレッジ |
|-------------|-------------|
| exchanges.js | 100% (完全テスト済み) |
| arbitrage.js | 72.09% statements, 80% functions |
| database.js | 53.17% statements, 65.85% functions |
| fees.js | 78.12% statements, 83.33% functions |
| **全体** | **64.72% statements, 69.11% functions** |

**総テスト数: 91テスト**
- ユニットテスト: 37テスト
- 統合テスト: 42テスト 
- パフォーマンステスト: 12テスト

## 継続的インテグレーション

テストは以下の環境変数で制御できます：

- `SKIP_REAL_API_TESTS`: 実際のAPIコールをスキップ（default: true）
- `NODE_ENV`: 環境設定（test/development/production）
- `VERBOSE_TESTS`: 詳細なログ出力

## トラブルシューティング

### よくある問題

1. **サーバー接続エラー**
   ```bash
   npm run test:check-server
   ```

2. **外部APIレート制限**
   ```bash
   export SKIP_REAL_API_TESTS=true
   ```

3. **メモリ不足**
   ```bash
   node --max-old-space-size=4096 tests/test-runner.js
   ```

### デバッグ

```bash
# 詳細ログでテスト実行
export VERBOSE_TESTS=true
npm test

# Jest デバッグモード
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 新しいテストの追加

### ユニットテスト
1. `tests/unit/` に `*.test.js` ファイルを作成
2. 適切なモックを設定
3. `describe` と `it` ブロックでテストを構造化

### 統合テスト
1. `tests/integration/` にファイルを作成
2. サーバーが必要な場合は前提条件を記載
3. 実際のHTTP/WebSocket通信をテスト

### パフォーマンステスト
1. `tests/performance/` にファイルを作成
2. 適切なタイムアウトを設定
3. パフォーマンスメトリクスを検証

## ベストプラクティス

1. **テストの独立性**: 各テストは他のテストに依存しない
2. **モックの使用**: 外部依存は適切にモック
3. **エラーテスト**: 正常系だけでなく異常系もテスト
4. **パフォーマンス**: テストの実行時間を適切に管理
5. **メンテナンス性**: テストコードも保守しやすく記述

## レポート

テスト結果は以下で確認できます：

- **コンソール出力**: リアルタイムの結果
- **カバレッジレポート**: `coverage/index.html`
- **ログファイル**: `test-results.log`