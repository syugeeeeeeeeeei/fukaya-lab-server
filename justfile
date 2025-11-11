# /justfile (ルート)

_default:
  @just --list -u

# -----------------------------------------------------------------
#  設定: プロジェクト・オーケストレーション
# -----------------------------------------------------------------

SERVICES := "Entry OruCa homepage portainer ProjectBotany gitlab"

[group("サブモジュール")]
mod Entry "./Services/Entry"
[group("サブモジュール")]
mod OruCa "./Services/OruCa"
[group("サブモジュール")]
mod homepage "./Services/homepage"
[group("サブモジュール")]
mod portainer "./Services/portainer"
[group("サブモジュール")]
mod ProjectBotany "./Services/ProjectBotany"
[group("サブモジュール")]
mod gitlab "./Services/gitlab"

NETWORK := "fukaya-lab-network"

# -----------------------------------------------------------------
#  📦 全体 サービス管理 (Global Tasks)
# -----------------------------------------------------------------

# [private] 共通の実行スクリプトを呼び出すヘルパー
# $1: タスク (up, down, build, ls)
# $2: 引数で渡されたサービスリスト (services変数)
[private]
_run task services:
    @./_run_services.sh {{task}} "{{SERVICES}}" "{{services}}"

[doc("全サービス (または指定したサービス) を並列で起動します。")]
up *services:
    @just _setup-network
    @echo "==> 🚀 Starting Pods..."
    @just _run 'up' "{{services}}"
    @echo "==> ✅ 'up' task finished for targets."

[doc("全サービス (または指定したサービス) を並列で停止します。")]
down *services:
    @echo "==> 🛑 Stopping Pods..."
    @just _run 'down' "{{services}}"
    @echo "==> ✅ 'down' task finished for targets."

[doc("全サービス (または指定したサービス) を並列でビルドします。")]
build *services:
    @just _setup-network
    @echo "==> 🏗️ Building services..."
    @just _run 'build' "{{services}}"
    @echo "==> ✅ 'build' task finished for targets."

# -----------------------------------------------------------------
#  🌐 ネットワーク (プライベートタスク)
# -----------------------------------------------------------------
[private]
_setup-network:
    @podman network exists {{NETWORK}} || (echo "==> 🌐 Creating network: {{NETWORK}}..." && podman network create {{NETWORK}})

# -----------------------------------------------------------------
#  🩺 モニタリング
# -----------------------------------------------------------------

[doc("利用可能な全サービス (SERVICES 変数) の一覧を表示します。")]
ls:
    @echo "==> 📋 Available Services (in SERVICES list)"
    @just _run 'ls' ""

[doc("実行中の Pod (podman pod ls) を表示します。")]
ps:
    @echo "==> 🏃 Running Pods (podman pod ls)"
    @podman pod ls

# -----------------------------------------------------------------
#  🖥️ Pod化対象外 (AppFlowy)
# -----------------------------------------------------------------
[doc("AppFlowy (Pod化対象外) を起動します。")]
appflowy-up:
    @echo "==> 🚀 Starting AppFlowy (non-Pod)..."
    @podman run -d --rm --name appflowy \
        --network=host \
        -e DISPLAY=$DISPLAY \
        -e NO_AT_BRIDGE=1 \
        -v $HOME/.Xauthority:/root/.Xauthority:rw \
        -v /tmp/.X11-unix:/tmp/.X11-unix \
        -v /dev/dri:/dev/dri \
        -v /var/run/dbus/system_socket:/var/run/dbus/system_socket \
        --device /dev/dri \
        appflowy/appflowy:latest

[doc("AppFlowy (Pod化対象外) を停止します。")]
appflowy-down:
    @echo "==> 🛑 Stopping AppFlowy..."
    @podman stop appflowy