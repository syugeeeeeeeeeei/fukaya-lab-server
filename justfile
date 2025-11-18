_default:
  @just --list -u

# -----------------------------------------------------------------
# 💡 シェル設定
# -----------------------------------------------------------------
# sh: 1: [[: not found エラーを回避するため、レシピの実行シェルを bash に変更します。
set shell := ["bash", "-cu"]

# -----------------------------------------------------------------
#  設定: プロジェクト・オーケストレーション
# -----------------------------------------------------------------

NETWORK := "fukaya-lab-network"
ENV_FILE := ".env"
ENV_EXAMPLE_FILE := ".env.example"

# -----------------------------------------------------------------
#  🏁 初期セットアップ (追加)
# -----------------------------------------------------------------

[doc("環境設定 (.env) とネットワークの初期セットアップを行います。")]
init:
  @just _setup-env
  @just delete-network
  @just create-network

[private]
_setup-env:
  @[[ -f "{{ENV_FILE}}" ]] && (echo "==> ℹ️ '{{ENV_FILE}}' は既に存在するため、コピーをスキップします。") || (echo "==> 📄 '{{ENV_EXAMPLE_FILE}}' から '{{ENV_FILE}}' を作成します..." && cp "{{ENV_EXAMPLE_FILE}}" "{{ENV_FILE}}")

create-network:
  @docker network create \
    --driver bridge \
    --subnet 172.20.0.0/24 \
    --gateway 172.20.0.1 \
    {{NETWORK}} || echo "==> ℹ️ Dockerネットワーク '{{NETWORK}}' は既に存在します。スキップします。"

delete-network:
  @docker network rm {{NETWORK}} || echo "==> ℹ️ Dockerネットワーク '{{NETWORK}}' は存在しません。スキップします。"

up:
  @docker compose -f Services/Infrastructure/docker-compose.yml --env-file {{ENV_FILE}} up -d

down:
  @docker compose -f Services/Infrastructure/docker-compose.yml --env-file {{ENV_FILE}} down