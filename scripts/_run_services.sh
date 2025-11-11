#!/bin/sh
# _run_services.sh

# エラーが発生したらスクリプトを停止
set -e

# --- 引数の解析 ---
TASK="$1"           # 'up', 'down', 'build', 'ls'
DEFAULT_SERVICES="$2" # "Entry OruCa homepage ..."
TARGET_SERVICES="$3"  # "OruCa homepage" (引数で指定された場合) または "" (空文字列)

# --- 実行対象サービスの決定 ---
SERVICES_TO_RUN=""
if [ "$TASK" = "ls" ]; then
  # 'ls' は常に全サービスを対象とする
  SERVICES_TO_RUN="$DEFAULT_SERVICES"
elif [ -n "$TARGET_SERVICES" ]; then
  # 引数で指定されたサービスを使用
  SERVICES_TO_RUN="$TARGET_SERVICES"
else
  # 引数がなければ、デフォルトの全サービスを使用
  SERVICES_TO_RUN="$DEFAULT_SERVICES"
fi

# --- 'ls' タスクの処理 ---
if [ "$TASK" = "ls" ]; then
  # 'ls' はリスト表示するだけ
  for service in $SERVICES_TO_RUN; do
    echo " - $service"
  done
  exit 0 # 処理終了
fi

# --- [ここから追加] サービスの存在チェック (ls 以外) ---
# TARGET_SERVICES が指定された (空でない) 場合のみ、検証を行う。
if [ -n "$TARGET_SERVICES" ]; then
  INVALID_SERVICES=""
  
  # SERVICES_TO_RUN (TARGET_SERVICES と同じ) をループ
  for service in $SERVICES_TO_RUN; do
    found=0
    # DEFAULT_SERVICES (定義済みリスト) をループして一致を探す
    for default_service in $DEFAULT_SERVICES; do
      if [ "$service" = "$default_service" ]; then
        found=1
        break
      fi
    done
    
    # DEFAULT_SERVICES に存在しなかった場合
    if [ $found -eq 0 ]; then
      # 見つからなかったサービス名を記録 (先頭にスペースが入る)
      INVALID_SERVICES="$INVALID_SERVICES $service"
    fi
  done
  
  # 見つからないサービスが1つでもあった場合
  if [ -n "$INVALID_SERVICES" ]; then
    echo "" # エラーを見やすくするため改行
    echo "🚨 エラー: 以下のサービスは定義されていません。" >&2
    echo "           (ルート justfile の 'SERVICES' 変数を確認してください)" >&2
    echo "  -> $INVALID_SERVICES" >&2
    echo "" # 改行
    exit 1 # エラーでスクリプト終了
  fi
fi
# --- [ここまで追加] ---


# --- 'up', 'down', 'build' タスクの処理 ---
echo "--> (Target services: $SERVICES_TO_RUN)"

# --- 各サービスに対するタスクを並列実行 ---
PID_LIST=""
for service in $SERVICES_TO_RUN; do
  echo "--- Running '$TASK' for $service ---"
  
  # justコマンドをバックグラウンド(&)で実行
  just "$service::$TASK" &
  
  # 実行したプロセスのID(PID)を記録
  PID_LIST="$PID_LIST $!"
done

# --- 全てのバックグラウンド処理の終了を待つ ---
echo "--> Waiting for all tasks to complete..."
EXIT_CODE=0
for pid in $PID_LIST; do
  # waitコマンドでジョブの終了を待つ
  # 失敗したジョブがあれば、EXIT_CODEを1に設定
  if ! wait "$pid"; then
    EXIT_CODE=1
  fi
done

echo "--> All tasks completed."
# 失敗したジョブが1つでもあれば、スクリプト全体をエラー終了させる
exit $EXIT_CODE