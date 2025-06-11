# BTC アービトラージ監視システム

ビットコインの価格差を監視し、アービトラージ機会を検知するWebアプリケーションです。

## 機能

- **リアルタイム価格監視**: bitFlyer、Coincheck、Zaif、GMOコイン、bitbankから5秒毎にBTC/JPY価格を取得
- **アービトラージ検知**: 取引所間の価格差が1%以上の機会を自動検知
- **リアルタイム表示**: WebSocketを使用したリアルタイム価格更新
- **取引履歴**: 価格データとアービトラージ機会をSQLiteに保存
- **シンプルUI**: 直感的な価格一覧表示とハイライト通知

## セットアップ

### 1. 依存関係のインストール

```bash
# ルートディレクトリで
npm run install-deps
```

### 2. アプリケーションの起動

```bash
# 開発モード（サーバーとクライアントを同時起動）
npm run dev
```

または個別に起動:

```bash
# サーバーのみ
npm run server

# クライアントのみ（別ターミナル）
npm run client
```

### 3. アクセス

- フロントエンド: http://localhost:3000
- API: http://localhost:3001

## API エンドポイント

- `GET /api/prices` - 現在の価格とアービトラージ機会
- `GET /api/history` - 過去の価格・アービトラージ履歴
   - 例: `curl http://localhost:3001/api/history` を実行すると、ターミナルにJSON形式で履歴が出力されます。

## 技術スタック

- **バックエンド**: Node.js, Express, WebSocket, SQLite
- **フロントエンド**: React
- **API**: bitFlyer、Coincheck、Zaif、GMOコイン、bitbank公開API

## 設定

- アービトラージ検知閾値: 1%（`server/arbitrage.js`で変更可能）
- 価格取得間隔: 5秒（`server/index.js`で変更可能）

## データベース

SQLiteデータベース（`server/arbitrage.db`）に以下を保存:
- 価格履歴（`price_history`テーブル）
- アービトラージ機会（`arbitrage_opportunities`テーブル）