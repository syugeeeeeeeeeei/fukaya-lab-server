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
_build: OruCa::build
    @echo "✅ All required services built."


# --- 🚀 プロジェクト基本操作 ---

# [本番] 全サービスをビルドし、全てのサービスを起動します
up-prod: _build
    @echo "🚀 Starting all production services..."
    @docker compose --profile prod up -d --build

# [開発] 基礎サービス + OruCa(dev) を起動します
up-dev:
    @echo "🛠️ Starting development services (including OruCa Vite)..."
    @docker compose --profile dev up -d

# 全てのサービスを停止します
down:
    @echo "🛑 Stopping all services..."
    @# 開発/本番プロファイルで起動したサービスも確実に停止・削除するため、プロファイルを明示
    @docker compose --profile dev --profile prod down

# 全てのサービスを停止し、関連するボリュームも削除します
# 💥 警告: 関連する名前付きボリュームのデータが消去されます！
down-v:
    @echo "💣 Stopping all services and REMOVING ASSOCIATED VOLUMES..."
    @echo "   (Data will be lost!)"
    @docker compose --profile dev --profile prod down -v

# 指定したサービスを再起動します (例: just restart oruca-api)
restart *ARGS:
    @echo "🔄 Restarting services: {{ if ARGS == "" { "all" } else { ARGS } }}"
    @docker compose restart {{ARGS}}


# --- 🩺 モニタリング ---

# サービスのログを表示します (例: just logs oruca-api oruca-nfc)
logs *ARGS:
    @echo "📜 Showing logs for: {{ if ARGS == "" { "all services" } else { ARGS } }}"
    @docker compose logs -f {{ARGS}}

# 実行中のサービス名リストを表示します
ls:
    @echo "📋 Currently running services:"
    @docker compose ps --services

# 指定したサービスを強制的に再作成します (コンテナのみ)
recreate *ARGS:
    @if [ "{{ARGS}}" = "" ]; then \
        echo "ERROR: Please specify service name(s) to recreate."; \
        exit 1; \
    fi
    @echo "♻️ Forcibly recreating services (container only): {{ARGS}}..."
    @docker compose up -d --force-recreate --no-deps {{ARGS}}
    @echo "✅ Services {{ARGS}} have been recreated."

# 指定したサービスをボリュームごと削除し、再作成します
# 警告: 関連する名前付きボリュームのデータが消去されます！
rebuild *ARGS:
    @if [ "{{ARGS}}" = "" ]; then \
        echo "ERROR: Please specify service name(s) to rebuild."; \
        exit 1; \
    fi
    @echo "💣 WARNING: Rebuilding services {{ARGS}} and REMOVING ASSOCIATED VOLUMES..."
    @echo "   (Data will be lost for these services!)"
    @docker compose down -v {{ARGS}}
    @echo "   (Services stopped and volumes removed. Now recreating with build...)"
    @docker compose up -d --build {{ARGS}}
    @echo "✅ Services {{ARGS}} have been rebuilt."


# --- 🛠️ 初回セットアップ ---

# (初回のみ) 永続ネットワーク 'fukaya-lab-network' を作成します
_net-create:
    @echo "🌐 Creating persistent 'fukaya-lab-network'..."
    @docker network create \
      --driver=bridge \
      --subnet=172.20.0.0/24 \
      fukaya-lab-network || echo "INFO: Network 'fukaya-lab-network' already exists."

# (初回のみ) .env ファイルを .env.example からコピーします
_init-env:
    @if [ ! -f .env ]; then \
        echo "📄 Creating .env file from .env.example ..."; \
        cp .env.example .env; \
    else \
        echo "INFO: .env file already exists."; \
    fi

# プロジェクトの初回セットアップ (ネットワーク作成 + .env準備)
setup: _net-create _init-env
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