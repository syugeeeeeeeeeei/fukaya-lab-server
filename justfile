# /fukaya-lab-server/justfile (修正版)

# .env ファイルを自動で読み込み、シェル環境変数としてエクスポートする
set export := true
set dotenv-load := true

# --- 📦 サービス・モジュールの読み込み ---
# 各サービスディレクトリ内の 'justfile' をモジュールとして読み込みます。
mod OruCa
mod gitlab
mod homepage
mod Entry
# ... (将来、固有タスクが必要なサービスをここに追加) ...


# --- 🏗️ ビルド メタタスク ---
# 規約: このタスクは、ビルドが必要な全サービスの 'build' タスクに依存します。
# OruCa::build は、OruCa/justfile 内の 'build' タスクを指します。
# [parallel] 属性により、OruCa::build や将来追加するタスクが並列実行されます。
[parallel]
build: OruCa::build
    @echo "✅ All required services built."


# --- 🚀 プロジェクト基本操作 ---

# [本番] 全サービスをビルドし、全てのサービスを起動します
up-prod: build
    @echo "🚀 Starting all production services..."
    @docker compose --profile prod up -d --build

# [開発] 基礎サービス + OruCa(dev) を起動します
up-dev:
    @echo "🛠️ Starting development services (including OruCa Vite)..."
    @docker compose --profile dev up -d

# 全てのサービスを停止します
down:
    @echo "🛑 Stopping all services..."
    @docker compose down

# 指定したサービスを再起動します (例: just restart oruca-api)
restart *ARGS:
    # 修正点: 'ARGS || ...' を 'if ARGS == "" { ... } else { ... }' 構文に修正
    @echo "🔄 Restarting services: {{ if ARGS == "" { "all" } else { ARGS } }}"
    @docker compose restart {{ARGS}}


# --- 🩺 モニタリング ---

# サービスのログを表示します (例: just logs oruca-api oruca-nfc)
logs *ARGS:
    # 修正点: 'ARGS || ...' を 'if ARGS == "" { ... } else { ... }' 構文に修正
    @echo "📜 Showing logs for: {{ if ARGS == "" { "all services" } else { ARGS } }}"
    @docker compose logs -f {{ARGS}}


# --- 🛠️ 初回セットアップ ---

# (初回のみ) 永続ネットワーク 'fukaya-lab-network' を作成します
net-create:
    @echo "🌐 Creating persistent 'fukaya-lab-network'..."
    @docker network create \
      --driver=bridge \
      --subnet=172.20.0.0/24 \
      fukaya-lab-network || echo "INFO: Network 'fukaya-lab-network' already exists."

# (初回のみ) .env ファイルを .env.example からコピーします
init-env:
    @if [ ! -f .env ]; then \
        echo "📄 Creating .env file from .env.example ..."; \
        cp .env.example .env; \
    else \
        echo "INFO: .env file already exists."; \
    fi

# プロジェクトの初回セットアップ (ネットワーク作成 + .env準備)
setup: net-create init-env
    @echo "🎉 Initial setup complete. Please edit .env file if necessary."


# --- 🔧 運用ユーティリティ ---

# 全サービスのDockerイメージを最新版に更新します
pull:
    @echo "⏬ Pulling latest images for all services..."
    @docker compose pull

# 不要なDockerリソースをクリーンアップします
prune:
    @echo "🧹 Pruning Docker resources (stopped containers, unused networks, dangling images)..."
    @docker system prune -af