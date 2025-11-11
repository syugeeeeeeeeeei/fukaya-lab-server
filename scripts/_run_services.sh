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

# --- サービスの存在チェック (ls 以外) ---
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

# --- 'up', 'down', 'build' タスクの処理 ---
echo "--> (Target services: $SERVICES_TO_RUN)"

# --- 各サービスに対するタスクを逐次実行 ---
# 実行結果を累積するための変数を初期化
AGGREGATE_EXIT_CODE=0

for service in $SERVICES_TO_RUN; do
  echo "--- Running '$TASK' for $service ---"
  
  # justコマンドをフォアグラウンドで実行し、終了コードをキャプチャ
  # エラーが発生しても set -e で即座に終了させず、次のサービスに移るために `|| true` を付加
  just "$service::$TASK"
  CURRENT_EXIT_CODE=$?
  
  if [ "$CURRENT_EXIT_CODE" -ne 0 ]; then
    echo "--- ⚠️ ERROR: '$service' の '$TASK' が終了コード $CURRENT_EXIT_CODE で失敗しました。 ---" >&2
    # 総合的な終了コードを失敗に設定
    AGGREGATE_EXIT_CODE=1
  else
    echo "--- ✅ '$service' の '$TASK' が正常に完了しました。 ---"
  fi
done

echo "--> All tasks completed."
# 総合的な終了コードを返してスクリプト終了
exit $AGGREGATE_EXIT_CODE