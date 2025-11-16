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

SERVICES := shell("awk '/\\[group\\(\"Services\"\\)\\]/ { f=1; next } f && /^mod / { print $2; f=0 }' justfile | paste -sd ' '")

[group("Services")]
mod Entry "./Services/Entry"
[group("Services")]
mod OruCa "./Services/OruCa"
[group("Services")]
mod Homepage "./Services/Homepage"
[group("Services")]
mod Portainer "./Services/Portainer"
[group("Services")]
mod ProjectBotany "./Services/ProjectBotany"
# [group("Services")]
# mod GitLab "./Services/GitLab"

NETWORK := "fukaya-lab-network"
ENV_FILE := ".env"
ENV_EXAMPLE_FILE := ".env.example"

# -----------------------------------------------------------------
#  🏁 初期セットアップ (追加)
# -----------------------------------------------------------------

[doc("環境設定 (.env) とネットワークの初期セットアップを行います。")]
init:
  @just _setup-env
  @just _setup-network

[private]
_setup-env:
  @[[ -f "{{ENV_FILE}}" ]] && (echo "==> ℹ️ '{{ENV_FILE}}' は既に存在するため、コピーをスキップします。") || (echo "==> 📄 '{{ENV_EXAMPLE_FILE}}' から '{{ENV_FILE}}' を作成します..." && cp "{{ENV_EXAMPLE_FILE}}" "{{ENV_FILE}}")


# -----------------------------------------------------------------
#  📦 全体 サービス管理 (Global Tasks)
# -----------------------------------------------------------------

# [修正] 実行順序はそのまま。_run_services.shにprofileを渡し、内部で処理を分岐させる
[private]
_run task profile services:
  @./scripts/_run_services.sh {{task}} "{{profile}}" "{{services}}"

# -----------------------------------------------------------------
# 🛠️ [修正箇所] 
# set -u (unbound variable) エラーを回避するため、
# 変数定義とロジックを単一のシェルセッション (@ 1行) にまとめる
# -----------------------------------------------------------------
[doc("全サービス (または指定したサービス) を並列で起動します。 (profile: dev/prod, default: dev)")]
up profile='dev' *services:
  @echo "==> 🚀 Pods/コンテナの起動を開始します... (Profile: {{profile}})"
  @services_to_run="{{services}}"; \
  if [[ -z "${services_to_run}" ]]; then \
      services_to_run="{{SERVICES}}"; \
      echo "==> ℹ️ 起動サービスの指定がないため、全サービス ({{SERVICES}}) を対象とします。"; \
  fi; \
  just _run 'up' "{{profile}}" "${services_to_run}"
  @echo "==> ✅ 'up' タスクがターゲットに対して完了しました。"

[doc("全サービス (または指定したサービス) を並列で停止します。")]
down *services:
  @echo "==> 🛑 Pods/コンテナの停止を開始します..."
  @services_to_run="{{services}}"; \
  if [[ -z "${services_to_run}" ]]; then \
      services_to_run="{{SERVICES}}"; \
      echo "==> ℹ️ 停止サービスの指定がないため、全サービス ({{SERVICES}}) を対象とします。"; \
  fi; \
  just _run 'down' "" "${services_to_run}"
  @echo "==> ✅ 'down' タスクがターゲットに対して完了しました。"

[doc("全サービス (または指定したサービス) を停止し、ボリュームも削除します。")]
down-v *services:
  @echo "==> 🗑️ Pods/コンテナを停止し、ボリュームを削除します..."
  @services_to_run="{{services}}"; \
  if [[ -z "${services_to_run}" ]]; then \
      services_to_run="{{SERVICES}}"; \
      echo "==> ℹ️ 停止サービスの指定がないため、全サービス ({{SERVICES}}) を対象とします。"; \
  fi; \
  just _run 'down-v' "" "${services_to_run}"
  @echo "==> ✅ 'down-v' タスクがターゲットに対して完了しました。"

[doc("全サービス (または指定したサービス) を並列でビルドします。 (profile: dev/prod, default: dev)")]
build profile='dev' *services:
  @echo "==> 🏗️ サービスのビルドを開始します... (Profile: {{profile}})"
  @services_to_run="{{services}}"; \
  if [[ -z "${services_to_run}" ]]; then \
      services_to_run="{{SERVICES}}"; \
      echo "==> ℹ️ ビルドサービスの指定がないため、全サービス ({{SERVICES}}) を対象とします。"; \
  fi; \
  just _run 'build' "{{profile}}" "${services_to_run}"
  @echo "==> ✅ 'build' タスクがターゲットに対して完了しました。"
# -----------------------------------------------------------------
# 🛠️ [修正ここまで]
# -----------------------------------------------------------------

# -----------------------------------------------------------------
#  🌐 ネットワーク (プライベートタスク)
# -----------------------------------------------------------------
[private]
_setup-network:
  @docker network inspect {{NETWORK}} >/dev/null 2>&1 && (echo "==> ℹ️ Dockerネットワーク '{{NETWORK}}' は既に存在します。") || (echo "==> 🌐 Dockerネットワーク '{{NETWORK}}' を作成します..." && docker network create --driver=bridge --subnet=172.20.0.0/24 {{NETWORK}})

[doc("Docker ネットワークを削除します。")]
delete-network:
  @docker network inspect {{NETWORK}} >/dev/null 2>&1 && (echo "==> 🌐 Dockerネットワーク '{{NETWORK}}' を削除します..." && docker network rm {{NETWORK}}) || (echo "==> ℹ️ Dockerネットワーク '{{NETWORK}}' は存在しません。")

# -----------------------------------------------------------------
#  🩺 モニタリング
# -----------------------------------------------------------------

[doc("利用可能な全サービス (SERVICES 変数) の一覧を表示します。")]
ls:
  @echo "==> 📋 利用可能なサービス (SERVICESリスト内)"
  @just _run 'ls' "" ""

[doc("実行中のコンテナ (docker ps) を表示します。")] 
ps:
  @echo "==> 🏃 実行中のコンテナ (docker ps)"
  @docker ps

# -----------------------------------------------------------------
#  🖥️ コンテナ化対象外 (AppFlowy)
# -----------------------------------------------------------------
[doc("AppFlowy (コンテナ化対象外) を起動します。")]
appflowy-up:
  @echo "==> 🚀 AppFlowy (非コンテナ) の起動を開始します..."
  @docker run -d --rm --name appflowy \
      --network=host \
      -e DISPLAY=$DISPLAY \
      -e NO_AT_BRIDGE=1 \
      -v $HOME/.Xauthority:/root/.Xauthority:rw \
      -v /tmp/.X11-unix:/tmp/.X11-unix \
      -v /dev/dri:/dev/dri \
      -v /var/run/dbus/system_socket:/var/run/dbus/system_socket \
      --device /dev/dri \
      appflowy/appflowy:latest

[doc("AppFlowy (コンテナ化対象外) を停止します。")]
appflowy-down:
  @echo "==> 🛑 AppFlowyの停止を開始します..."
  @docker stop appflowy