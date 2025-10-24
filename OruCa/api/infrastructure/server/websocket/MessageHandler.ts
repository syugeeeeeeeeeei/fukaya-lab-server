// api/infrastructure/server/websocket/MessageHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import { DBresult, TWsMessage, TWsPayLoad, TWsProcessType } from "@src/config";
import { hasProps, sendWsMessage } from '@src/utils';
import { createHash } from "crypto";
import mysql from "mysql2/promise"; // PoolConnection 型のために残す
import WebSocket from "ws";

type HandlerFunction = (ws: WebSocket.WebSocket, data: TWsMessage, connection: mysql.PoolConnection) => Promise<void>; // connection を引数に追加

export class MessageHandler {
	private wss: WebSocket.Server;
	private dbHandler: DatabaseHandler; // mysql.PoolConnection から DatabaseHandler に変更

	constructor(wss: WebSocket.Server, dbHandler: DatabaseHandler) { // 引数を DatabaseHandler に変更
		this.wss = wss;
		this.dbHandler = dbHandler; // DatabaseHandler を保持
	}

	// 接続プールを使用するヘルパーメソッド
	private async withConnection<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
		let connection: mysql.PoolConnection | null = null;
		try {
			connection = await this.dbHandler.getConnection();
			return await callback(connection);
		} catch (error) {
			console.error("Database operation error in withConnection:", error);
			throw error;
		} finally {
			if (connection) {
				connection.release();
			}
		}
	}

	public async fetchLogs(): Promise<Record<string, any>[]> {
		return this.withConnection(async (connection) => {
			const query = "SELECT * FROM student_log_view;";
			const [results] = await connection.execute<DBresult["noHead"]>(query);
			return results;
		});
	}

	private async fetchToken(student_ID: string): Promise<Record<string, any>> {
		return this.withConnection(async (connection) => {
			const query = "CALL get_student_token(?);";
			const [packet] = await connection.execute<DBresult["default"]>(query, [student_ID]);
			const [results] = packet;
			if (!results || results.length === 0) {
				throw new Error("Token not found for student_ID: " + student_ID);
			}
			return results[0]; // 通常、結果セットの最初の行を返す
		});
	}

	private async updateName(student_ID: string, student_Name: string): Promise<void> {
		await this.withConnection(async (connection) => {
			const query = "CALL update_student_name(?,?);";
			await connection.execute<DBresult["default"]>(query, [student_ID, student_Name]);
		});
	}

	private async deleteUser(student_ID: string): Promise<void> {
		await this.withConnection(async (connection) => {
			const query = `DELETE FROM users WHERE student_ID = ?;`;
			await connection.execute<DBresult["default"]>(query, [student_ID]);
		});
	}

	public async broadcastData(): Promise<void> {
		try {
			const logs = await this.fetchLogs();
			this.wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					const jsonMsg: TWsMessage = {
						type: "log/fetch",
						payload: {
							result: true,
							content: logs,
							message: "在室データ(ブロードキャスト)",
						},
					};
					sendWsMessage(client, jsonMsg);
				}
			});
		} catch (err) {
			console.error("データのブロードキャストエラー:", err);
		}
	}

	// 各メッセージの処理
	// handlersの型を変更し、this.withConnection を使って各処理をラップ
	// ハンドラ関数が非同期であることを明示するために async を追加
	public handlers: Record<TWsProcessType, (ws: WebSocket.WebSocket, data: TWsMessage) => Promise<void>> = {
		"ack": async (ws, data) => {
			const jsonMsg: TWsMessage = { type: "ack", payload: { result: true, content: [{ status: true }], message: "通信ステータス" } };
			sendWsMessage(ws, jsonMsg);
		},

		"log/fetch": async (ws, data) => {
			try {
				const logs = await this.fetchLogs();
				sendWsMessage(ws, { type: "log/fetch", payload: { result: true, content: logs, message: "在室データ" } });
			} catch (error) {
				console.error("ログ取得エラー:", error);
				sendWsMessage(ws, { type: "log/fetch", payload: { result: false, content: [], message: "ログ取得失敗" } });
			}
		},

		"log/write": async (ws, data) => { /* HTTP側で処理 */ },

		"user/fetchToken": async (ws, data) => {
			const payloadContent = data.payload?.content && data.payload.content[0]; // contentは配列の最初の要素と仮定
			const responsePayload: TWsPayLoad = { result: false, content: [], message: "不明なエラー" };
			try {
				if (!payloadContent || !hasProps<{ student_ID: string }>(payloadContent, ["student_ID"])) {
					responsePayload.message = "student_IDがありません";
					sendWsMessage(ws, { type: "user/fetchToken", payload: responsePayload });
					return;
				}
				const tokenData = await this.fetchToken(payloadContent.student_ID);
				// fetchTokenが単一オブジェクトを返すように修正したので、配列でラップしない
				responsePayload.result = true;
				responsePayload.content = [tokenData]; // APIの期待値が配列ならこれでOK
				responsePayload.message = "認証トークンのfetch成功";
				sendWsMessage(ws, { type: "user/fetchToken", payload: responsePayload });
			} catch (err) {
				console.error("トークンフェッチエラー:", err);
				responsePayload.message = err instanceof Error ? err.message : "トークン取得失敗";
				sendWsMessage(ws, { type: "user/fetchToken", payload: responsePayload });
			}
		},

		"user/auth": async (ws, data) => {
			const payloadContent = data.payload?.content && data.payload.content[0];
			const responsePayload: TWsPayLoad = { result: false, content: [], message: "不明なエラー" };
			try {
				if (!payloadContent || !hasProps<{ student_ID: string; password: string }>(payloadContent, ["student_ID", "password"])) {
					responsePayload.message = "student_ID または password がありません";
					sendWsMessage(ws, { type: "user/auth", payload: responsePayload });
					return;
				}

				const tokenData = await this.fetchToken(payloadContent.student_ID);
				if (!hasProps<{ student_token: string }>(tokenData, ["student_token"])) {
					responsePayload.message = "student_tokenが取得できませんでした";
					sendWsMessage(ws, { type: "user/auth", payload: responsePayload });
					return;
				}

				const { student_token } = tokenData;
				const generateSHA256Hash = (input: string): string => createHash("sha256").update(input).digest("hex");
				const salt = generateSHA256Hash(payloadContent.student_ID);
				const expectedToken = generateSHA256Hash(`${payloadContent.student_ID}${payloadContent.password}${salt}`);
				const isValid = student_token === expectedToken;

				responsePayload.result = isValid;
				responsePayload.message = isValid ? "認証成功" : "認証エラー";
				sendWsMessage(ws, { type: "user/auth", payload: responsePayload });
			} catch (err) {
				console.error("認証エラー:", err);
				responsePayload.message = err instanceof Error ? err.message : "サーバー内部エラー";
				sendWsMessage(ws, { type: "user/auth", payload: responsePayload });
			}
		},

		"user/update_name": async (ws, data) => {
			const payloadContent = data.payload?.content && data.payload.content[0];
			const responsePayload: TWsPayLoad = { result: false, content: [], message: "不明なエラー" };
			try {
				if (!payloadContent || !hasProps<{ student_ID: string; student_Name: string }>(payloadContent, ["student_ID", "student_Name"])) {
					responsePayload.message = "student_ID または student_Name がありません";
					sendWsMessage(ws, { type: "user/update_name", payload: responsePayload });
					return;
				}
				const { student_ID, student_Name } = payloadContent;
				await this.updateName(student_ID, student_Name);
				responsePayload.result = true;
				responsePayload.message = `更新完了（${student_ID}：${student_Name}）`;
				sendWsMessage(ws, { type: "user/update_name", payload: responsePayload });
				await this.broadcastData();
			} catch (err) {
				console.error("更新エラー:", err);
				responsePayload.message = "更新失敗";
				sendWsMessage(ws, { type: "user/update_name", payload: responsePayload });
			}
		},

		"user/delete": async (ws, data) => {
			const payloadContent = data.payload?.content && data.payload.content[0];
			const responsePayload: TWsPayLoad = { result: false, content: [], message: "不明なエラー" };
			try {
				if (!payloadContent || !hasProps<{ student_ID: string }>(payloadContent, ["student_ID"])) {
					responsePayload.message = "student_IDがありません";
					sendWsMessage(ws, { type: "user/delete", payload: responsePayload });
					return;
				}
				await this.deleteUser(payloadContent.student_ID);
				responsePayload.result = true;
				responsePayload.message = `削除完了（${payloadContent.student_ID}）`;
				sendWsMessage(ws, { type: "user/delete", payload: responsePayload });
				await this.broadcastData();
			} catch (err) {
				console.error("削除エラー:", err);
				responsePayload.message = "削除失敗";
				sendWsMessage(ws, { type: "user/delete", payload: responsePayload });
			}
		},

		"slackBot/post": async (ws, data) => { /* SlackServiceに移動 */ }
	};
}