# /Services/ProjectBotany/justfile

# -----------------------------------------------------------------
# 💡 シェル設定
# -----------------------------------------------------------------
# sh: 1: [[: not found エラーを回避するため、レシピの実行シェルを bash に変更します。
set shell := ["bash", "-cu"]

SERVICE_NAME := shell("basename $(pwd)")

_default:
  @just --list -u

# [変更] プロファイル指定に対応
build profile='dev':
    @echo "==> 🔨 Building {{SERVICE_NAME}} (Profile: {{profile}})..."
    @docker compose --env-file ../../.env --profile {{profile}} build

# [変更] プロファイル指定に対応
up profile='dev': build
    @echo "--> 🚀 Starting {{SERVICE_NAME}} (Profile: {{profile}})"
    @docker compose --env-file ../../.env --profile {{profile}} up -d