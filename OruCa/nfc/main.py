# main.py
# FeliCaカードリーダーを制御し、読み取った学生IDをAPIサーバーのWebSocketエンドポイントに同期的に送信するスクリプト。
# タップした瞬間に送信し、カードがリーダーに置かれたままの場合の連続送信（多重送信）を防ぐ処理を含みます。

import nfc # NFC通信ライブラリ
from nfc.tag import Tag
from nfc.tag.tt3 import BlockCode, ServiceCode
from typing import cast
import time
import json
from websocket import create_connection # 同期WebSocketクライアントライブラリ

class NFCReaderPublisher:
    # ----------------------------------------------------------------------
    # クラス定数と初期化
    # ----------------------------------------------------------------------
    SYSTEM_CODE = 0xFE00 # FeliCaのシステムコード
    # APIサーバーが立てるWebSocketサーバーのURL
    WS_SERVER_URL = "ws://oruca-api:3000/log/write" # APIサーバーのWebSocketエンドポイント

    def __init__(self):
        # 連続送信を防ぐため、直前に読み取ったIDを保持する変数
        # カードが離されたとき(on_release)にクリアされます
        self._last_read_id: str | None = None
        print(f"NFCリーダーパブリッシャーを初期化しました。WebSocket接続先: {self.WS_SERVER_URL}")

    # ----------------------------------------------------------------------
    # 静的メソッド: 学生ID抽出関数
    # ----------------------------------------------------------------------
    @staticmethod
    def get_student_ID(tag: Tag) -> str:
        """
        FeliCaタグオブジェクトから学生ID（または職員ID）を読み取る。
        このメソッドはインスタンスの状態に依存しないため、静的メソッドとして定義します。
        """
        sc = ServiceCode(106, 0b001011) 
        bc = BlockCode(0)

        # 暗号化なしでデータを読み取る
        student_id_bytearray = cast(bytearray, tag.read_without_encryption([sc], [bc]))
        
        # バイトデータをUTF-8でデコード
        full_id_string = student_id_bytearray.decode("utf-8")
        role_classification = full_id_string[0:2] # ロール分類コード（最初の2文字）
        
        # ロール分類コードに基づいてIDを抽出
        match role_classification:
            case "01" | "02": # 学生 
                # ロール分類コードの後に続く7文字をIDとして返す (例: XXAAAAAAA)
                return full_id_string[2:9]
            case "11": # 職員
                # ロール分類コードの後に続く7文字をIDとして返す
                return full_id_string[2:9]
            case _:
                # 未知のロール分類コードの場合
                raise Exception(f"未知のロール分類コード: {role_classification}")

    # ----------------------------------------------------------------------
    # WebSocket 送信メソッド
    # ----------------------------------------------------------------------
    def publish_student_id(self, student_ID: str):
        """
        指定された学生IDをAPIサーバーのWebSocketエンドポイントにメッセージとして送信する。
        """
        # サーバーに送信するデータペイロードをJSON形式で構築
        send_data = {
            "type": "log/write", # 💡 メッセージタイプ
            "payload": {
                "result": True,
                "content": {"student_ID": student_ID},
                "message": f"NFCカードIDが読み取られました: {student_ID}"
            }
        }
        message = json.dumps(send_data)
        
        try:
            # websocket.create_connection を使って接続を確立
            print(f"接続試行中... API WebSocketサーバー: {self.WS_SERVER_URL}")
            ws = create_connection(self.WS_SERVER_URL, timeout=5)
            
            # サーバー接続時に送られてくる初期データを受信して待機する（即時切断エラー防止）
            ws.recv()

            ws.send(message)
            print(f"🟢 ID:{student_ID} をAPIサーバーに正常に送信しました。")
            ws.close()
            
        except Exception as e:
            print(f"🔴 API WebSocketサーバーへの送信エラー: {e}")

    # ----------------------------------------------------------------------
    # カード接続時コールバックメソッド (検知して即座に送信)
    # ----------------------------------------------------------------------
    def on_connect(self, tag: Tag) -> bool:
        """
        NFCリーダーにFeliCaカードが接続された際に呼び出されるコールバック。
        IDを読み取り、連続送信でなければ即座に送信します。
        """
        print("✨ カードが接続されました。データを読み取ります...")
    
        # 接続されたタグがFeliCa Standardタイプか、かつ設定されたシステムコードをサポートしているかを確認
        if isinstance(tag, nfc.tag.tt3_sony.FelicaStandard) and self.SYSTEM_CODE in tag.request_system_code():
        
            # 読み書き処理の前に、指定したシステムコードでポーリングを行う必要がある
            try:
                tag.idm, tag.pmm, *_ = tag.polling(self.SYSTEM_CODE)
            except Exception as e:
                print(f"🔴 ポーリング失敗: {e}")
                return True # ポーリング失敗時は処理を中断

            try:
                # 1. カードから学生IDを抽出（静的メソッドとして呼び出し）
                student_ID = self.get_student_ID(tag)

                # 2. 直前に読み取ったIDと異なる場合のみ送信処理を行う（連続送信防止）
                if self._last_read_id != student_ID:
                    print(f"🎉 新しいカードを検知しました。IDを送信します: {student_ID}")
                    self.publish_student_id(student_ID)
                    
                    # 3. 送信済みのIDとして記録する
                    self._last_read_id = student_ID
                else:
                    # 同じカードが置かれ続けている場合は送信をスキップ
                    print(f"💡 カードが置かれたままです。ID:{student_ID} の連続送信をスキップします。")

            except Exception as e:
                print(f"🔴 カード処理中のエラー: {e}")
                print("--- FeliCa読み取り失敗: 試行したサービスコードとブロックコードを確認してください ---")
                
        # 処理が完了したら接続セッションを終了し、次のポーリングに移る
        return True
    
    # ----------------------------------------------------------------------
    # カード解放時コールバックメソッド (状態のリセット)
    # ----------------------------------------------------------------------
    def on_release(self, tag) -> bool:
        """
        FeliCaカードがリーダーから離れた際に呼び出されるコールバック。
        連続送信防止のための状態をリセットします。
        """
        print("👋 カードがリーダーから離されました。連続送信防止状態をリセットします。")
        
        # カードが離されたら保持していたIDをクリアし、次回タッチ時に再度送信できるようにする
        self._last_read_id = None
            
        # Trueを返すと次のポーリングが開始される
        return True

# ----------------------------------------------------------------------
# メイン処理
# ----------------------------------------------------------------------
def main():
    """
    NFCリーダーへの接続と無限ループでのポーリング処理を管理するメイン関数。
    """
    # NFCReaderPublisherのインスタンスを作成
    publisher = NFCReaderPublisher()
    
    while True:
        try:
            # NFCリーダー (Contactless Frontend) をUSB接続で初期化
            with nfc.ContactlessFrontend("usb") as clf:
                print("NFCリーダーが接続されました。カードを待機中です...")
                
                while True:
                    # カードの接続を待機し、イベント発生時にコールバック関数を呼び出す
                    clf.connect(rdwr={
                                    "on-connect": publisher.on_connect, # カード検知時のコールバック
                                    "on-release": publisher.on_release, # カード解放時のコールバック
                                    "iterations":1}, # 接続試行を1回行う（カードが認識されるまでループ）
                                    )
        except Exception as e:
            # NFCリーダーの接続自体に失敗した場合（リーダーが抜かれたなど）のエラーハンドリング
            print(f"🔴 NFCリーダー接続エラー: {e}")
            # エラー発生後に2秒間待機し、再接続を試みる
            time.sleep(2)

if __name__ == "__main__":
    main()