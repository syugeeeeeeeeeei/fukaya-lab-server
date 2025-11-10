# main.py
# FeliCaカードリーダーを制御し、読み取った学生IDをAPIサーバーのWebSocketエンドポイントに同期的にPubするスクリプト。
# カードがリーダーから離れたとき（on_release）に一度だけPubすることで、カード滞留時の多重送信を防ぎます。

import nfc # NFC通信ライブラリ
from nfc.tag import Tag
from nfc.tag.tt3 import BlockCode, ServiceCode
from typing import cast
import time
import json
# 修正: create_connection は websocket モジュールから直接インポートするのではなく、
# モジュール全体をインポートしてから `websocket.create_connection` として呼び出します。
import websocket # 同期WebSocketクライアントライブラリ

class NFCReaderPublisher:
    # ----------------------------------------------------------------------
    # クラス定数と初期化
    # ----------------------------------------------------------------------
    SYSTEM_CODE = 0xFE00 # FeliCaのシステムコード
    # APIサーバーが立てるWebSocketサーバーのURL
    WS_SERVER_URL = "ws://api:3000/log/write" # APIサーバーのWebSocketエンドポイント

    def __init__(self):
        # カードが接続されたときにIDを一時的に保持するためのインスタンス変数
        # Noneでない場合のみ、on_release時にPub処理が実行されます。
        self._card_id_to_publish: str | None = None
        print(f"NFCリーダーパブリッシャーを初期化しました。WS接続先: {self.WS_SERVER_URL}")

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
    # WebSocket Pubメソッド
    # ----------------------------------------------------------------------
    def publish_student_id(self, student_ID: str):
        """
        指定された学生IDをAPIサーバーのWebSocketエンドポイントにメッセージとして送信（Pub）する。
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
            # 修正: websocket.create_connection を使って接続を確立
            print(f"接続試行中... API WSサーバー: {self.WS_SERVER_URL}")
            ws = websocket.create_connection(self.WS_SERVER_URL, timeout=5)
            ws.send(message)
            print(f"🟢 ID:{student_ID} をAPIサーバーに正常に発行しました。")
            ws.close()
            
        except Exception as e:
            print(f"🔴 API WSサーバーへの発行エラー: {e}")

    # ----------------------------------------------------------------------
    # カード接続時コールバックメソッド (IDをインスタンス変数に保存)
    # ----------------------------------------------------------------------
    def on_connect(self, tag: Tag) -> bool:
        """
        NFCリーダーにFeliCaカードが接続された際に呼び出されるコールバック。
        IDを読み取り、Pubせずに一時保存します。（多重送信防止のため）
        """
        print("✨ カードが接続されました。データを読み取ります...")
        
        # 接続されたタグがFeliCa Standardタイプか、かつ設定されたシステムコードをサポートしているかを確認
        if isinstance(tag, nfc.tag.tt3_sony.FelicaStandard) and self.SYSTEM_CODE in tag.request_system_code():
            try:
                # 1. カードから学生IDを抽出（静的メソッドとして呼び出し）
                student_ID = self.get_student_ID(tag)
                
                # 2. PubせずにIDをインスタンス変数に保存
                self._card_id_to_publish = student_ID
                print(f"IDを抽出・保存しました: {student_ID}。カードが離れるのを待って発行します。")
                
            except Exception as e:
                print(f"🔴 カード処理中のエラー: {e}")
                self._card_id_to_publish = None # エラー時はクリア
                
        # 処理が完了したら接続セッションを終了し、次のポーリングに移る
        return True 

    # ----------------------------------------------------------------------
    # カード解放時コールバックメソッド (IDをPub)
    # ----------------------------------------------------------------------
    def on_release(self, tag) -> bool:
        """
        FeliCaカードがリーダーから離れた際に呼び出されるコールバック。
        保存されたIDがあればPubし、インスタンス変数をクリアします。
        """
        
        if self._card_id_to_publish is not None:
            print(f"🎉 カードが離されました。保存されたIDを発行します: {self._card_id_to_publish}")
            
            # 1. Pub処理を実行
            self.publish_student_id(self._card_id_to_publish)
            
            # 2. Pubが完了したらIDをクリア（多重Pub防止）
            self._card_id_to_publish = None
        else:
            # カードが読み取れなかった場合などは何もせず終了
            pass
            
        # Trueを返すと次のポーリングが開始される
        return True

# ----------------------------------------------------------------------
# メイン処理 (クラス実行に変更)
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
                                    "on-connect": publisher.on_connect, # カード接続時のコールバック
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