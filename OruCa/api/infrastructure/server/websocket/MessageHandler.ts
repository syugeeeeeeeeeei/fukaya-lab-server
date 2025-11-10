// api/infrastructure/server/websocket/MessageHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import { SlackService } from "@infra/integrations/SlackServive"; // 💡 追加
import { DBresult, TWsMessage, TWsProcessType } from "@src/config";
import { sendWsMessage } from '@src/utils'; // hasPropsを削除
import { createHash } from "crypto";
import mysql from "mysql2/promise"; // PoolConnection 型のために残す
import WebSocket from "ws";
import { z } from "zod"; // 💡 zod と ZodSchema をインポート

type HandlerFunction = (ws: WebSocket.WebSocket, data: TWsMessage, connection: mysql.PoolConnection) => Promise<void>; // connection を引数に追加

// 💡 zodスキーマ定義
const StudentIDSchema = z.object({ student_ID: z.string() });
const UpdateNameSchema = z.object({ student_ID: z.string(), student_Name: z.string() });
const AuthSchema = z.object({ student_ID: z.string(), password: z.string() });
const StudentTokenSchema = z.object({ student_token: z.string() });

// 💡 DB結果のスキーマ定義
const InRoomCountSchema = z.object({ inRoomCount: z.union([z.string(), z.number()]) });
const IsInRoomSchema = z.object({ isInRoom: z.number() });
const StudentNameSchema = z.object({ student_Name: z.string() }).optional();

// 💡 共通ハンドラのペイロード取得関数
const getPayloadAsObject = (data: TWsMessage) => data.payload?.content;
const getPayloadAsArrayFirst = (data: TWsMessage) => data.payload?.content && data.payload.content[0];

// 💡 共通ハンドラのメインロジックが返すペイロード型
// 修正: content を Record<string, any>[] にし、オプション (?) を外す
type TLogicResultPayload = {
	result: boolean;
	content: Record<string, any>[]; // 
	message: string;
};


export class MessageHandler {
	private wss: WebSocket.Server;
	private dbHandler: DatabaseHandler; // mysql.PoolConnection から DatabaseHandler に変更
	private slackService: SlackService; // 💡 追加

