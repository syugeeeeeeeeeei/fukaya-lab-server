# /justfile (ルート)

# -----------------------------------------------------------------
#  設定: プロジェクト・オーケストレーション
# -----------------------------------------------------------------

# [!] 起動可能なサービス（モジュール）のリストを定義
# サービスを追加/削除する際は、ここと下の 'mod' の両方を編集する
SERVICES := "Entry" \
            "OruCa" \
            "homepage" \
            "portainer" \
            "ProjectBotany"
            # "gitlab"

# 各サービス・モジュールを読み込む
mod Entry
mod OruCa
mod homepage
mod portainer
mod ProjectBotany
# mod gitlab

# Podman が使用する共通ネットワーク
NETWORK := "fukaya-lab-network"

# -----------------------------------------------------------------
#  📦 全体 サービス管理 (Global Tasks)
# -----------------------------------------------------------------

# [実行例]
#   just up               # SERVICES リストの全サービスを並列起動
#   just up OruCa         # OruCa のみ起動
#   just up OruCa homepage  # OruCa と homepage を並列起動
[parallel]
up +services:
    @just _setup-network
    @echo "==> 🚀 Starting Pods..."
    @services_to_run := if argc() > 0 { services } else { SERVICES }
    @echo "--> (Target services: {{services_to_run}})"
    @for service in services_to_run {
        # 'just {{service}}::up' を実行する
        @just {{service}}::up
    }
    @echo "==> ✅ 'up' task finished for targets."

# [実行例]
#   just down             # SERVICES リストの全サービスを並列停止
#   just down OruCa       # OruCa のみ停止
[parallel]
down +services:
    @echo "==> 🛑 Stopping Pods..."
    @services_to_run := if argc() > 0 { services } else { SERVICES }
    @echo "--> (Target services: {{services_to_run}})"
    @for service in services_to_run {
        @just {{service}}::down
    }
    @echo "==> ✅ 'down' task finished for targets."

# [実行例]
#   just build            # SERVICES リストの全サービスを並列ビルド
#   just build OruCa      # OruCa のみビルド
[parallel]
build +services:
    @just _setup-network
    @echo "==> 🏗️ Building services..."
    @services_to_run := if argc() > 0 { services } else { SERVICES }
    @echo "--> (Target services: {{services_to_run}})"
    @for service in services_to_run {
        @just {{service}}::build
    }
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

# [実行例] just ls (SERVICES リストを表示)
ls:
    @echo "==> 📋 Available Services (in SERVICES list)"
    @for service in SERVICES {
        echo " - {{service}}"
    }

# [実行例] just ps
ps:
    @echo "==> 🏃 Running Pods (podman pod ls)"
    @podman pod ls

# # -----------------------------------------------------------------
# #  🛠️ サービス固有コマンド (エイリアス)
# # -----------------------------------------------------------------

# # [実行例] just backup-oruca (just OruCa::backup のエイリアス)
# alias backup-oruca := OruCa::backup

# # [実行例] just restore-oruca (just OruCa::restore のエイリアス)
# alias restore-oruca := OruCa::restore

# -----------------------------------------------------------------
#  🖥️ Pod化対象外 (AppFlowy)
# -----------------------------------------------------------------
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