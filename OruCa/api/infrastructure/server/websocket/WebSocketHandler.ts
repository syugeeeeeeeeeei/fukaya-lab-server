// api/infrastructure/server/websocket/WebSocketHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import { MessageHandler } from "@infra/server/websocket/MessageHandler";
import { TWsMessage } from "@src/config";
import { sendWsMessage } from "@src/utils";
import * as http from "http";
// import mysql from "mysql2/promise"; // 直接は使用しないのでコメントアウトまたは削除
import * as WebSocket from "ws";

export class WebSocketHandler {
	private wss: WebSocket.WebSocketServer;
	// private connectionPool: mysql.PoolConnection; // 削除
	private dbHandler: DatabaseHandler; // 追加
	private messageHandler: MessageHandler;

	constructor(httpServer: http.Server, dbHandler: DatabaseHandler) { // 引数を DatabaseHandler に変更
		this.wss = new WebSocket.WebSocketServer({ server: httpServer });
		this.dbHandler = dbHandler; // DatabaseHandler を保持

		// MessageHandlerのインスタンスを作成し、dbHandler を渡す
		this.messageHandler = new MessageHandler(this.wss, this.dbHandler);

		this.initializeWebSocketServer();
	}

	private initializeWebSocketServer() {
		this.wss.on("connection", (ws: WebSocket.WebSocket) => {
			this.handleConnection(ws);
		});
	}

	private async handleConnection(ws: WebSocket.WebSocket) {
		console.log("クライアントが接続しました");

		try {
			// 初期データをこのクライアントに送信
			const initialLogs = await this.messageHandler.fetchLogs();
			sendWsMessage(ws, {
				type: "log/fetch",
				payload: {
					result: true,
					content: initialLogs,
					message: "クライアント接続時の初期データ" // メッセージをより具体的に
				}
			});
		} catch (error) {
			console.error("初期データ送信エラー:", error);
			sendWsMessage(ws, {
				type: "log/fetch",
				payload: {
					result: false,
					content: [],
					message: "初期データの取得に失敗しました。"
				}
			});
		}


		// メッセージ受信処理
		ws.on("message", async (message) => { // async に変更
			try {
				const data: TWsMessage = JSON.parse(message.toString("utf-8"));
				const handler = this.messageHandler.handlers[data.type];
				console.log("受信メッセージタイプ:", data.type); // ログを少し変更
				if (handler) {
					await handler(ws, data); // handler が Promise を返すようになったので await
				} else {
					console.warn("未定義のメッセージタイプ:", data.type);
				}
			} catch (error) {
				console.error("メッセージ処理エラー:", error);
				// エラー発生時にクライアントに通知することも検討
			}
		});

		ws.on("close", () => {
			console.log("クライアントが切断しました");
		});

		ws.on("error", (error) => {
			console.error("WebSocketエラー:", error);
		});
	}

	public broadcastData(): Promise<void> {
		return this.messageHandler.broadcastData();
	}
}