	constructor(wss: WebSocket.Server, dbHandler: DatabaseHandler) { // 引数を DatabaseHandler に変更
		this.wss = wss;
		this.dbHandler = dbHandler; // DatabaseHandler を保持
		this.slackService = new SlackService(); // 💡 追加
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

	// ----------------------------------------------------------------------
	// 💡 HTTPHandlerから移動したロジックの追加
	// ----------------------------------------------------------------------

	// 💡 改善案1: notifySlackBot を withConnection でラップ
	private async notifySlackBot(student_ID: string): Promise<void> {
		try {
			await this.withConnection(async (connection) => {
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

				// 💡 zodでバリデーション
				const countResult = InRoomCountSchema.safeParse(count_results[0]);
				if (!countResult.success) {
					console.error("在室人数が取得できませんでした", count_results);
					return;
				}
				const inRoomCount = countResult.data.inRoomCount;

				const [written_results] = await connection.execute<DBresult["noHead"]>(
					fetchNameByID_query, [student_ID]
				);

				// 💡 zodでバリデーション
				const writtenResult = IsInRoomSchema.safeParse(written_results[0]);
				if (!writtenResult.success) {
					console.error("isInRoomが取得できませんでした", written_results);
					return;
				}

				let student_Name = "";
				// 💡 zodでバリデーション (オプション)
				const nameResult = StudentNameSchema.safeParse(written_results[0]);
				if (nameResult.success && nameResult.data?.student_Name) {
					student_Name = nameResult.data.student_Name;
				}

				const name = `${student_Name ? `(${student_Name})` : ""}`;
				const convTF = [false, true];
				const isInRoom = convTF[writtenResult.data.isInRoom];
				const action = isInRoom ? "来た" : "帰った";
				const postMsg = `${student_ID}${name}が${action}よ～ (今の人数：${inRoomCount}人)`;

				// SlackServiceの呼び出しはDB接続の外でもよいが、
				// 関連する処理としてトランザクション内で（または直後に）実行する
				await this.slackService.postMessage(postMsg);
			});
		} catch (error) {
			console.error("Slack通知処理でエラーが発生しました:", error);
			// withConnection 内でエラーが捕捉されるため、ここでは追加のエラー処理（あれば）を行う
		}
		// finally での connection.release() は不要になった
	}


	// 💡 HTTPHandlerから移動したログ書き込みと通知のコア処理
	private async processLogWrite(student_ID: string): Promise<void> {
		await this.withConnection(async (connection) => {
			// 1. DBへのログ挿入/更新 (CALL insert_or_update_log)
			await connection.execute("CALL insert_or_update_log(?);", [student_ID]);
		});

		// 2. Slack通知
		try {
			// NOTE: Slackへの通知は非同期で実行する方が、クライアントへの応答を速く返せるが、
			// WebSocketは同期的に処理し、エラーハンドリングも行うためここではawaitする。
			await this.notifySlackBot(student_ID);
		} catch (error) {
			console.error("Slack通知処理でエラーが発生しました:", error);
		}

		// 3. WebSocketクライアントへのブロードキャスト
		await this.broadcastData();
	}

	// 💡 改善案2: WebSocketハンドラの共通ヘルパーメソッド
	/**
	 * WebSocketリクエストの定型処理（バリデーション、メインロジック実行、レスポンス送信）を共通化する
	 * @param ws WebSocketクライアント
	 * @param data 受信メッセージ
	 * @param schema バリデーション用のZodスキーマ
	 * @param getPayloadContent ペイロード取得関数
	 * @param mainLogic メインロジック（成功/失敗を含むレスポンスペイロードを返す）
	 */
	private async handleWebSocketRequest<T>(
		ws: WebSocket.WebSocket,
		data: TWsMessage,
		schema: z.ZodType<T>,
		getPayloadContent: (data: TWsMessage) => any,
		mainLogic: (payload: T) => Promise<TLogicResultPayload>
	) {
		const payloadContent = getPayloadContent(data);
		const responseType = data.type;

		// 1. バリデーション
		const validationResult = schema.safeParse(payloadContent);
		if (!validationResult.success) {
			const errorMessage = "データの構造が不正です";
			console.error(`Invalid payload for ${responseType}:`, validationResult.error);
			sendWsMessage(ws, {
				type: responseType,
				payload: { result: false, content: [], message: errorMessage },
			});
			return;
		}

		// 2. メインロジックの実行とエラーハンドリング
		try {
			// メインロジックがレスポンスペイロード全体を構築して返す
			const responsePayload = await mainLogic(validationResult.data);
			// 💡 エラー箇所: responsePayload が TLogicResultPayload 型であり、
			// 修正後の TLogicResultPayload は TWsPayLoad と互換性がある
			sendWsMessage(ws, { type: responseType, payload: responsePayload });
		} catch (err) {
			console.error(`Error in ${responseType} handler:`, err);
			const message = err instanceof Error ? err.message : "サーバー内部エラー";
			// 失敗レスポンス
			sendWsMessage(ws, {
				type: responseType,
				payload: { result: false, content: [], message },
			});
		}
	}


	// 各メッセージの処理
	public handlers: Record<TWsProcessType, (ws: WebSocket.WebSocket, data: TWsMessage) => Promise<void>> = {
		"ack": async (ws, data) => {
			const jsonMsg: TWsMessage = { type: "ack", payload: { result: true, content: [{ status: true }], message: "通信ステータス" } };
			sendWsMessage(ws, jsonMsg);
		},

		"log/fetch": async (ws, data) => {
			// 💡 共通ハンドラに移行（ペイロードなしのパターンのため、ロジックを共通化しにくいが、構造は似せられる）
			try {
				const logs = await this.fetchLogs();
				sendWsMessage(ws, { type: "log/fetch", payload: { result: true, content: logs, message: "在室データ" } });
			} catch (error) {
				console.error("ログ取得エラー:", error);
				sendWsMessage(ws, { type: "log/fetch", payload: { result: false, content: [], message: "ログ取得失敗" } });
			}
		},

		"log/write": async (ws, data) => {
			// 💡 共通ハンドラを使用
			await this.handleWebSocketRequest(
				ws,
				data,
				StudentIDSchema,
				getPayloadAsObject, // ペイロードはオブジェクト
				async (payload) => {
					const { student_ID } = payload;
					// コア処理を実行 (Slack通知とブロードキャストは内部で実行される)
					await this.processLogWrite(student_ID);
					return {
						result: true,
						content: [], // 💡 修正 (TLogicResultPayload に合わせる)
						message: `データが挿入されました: ${student_ID}`,
					};
				}
			);
		},

		"user/fetchToken": async (ws, data) => {
			// 💡 共通ハンドラを使用
			await this.handleWebSocketRequest(
				ws,
				data,
				StudentIDSchema,
				getPayloadAsArrayFirst, // ペイロードは配列の最初の要素
				async (payload) => {
					const tokenData = await this.fetchToken(payload.student_ID);
					return {
						result: true,
						content: [tokenData], // APIの期待値が配列
						message: "認証トークンのfetch成功",
					};
				}
			);
		},

		"user/auth": async (ws, data) => {
			// 💡 共通ハンドラを使用
			await this.handleWebSocketRequest(
				ws,
				data,
				AuthSchema,
				getPayloadAsArrayFirst,
				async (payload) => {
					const { student_ID, password } = payload;
					const tokenData = await this.fetchToken(student_ID);

					// 💡 メインロジック内で失敗判定（エラーthrowではなく、result:falseを返す）
					const tokenResult = StudentTokenSchema.safeParse(tokenData);
					if (!tokenResult.success) {
						console.error("student_tokenが取得できませんでした", tokenResult.error);
						return { result: false, content: [], message: "student_tokenが取得できませんでした" };
					}

					const { student_token } = tokenResult.data;
					const generateSHA256Hash = (input: string): string => createHash("sha256").update(input).digest("hex");
					const salt = generateSHA256Hash(student_ID);
					const expectedToken = generateSHA256Hash(`${student_ID}${password}${salt}`);
					const isValid = student_token === expectedToken;

					return {
						result: isValid,
						content: [], // 💡 修正
						message: isValid ? "認証成功" : "認証エラー",
					};
				}
			);
		},

		"user/update_name": async (ws, data) => {
			// 💡 共通ハンドラを使用
			await this.handleWebSocketRequest(
				ws,
				data,
				UpdateNameSchema,
				getPayloadAsArrayFirst,
				async (payload) => {
					const { student_ID, student_Name } = payload;
					await this.updateName(student_ID, student_Name);
					await this.broadcastData(); // 💡 ブロードキャスト
					return {
						result: true,
						content: [], // 💡 修正
						message: `更新完了（${student_ID}：${student_Name}）`,
					};
				}
			);
		},

		"user/delete": async (ws, data) => {
			// 💡 共通ハンドラを使用
			await this.handleWebSocketRequest(
				ws,
				data,
				StudentIDSchema,
				getPayloadAsArrayFirst,
				async (payload) => {
					await this.deleteUser(payload.student_ID);
					await this.broadcastData(); // 💡 ブロードキャスト
					return {
						result: true,
						content: [], // 💡 修正
						message: `削除完了（${payload.student_ID}）`,
					};
				}
			);
		},

		"slackBot/post": async (ws, data) => { /* SlackServiceに移動 */ }
	};
}