# Headroom — トークン圧縮

## 状態
- **プロキシ**: `http://127.0.0.1:8787` で永続稼働中
- **MCP**: Codex に登録済み
- **永続デプロイ**: `headroom install apply --target codex` で設定済み

## 再起動後に使えるMCPツール
- `headroom_compress` — テキスト/コード/JSON を圧縮
- `headroom_retrieve` — 圧縮前の元データを取得
- `headroom_stats` — 圧縮統計を表示

## 管理コマンド
```bash
.venv/bin/headroom install status   # デプロイ状態確認
.venv/bin/headroom install restart  # 再起動
.venv/bin/headroom perf             # 圧縮率確認
```
