// api/infrastructure/server/ServerHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import { HttpHandler } from "@infra/server/http/HttpHandler";
import { WebSocketHandler } from "@infra/server/websocket/WebSocketHandler";
import express from 'express';
import * as http from "http";
import * as cron from "node-cron"; // 変更: node-cron をインポート
// import mysql from "mysql2/promise"; // 不要

export class ServerHandler {
	private httpServer: http.Server;
	private app: express.Express;
	// private connectionPool: mysql.PoolConnection; // 削除
	private dbHandler: DatabaseHandler; // 追加
	private webSocketHandler: WebSocketHandler;
	private httpHandler: HttpHandler;

	constructor(app: express.Express, dbHandler: DatabaseHandler) { // 引数を DatabaseHandler に変更
		this.app = app;
		this.dbHandler = dbHandler; // DatabaseHandler を保持

		this.httpServer = http.createServer(app);

		// WebSocketHandler を初期化し、dbHandler を渡す
		this.webSocketHandler = new WebSocketHandler(this.httpServer, this.dbHandler);

		// HttpHandler を初期化し、dbHandler を渡す
		this.httpHandler = new HttpHandler(
			this.app,
			this.dbHandler,
			this.webSocketHandler.broadcastData.bind(this.webSocketHandler)
		);

		// 変更: 日次リセットタスクをスケジュール
		this.scheduleDailyReset();
	}

	public getServer(): http.Server {
		return this.httpServer;
	}

	// 変更: ここから追加
	/**
	 * 毎日 00:00 (JST) に全ユーザーを退室させる Cron ジョブをスケジュールします。
	 */
	private scheduleDailyReset() {
		// '0 0 0 * * *' = 毎日 0時0分0秒
		// タイムゾーンを 'Asia/Tokyo' に指定
		cron.schedule(
			"0 0 0 * * *",
			async () => {
				console.log(
					"Running daily reset task: setting all users to out of room..."
				);
				try {
					// DB更新メソッドを呼び出し (DataBaseHandler.ts に追加済みと仮定)
					const affectedRows = await this.dbHandler.setAllUsersOutOfRoom();

					// 1人以上が退室処理された場合のみブロードキャスト
					if (affectedRows > 0) {
						// データベース更新後、全クライアントに最新データをブロードキャスト
						await this.webSocketHandler.broadcastData();
						console.log(
							"Daily reset: Broadcasted updated data to all clients."
						);
					} else {
						console.log("Daily reset: No users were in room. No broadcast needed.");
					}
				} catch (err) {
					console.error("Failed to run daily reset task:", err);
				}
			},
			{
				timezone: "Asia/Tokyo",
			}
		);

		console.log("Daily reset task scheduled for 00:00 JST.");
	}
	// 変更: ここまで追加
}