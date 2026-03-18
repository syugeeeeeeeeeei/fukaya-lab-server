# .env ファイルを自動で読み込み、シェル環境変数としてエクスポートする
set export := true
set dotenv-load := true

# --- 📦 サービス・モジュールの読み込み ---
mod OruCa
mod homepage
mod Entry

_default:
    @just --list

# --- 🏗️ ビルド (内部用) ---
[parallel]
_build: OruCa::build
    @echo "✅ All required services built."

# --- 🌐 ネットワーク管理 (内部用) ---

# ネットワーク作成 (固定IP割り当てのためサブネットを指定)
_net-create:
    @echo "🌐 Ensuring 'fukaya-lab-network' exists..."
    @docker network create \
      --driver=bridge \
      --subnet=172.20.0.0/24 \
      fukaya-lab-network 2>/dev/null || echo "INFO: Network already exists."

# ネットワーク削除
_net-remove:
    @echo "🗑️ Attempting to remove 'fukaya-lab-network'..."
    @# 他のプロファイル(dev/prod)が起動中の場合、削除に失敗することがありますが、その場合は続行します
    @docker network rm fukaya-lab-network 2>/dev/null || echo "⚠️ Network removal skipped (Likely in use by other containers)."

# ネットワーク再構築 (削除 -> 作成)
_net-reset: _net-remove _net-create

# ==========================================
# 🚀 Production (本番環境)
# ==========================================

# [起動] 本番環境をビルドして起動
up-prod: _net-create _build
    @echo "🚀 Starting Production services..."
    @docker compose --profile prod up -d --build

# [停止] 本番コンテナを停止・削除 (ボリュームは維持)
down-prod:
    @echo "🛑 Stopping Production services..."
    @docker compose --profile prod down

# [再構築] コンテナとネットワークを作り直す (ボリューム維持)
# ネットワーク不調やコンテナ挙動がおかしい時に推奨
refresh-prod: down-prod _net-reset up-prod
    @echo "♻️ Production services refreshed (Network recreated)."

# ==========================================
# 🛠️ Development (開発環境)
# ==========================================

# [起動] 開発環境を起動
up-dev: _net-create
    @echo "🛠️ Starting Development services..."
    @docker compose --profile dev up -d

# [停止] 開発コンテナを停止・削除 (ボリュームは維持)
down-dev:
    @echo "🛑 Stopping Development services..."
    @docker compose --profile dev down

# [再構築] コンテナとネットワークを作り直す (ボリューム維持)
refresh-dev: down-dev _net-reset up-dev
    @echo "♻️ Development services refreshed (Network recreated)."

# ==========================================
# 🩺 Utility & Maintenance (共通)
# ==========================================

# 指定したサービスの再起動 (プロセスのみ再起動・コンテナ維持)
restart *ARGS:
    @echo "🔄 Restarting services (process only): {{ if ARGS == "" { "all" } else { ARGS } }}"
    @docker compose restart {{ARGS}}

# ログを表示
logs *ARGS:
    @echo "📜 Showing logs for: {{ if ARGS == "" { "all services" } else { ARGS } }}"
    @docker compose logs -f {{ARGS}}

# 実行中のサービス一覧を表示
ls:
    @docker compose ps --services

# Dockerリソースの掃除
prune:
    @echo "🧹 Pruning Docker resources..."
    @docker system prune -af

# ==========================================
# ⚠️ Dangerous Zone (危険)
# ==========================================

# 全サービスを停止 (ProdもDevも停止)
down-all:
    @echo "🛑 Stopping ALL services (Prod & Dev)..."
    @docker compose --profile dev --profile prod down

# 【警告】全データ削除 (ボリュームも消えます)
destroy-all:
    @echo "💣 WARNING: Stopping ALL services and REMOVING VOLUMES..."
    @echo "   (All data will be permanently lost!)"
    @docker compose --profile dev --profile prod down -v
    @echo "🗑️ Removing network..."
    @docker network rm fukaya-lab-network 2>/dev/null || true
    @echo "💀 System destroyed."

# --- 🛠️ 初期セットアップ ---
setup: _net-create
    @if [ ! -f .env ]; then cp .env.example .env && echo "📄 Created .env"; else echo "INFO: .env exists."; fi
