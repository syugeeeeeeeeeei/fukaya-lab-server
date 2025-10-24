// api/infrastructure/server/http/HttpHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import { SlackService } from "@infra/integrations/SlackServive";
import { DBresult, TWsMessage } from "@src/config";
import { hasProps } from "@src/utils";
import express from "express";
import mysql from "mysql2/promise"; // PoolConnection 型のために残す

export class HttpHandler {
	private dbHandler: DatabaseHandler; // mysql.PoolConnection から DatabaseHandler に変更
	private slackService: SlackService;
	private onDataUpdated: () => Promise<void>;

	constructor(
		app: express.Express,
		dbHandler: DatabaseHandler, // 引数を DatabaseHandler に変更
		onDataUpdated: () => Promise<void>
	) {
		this.dbHandler = dbHandler; // DatabaseHandler を保持
		this.slackService = new SlackService();
		this.onDataUpdated = onDataUpdated;
		this.initializeHttpRoutes(app);
	}

	private initializeHttpRoutes(app: express.Express) {
		app.post("/log/write", express.json(), async (req: express.Request, res: express.Response) => {
			console.log("/log/write");

			const { type, payload } = req.body;
			if (!type ||
				!payload ||
				!hasProps<{ content: string }>(payload, ["content"]) ||
				!hasProps<{ student_ID: string }>(payload.content, ["student_ID"])
			) {
				res.status(400).json({ message: 'データの構造が不正です' });
				return;
			}

			const student_ID = payload.content.student_ID;
			const jsonMsg: TWsMessage = {
				type: "log/write",
				payload: {
					result: false,
					content: [],
					message: "不明なエラー",
				},
			};

			let connection: mysql.PoolConnection | null = null;
			try {
				connection = await this.dbHandler.getConnection(); // 接続を取得
				await connection.execute("CALL insert_or_update_log(?);", [student_ID]);
				jsonMsg.payload = {
					result: true,
					content: [],
					message: "データが挿入されました"
				};
				res.status(200).json(jsonMsg);

				// notifySlackBot にも connection を渡すか、中で再度取得させる
				// ここでは timeout 後に再度接続取得する形を推奨（長時間接続を保持しないため）
				setTimeout(async () => {
					await this.notifySlackBot(student_ID);
				}, 0); // 即時実行に近い非同期処理

				this.onDataUpdated(); // これはWebSocket経由のブロードキャストトリガー

			} catch (error) {
				console.error("データ挿入エラー:", error); // エラーログを詳細に
				jsonMsg.payload = {
					result: false,
					content: [],
					message: `データの挿入に失敗しました: ${error instanceof Error ? error.message : String(error)}`
				};
				res.status(500).json(jsonMsg); // 400から500に変更する可能性も検討
			} finally {
				if (connection) {
					connection.release(); // 接続を解放
				}
			}
		});
		app.get("/echo",express.json(),async (req:express.Request,res:express.Response)=>{
			res.status(200).json("http(api) is connected\n");
		});
	}

	private async notifySlackBot(student_ID: string): Promise<void> {
		let connection: mysql.PoolConnection | null = null;
		try {
			connection = await this.dbHandler.getConnection(); // 接続を取得
			const countIsInRoom_query = `
        SELECT COUNT(*) AS inRoomCount
        FROM logs
        WHERE isInRoom = TRUE;
      `;
			const fetchNameByID_query = `
        SELECT student_Name, isInRoom
        FROM student_log_view 
        WHERE student_ID = ?;
      `;

			const [count_results] = await connection.execute<DBresult["noHead"]>(countIsInRoom_query);

			if (!hasProps<{ inRoomCount: string | number }>(count_results[0], ["inRoomCount"])) {
				console.error("在室人数が取得できませんでした", count_results);
				return;
			}
			const inRoomCount = count_results[0].inRoomCount;

			const [written_results] = await connection.execute<DBresult["noHead"]>(
				fetchNameByID_query, [student_ID]
			);

			if (!hasProps<{ isInRoom: number }>(written_results[0], ["isInRoom"])) {
				console.error("isInRoomが取得できませんでした", written_results);
				return;
			}

			let student_Name = "";
			if (hasProps<{ student_Name: string }>(written_results[0], ["student_Name"])) {
				student_Name = written_results[0].student_Name;
			}

			const name = `${student_Name ? `(${student_Name})` : ""}`;
			const convTF = [false, true];
			const isInRoom = convTF[written_results[0].isInRoom];
			const action = isInRoom ? "来た" : "帰った";
			const postMsg = `${student_ID}${name}が${action}よ～ (今の人数：${inRoomCount}人)`;

			await this.slackService.postMessage(postMsg);
		} catch (error) {
			console.error("Slack通知処理でエラーが発生しました:", error);
		} finally {
			if (connection) {
				connection.release(); // 接続を解放
			}
		}
	}
}