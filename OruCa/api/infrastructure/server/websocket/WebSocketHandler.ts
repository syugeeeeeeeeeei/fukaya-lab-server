// api/infrastructure/server/websocket/WebSocketHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler";
import { MessageHandler } from "@infra/server/websocket/MessageHandler";
import { TWsMessage } from "@src/config";
import { sendWsMessage } from "@src/utils";
import * as http from "http";
import * as WebSocket from "ws";

export class WebSocketHandler {
	private wss: WebSocket.WebSocketServer;
	private dbHandler: DatabaseHandler;
	private messageHandler: MessageHandler;

	constructor(httpServer: http.Server, dbHandler: DatabaseHandler) {
		this.wss = new WebSocket.WebSocketServer({ server: httpServer });
		this.dbHandler = dbHandler;

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

		// 【改善点】接続が完全に OPEN 状態になるのを待機する
		// サーバー側の connection イベント直後でも、極稀に準備が整っていないケースへの対策
		if (ws.readyState !== WebSocket.OPEN) {
			await new Promise((resolve) => {
				ws.once("open", resolve);
				// タイムアウトなどで接続が切れた場合も考慮して1回限り
				ws.once("close", resolve);
				ws.once("error", resolve);
			});
		}

		try {
			// 初期データをこのクライアントに送信
			const initialLogs = await this.messageHandler.fetchLogs();

			// 【改善点】送信直前に状態を再確認し、切断されている場合は送信をスキップする
			if (ws.readyState === WebSocket.OPEN) {
				sendWsMessage(ws, {
					type: "log/fetch",
					payload: {
						result: true,
						content: initialLogs,
						message: "クライアント接続時の初期データ"
					}
				});
			}
		} catch (error) {
			console.error("初期データ送信エラー:", error);
			// エラー時も接続状態を確認してから送信
			if (ws.readyState === WebSocket.OPEN) {
				sendWsMessage(ws, {
					type: "log/fetch",
					payload: {
						result: false,
						content: [],
						message: "初期データの取得に失敗しました。"
					}
				});
			}
		}

		// メッセージ受信処理
		ws.on("message", async (message) => {
			try {
				const data: TWsMessage = JSON.parse(message.toString("utf-8"));
				const handler = this.messageHandler.handlers[data.type];
				console.log("受信メッセージタイプ:", data.type);
				if (handler) {
					await handler(ws, data);
				} else {
					console.warn("未定義のメッセージタイプ:", data.type);
				}
			} catch (error) {
				console.error("メッセージ処理エラー:", error);
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