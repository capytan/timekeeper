[English](README.md) | [日本語](README.ja.md)

# Timekeeper

スマート通知機能を備えたミーティングタイマー Web アプリ。時間を設定し、重要なタイミングに通知ポイントを追加すると、音声・視覚アラートでお知らせします。すべてブラウザ上で動作し、外部依存なしで利用できます。

## 機能

- **タイマー** — 開始、一時停止、再開、リセット。経過時間は HH:MM:SS 形式で表示され、ブラウザタブのタイトルにも反映されます。
- **プリセット** — 30 / 60 / 90 分の組み込みプリセット（適切な通知ポイント付き）に加え、カスタムモードも利用可能。
- **通知ポイント** — 任意の時刻にラベルと 3 段階の緊急度（info、warning、urgent）を指定してアラートを追加。
- **Web Audio サウンド** — 緊急度ごとに合成音を生成：穏やかなビープ音（info）、上昇するチャイム（warning）、連続ビープ音（urgent）。音量調整可能。
- **ブラウザ通知** — タブがバックグラウンドにあるとき、Notification API を利用してデスクトップ通知を表示。
- **テーマ** — ダーク、ライト、またはシステム設定（OS の設定に追従）。選択はセッション間で保持されます。
- **キーボードショートカット** — `Space` で開始/一時停止、`R` でリセット。
- **永続化** — テーマ、音量、サウンドの有効/無効、アクティブなプリセット、通知ポイントを localStorage に保存。

## はじめに

ビルド不要 — Timekeeper は ES6 modules を使用した静的サイトです。
ブラウザは `file://` プロトコルでの ES module の読み込みをブロックするため、ローカルサーバーが必要です。

```
npx serve .
# または
python3 -m http.server
```

ブラウザで `http://localhost:3000`（または表示されたポート番号）を開いてください。

## プロジェクト構成

```
├── index.html        # エントリーポイント
├── css/
│   └── styles.css    # ダーク/ライトテーマ対応のスタイル
└── js/
    ├── app.js        # 初期化とイベント接続
    ├── timer.js      # タイマーロジック（開始/一時停止/リセット）
    ├── presets.js     # 組み込み＆カスタムプリセットの定義
    ├── ui.js         # DOM レンダリングとアニメーションループ
    ├── state.js      # Pub/Sub リアクティブ状態管理
    ├── theme.js      # テーマ切替と OS 設定の検出
    ├── audio.js      # Web Audio API によるサウンド合成
    ├── scheduler.js  # Web Worker による通知スケジューラー
    ├── notifications.js  # Browser Notification API ラッパー
    └── storage.js    # localStorage 永続化（デバウンス付き）
```

## ブラウザ要件

以下をサポートするモダンブラウザが必要です：

- ES6 modules (`<script type="module">`)
- Web Audio API
- Web Workers（setInterval へのフォールバックあり）
- Notification API（オプション — 段階的に機能低下）
- `crypto.randomUUID()`
