# /justfile (ルート)

# -----------------------------------------------------------------
#  設定: プロジェクト・オーケストレーション
# -----------------------------------------------------------------

# 各サービス・モジュールを読み込む
# 固有タスク (build, up, down) は just OruCa::up のように呼び出す
mod Entry
mod OruCa
mod homepage
mod portainer
mod ProjectBotany
# mod gitlab # 未完成

# Podman が使用する共通ネットワーク
NETWORK := "fukaya-lab-network"

# -----------------------------------------------------------------
#  📦 全体 サービス管理 (Global Tasks)
# -----------------------------------------------------------------

# [実行例] just up
# 全サービスの up タスクに依存
[parallel]
up: _setup-network Entry::up OruCa::up homepage::up portainer::up ProjectBotany::up
    @echo "==> ✅ All services started."

# [実行例] just down
# 全サービスの down タスクに依存
[parallel]
down: Entry::down OruCa::down homepage::down portainer::down ProjectBotany::down
    @echo "==> 🛑 All services stopped."

# [実行例] just build
# 全サービスの build タスクに依存
[parallel]
build: _setup-network Entry::build OruCa::build homepage::build portainer::build ProjectBotany::build
    @echo "==> 🏗️ All services built."

# [実行例] just ls (just --list と同じ)
ls:
    @just --list

# [実行例] just ps
ps:
    @echo "==> 🏃 Running Pods (podman pod ls)"
    @podman pod ls

# -----------------------------------------------------------------
#  🌐 ネットワーク (プライベートタスク)
# -----------------------------------------------------------------
# 'up' または 'build' から依存されるプライベートタスク
[private]
_setup-network:
    @podman network exists {{NETWORK}} || (echo "==> 🌐 Creating network: {{NETWORK}}..." && podman network create {{NETWORK}})

# -----------------------------------------------------------------
#  🛠️ サービス固有コマンド (エイリアス)
# -----------------------------------------------------------------

# [実行例] just backup-oruca (just OruCa::backup のエイリアス)
alias backup-oruca := OruCa::backup

# [実行例] just restore-oruca (just OruCa::restore のエイリアス)
alias restore-oruca := OruCa::restore

# -----------------------------------------------------------------
#  🖥️ Pod化対象外 (AppFlowy)
# -----------------------------------------------------------------
# これらはサービスモジュールではないため、ルートにそのまま残す
appflowy-up:
    @echo "==> 🚀 Starting AppFlowy (non-Pod)..."
    @podman run -d --rm --name appflowy \
        --network=host \
        -e DISPLAY=$DISPLAY \
        -e NO_AT_BRIDGE=1 \
        -v $HOME/.Xauthority:/root/.Xauthority:rw \
        -v /tmp/.X11-unix:/tmp/.X11-unix \
        -v /dev/dri:/dev/dri \
        -v /var/run/dbus/system_bus_socket:/var/run/dbus/system_bus_socket \
        --device /dev/dri \
        appflowy/appflowy:latest

appflowy-down:
    @echo "==> 🛑 Stopping AppFlowy..."
    @podman stop appflowy