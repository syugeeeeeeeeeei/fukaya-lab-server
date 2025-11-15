#!/usr/bin/env bash

# -----------------------------------------------------------------
# justfile から呼び出されるサービス実行スクリプト
# -----------------------------------------------------------------
# 使い方: ./scripts/_run_services.sh <task> "<profile>" "<services>"
# 例: ./scripts/_run_services.sh up "prod" "Entry OruCa"
# -----------------------------------------------------------------

set -euo pipefail

# 1. 変数定義
TASK=$1
PROFILE=$2
SERVICE_LIST=$3

BASE_DIR=$(pwd) # /fukaya-lab-server

# サービスリストを配列に変換
read -ra SERVICES <<< "$SERVICE_LIST"

# ls タスクの処理 ( justfile で SERVICES 変数を表示するだけなのでシンプル)
if [[ "$TASK" == "ls" ]]; then
    for SERVICE in "${SERVICES[@]}"; do
        echo "- $SERVICE"
    done
    exit 0
fi

# サービスごとの実行
for SERVICE in "${SERVICES[@]}"; do
    
    # サービスのディレクトリに移動
    cd "$BASE_DIR/Services/$SERVICE"
    
    SERVICE_JUSTFILE="./justfile"

    # up または build タスクの処理
    if [[ "$TASK" == "up" || "$TASK" == "build" ]]; then
        # [変更] サービス固有の justfile が存在する場合、処理を委譲する
        if [[ -f "$SERVICE_JUSTFILE" ]]; then
            echo "--> 🛠️ Delegating $SERVICE::$TASK to service justfile (Profile: ${PROFILE:-N/A})"
            # [修正点] cd 済みのため、--directory オプションを削除
            just "$TASK" "$PROFILE"
        else
            # [変更] justfile が存在しない場合、以前の共通ロジックをフォールバックとして実行
            echo "--> ℹ️ Running common $SERVICE::$TASK (justfile not found. Profile: ${PROFILE:-dev})"
            
            DOCKER_COMPOSE_COMMAND="docker compose --env-file ../../.env"
            CURRENT_PROFILE=${PROFILE:-dev}
            DOCKER_COMPOSE_COMMAND+=" --profile $CURRENT_PROFILE"
            
            case "$TASK" in
                "up")
                    $DOCKER_COMPOSE_COMMAND up -d
                    ;;
                "build")
                    $DOCKER_COMPOSE_COMMAND build
                    ;;
            esac
        fi

    # down または down-v タスクの処理 (保守性のため、この共通ロジックに集約を維持)
    elif [[ "$TASK" == "down" || "$TASK" == "down-v" ]]; then
        DOCKER_COMPOSE_COMMAND="docker compose --env-file ../../.env"
        
        case "$TASK" in
            "down")
                echo "--> 🛑 Stopping $SERVICE (Common)"
                $DOCKER_COMPOSE_COMMAND down
                ;;
            "down-v")
                echo "--> 🗑️ Stopping $SERVICE and deleting volumes (Common)"
                $DOCKER_COMPOSE_COMMAND down --volumes
                ;;
        esac

    else
        # サービス固有 justfile の呼び出し (非ジェネリックタスク: backup/restoreなど)
        if [[ -f "$SERVICE_JUSTFILE" ]]; then
            echo "--> 🛠️ Running $SERVICE::$TASK (Profile: ${PROFILE:-N/A})"
            # [修正点] cd 済みのため、--directory オプションを削除
            just "$TASK" "$PROFILE"
        else
            echo "--> ℹ️ Skipping $SERVICE::$TASK - justfile not found for non-generic task."
        fi
    fi

    # ベースディレクトリに戻る
    cd "$BASE_DIR"

done