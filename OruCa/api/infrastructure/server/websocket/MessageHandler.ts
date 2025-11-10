// api/infrastructure/server/websocket/MessageHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler";
import { SlackService } from "@infra/integrations/SlackServive";
import { TWsMessage } from "@src/config";
import { sendWsMessage } from "@src/utils";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod"; // 'zod' のインポート

// (1) フロントエンド (Admin UI 等) からのペイロード用 (シンプル)
const StudentIdPayload = z.object({
	student_ID: z.string(),
});

const AuthPayload = z.object({
	content: z.array(
		z.object({
			student_ID: z.string(),
			password: z.string(),
		})
	)
});

const UpdateNamePayload = z.object({
	content: z.object({
		student_ID: z.string(),
		student_Name: z.string(),
	}),
});

// (2) NFCリーダー (main.py) からの 'log/write' ペイロード用 (ネスト)
const LogWritePayload = z.object({
	content: z.object({
		student_ID: z.string(),
	}),
});


export class MessageHandler {
	private wss: WebSocketServer;
	private dbHandler: DatabaseHandler;
	private slackService: SlackService; // SlackService をインスタンス化して保持
	public handlers: Record<string, (ws: WebSocket, data: TWsMessage) => Promise<void>>;

	constructor(wss: WebSocketServer, dbHandler: DatabaseHandler) {
		this.wss = wss;
		this.dbHandler = dbHandler;
		this.slackService = new SlackService(); // SlackService を初期化
		this.handlers = this.initializeHandlers();
	}

	// ハンドラーを初期化
	private initializeHandlers(): Record<string, (ws: WebSocket, data: TWsMessage) => Promise<void>> {
		return {
			"log/fetch": this.handleFetchLogs.bind(this),
			"log/write": this.handleLogWrite.bind(this),
			"user/auth": this.handleUserAuth.bind(this),
			"user/update_name": this.handleUpdateName.bind(this),
			"user/fetchToken": this.handleFetchToken.bind(this),
			"user/delete": this.handleDeleteUser.bind(this),
		};
	}

	// 全クライアントに現在のログをブロードキャスト
	public async broadcastData(): Promise<void> {
		try {
			const logs = await this.fetchLogs();
			const message = JSON.stringify({
				type: "log/fetch",
				payload: { result: true, content: logs, message: "ブロードキャストデータ" }
			});
			this.wss.clients.forEach(client => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(message);
				}
			});
		} catch (error) {
			console.error("ブロードキャストエラー:", error);
		}
	}

	// ログを取得 (プライベートメソッドとして分離)
	public async fetchLogs(): Promise<any[]> {
		// 変更: DBハンドラから student_log_view を取得
		return this.dbHandler.fetchStudentLogs();
	}

	// 'log/fetch' の処理
	private async handleFetchLogs(ws: WebSocket, data: TWsMessage): Promise<void> {
		try {
			// 変更: 正常系ログを追加
			console.log(`[REQ] type: ${data.type}`);

			const logs = await this.fetchLogs();
			sendWsMessage(ws, {
				type: "log/fetch",
				payload: { result: true, content: logs, message: "ログ取得成功" }
			});
		} catch (error) {
			// エラー発生時に、受信したペイロードをログに出力
			console.error(
				"ログ取得エラー (handleFetchLogs):",
				error, // ZodError の詳細
				"受信したペイロード:\n", // 受信した内容
				JSON.stringify(data.payload) // JSON文字列としてログ出力
			);
			sendWsMessage(ws, {
				type: "log/fetch",
				payload: { result: false, content: [], message: "ログ取得失敗" }
			});
		}
	}

	// 'log/write' の処理
	private async handleLogWrite(ws: WebSocket, data: TWsMessage): Promise<void> {

		try {
			// 変更: 正常系ログを追加
			console.log(`[REQ] type: ${data.type}, payload: ${JSON.stringify(data.payload)}`);

			// Zod スキーマでペイロードを検証
			const payload = LogWritePayload.parse(data.payload);
			const studentID = payload.content.student_ID;

			// DataBaseHandler のメソッドを直接呼び出す
			await this.dbHandler.insertOrUpdateLog(studentID);

			// 1. 更新後の全ログを取得
			const updatedLogs = await this.fetchLogs();

			// 2. 在室人数をDBから取得
			const inRoomCount = await this.dbHandler.getInRoomCount();

			// 3. 今回の操作対象のユーザー情報を特定
			const user = updatedLogs.find(log => log.student_ID === studentID);

			if (user) {
				const student_Name = user.student_Name || ""; // null なら空文字
				const isInRoom = user.isInRoom; // 0 (false) or 1 (true)

				// 4. Slack メッセージを構築
				const name = `${student_Name ? `(${student_Name})` : ""}`;
				const action = isInRoom ? "来た" : "帰った";
				const postMsg = `${studentID}${name}が${action}よ～ (今の人数：${inRoomCount}人)`;

				// 5. Slack 投稿
				try {
					await this.slackService.postMessage(postMsg);
				} catch (slackError) {
					console.error("Slack へのメッセージ投稿に失敗しました:", slackError);
				}
			}

			// 全クライアントにブロードキャスト
			await this.broadcastData();

		} catch (error) {
			// エラー発生時に、受信したペイロードをログに出力
			console.error(
				"ログ書き込みまたはブロードキャストエラー (handleLogWrite):",
				error, // ZodError の詳細
				"受信したペイロード:", // 受信した内容
				JSON.stringify(data.payload) // JSON文字列としてログ出力
			);

			// エラーをクライアントに通知 (任意)
			sendWsMessage(ws, {
				type: "ack", // エラー ACK
				payload: { result: false, content: [], message: `ログ書き込み失敗: ${error instanceof Error ? error.message : "不明なエラー"}` }
			});
		}
	}

	// 'user/auth' の処理
	private async handleUserAuth(ws: WebSocket, data: TWsMessage): Promise<void> {
		try {
			// 変更: 正常系ログを追加
			console.log(`[REQ] type: ${data.type}, payload: ${JSON.stringify(data.payload)}`);

			// Zod スキーマでペイロードを検証
			const payload = AuthPayload.parse(data.payload);

			const storedToken = await this.dbHandler.getStudentToken(payload.content[0].student_ID);

			// 認証の処理がおかしい
			if (storedToken && storedToken === payload.content[0].password) {
				// 認証成功
				sendWsMessage(ws, {
					type: "user/auth",
					payload: {
						result: true,
						content: [{ student_ID: payload.content[0].student_ID, token: storedToken }],
						message: "認証成功"
					}
				});
			} else {
				// 認証失敗
				sendWsMessage(ws, {
					type: "user/auth",
					payload: { result: false, content: [], message: "学籍番号またはトークンが異なります" }
				});
			}

		} catch (error) {
			// エラー発生時に、受信したペイロードをログに出力
			console.error(
				"認証エラー (handleUserAuth):",
				error, // ZodError の詳細
				"受信したペイロード:\n", // 受信した内容
				JSON.stringify(data.payload) // JSON文字列としてログ出力
			);
			sendWsMessage(ws, {
				type: "user/auth",
				payload: { result: false, content: [], message: `認証処理エラー: ${error instanceof Error ? error.message : "不明なエラー"}` }
			});
		}
	}

	// 'user/update_name' の処理
	private async handleUpdateName(ws: WebSocket, data: TWsMessage): Promise<void> {
		try {
			// 変更: 正常系ログを追加
			console.log(`[REQ] type: ${data.type}, payload: ${JSON.stringify(data.payload)}`);

			// Zod スキーマでペイロードを検証
			const payload = UpdateNamePayload.parse(data.payload);

			await this.dbHandler.updateStudentName(payload.content.student_ID, payload.content.student_Name);

			// クライアントに成功 ACK を返す
			sendWsMessage(ws, {
				type: "ack",
				payload: { result: true, content: [], message: "氏名更新成功" }
			});

			// 全クライアントにブロードキャスト
			await this.broadcastData();

		} catch (error) {
			// エラー発生時に、受信したペイロードをログに出力
			console.error(
				"氏名更新エラー (handleUpdateName):",
				error, // ZodError の詳細
				"受信したペイロード:\n", // 受信した内容
				JSON.stringify(data.payload) // JSON文字列としてログ出力
			);
			sendWsMessage(ws, {
				type: "ack",
				payload: { result: false, content: [], message: `氏名更新失敗: ${error instanceof Error ? error.message : "不明なエラー"}` }
			});
		}
	}

	// 'user/fetchToken' の処理
	private async handleFetchToken(ws: WebSocket, data: TWsMessage): Promise<void> {
		try {
			// 変更: 正常系ログを追加
			console.log(`[REQ] type: ${data.type}, payload: ${JSON.stringify(data.payload)}`);

			// Zod スキーマでペイロードを検証
			const payload = StudentIdPayload.parse(data.payload);

			const token = await this.dbHandler.getStudentToken(payload.student_ID);

			if (token) {
				sendWsMessage(ws, {
					type: "user/fetchToken",
					payload: {
						result: true,
						content: [{ student_ID: payload.student_ID, token: token }],
						message: "トークン取得成功"
					}
				});
			} else {
				sendWsMessage(ws, {
					type: "user/fetchToken",
					payload: { result: false, content: [], message: "該当する学生が見つかりません" }
				});
			}

		} catch (error) {
			// エラー発生時に、受信したペイロードをログに出力
			console.error(
				"トークン取得エラー (handleFetchToken):",
				error, // ZodError の詳細
				"受信したペイロード:\n", // 受信した内容
				JSON.stringify(data.payload) // JSON文字列としてログ出力
			);
			sendWsMessage(ws, {
				type: "user/fetchToken",
				payload: { result: false, content: [], message: `トークン取得失敗: ${error instanceof Error ? error.message : "不明なエラー"}` }
			});
		}
	}

	// 'user/delete' の処理
	private async handleDeleteUser(ws: WebSocket, data: TWsMessage): Promise<void> {
		try {
			// 変更: 正常系ログを追加
			console.log(`[REQ] type: ${data.type}, payload: ${JSON.stringify(data.payload)}`);

			// Zod スキーマでペイロードを検証
			const payload = StudentIdPayload.parse(data.payload);

			// 変更: DataBaseHandler.ts に追加したメソッドを呼び出す
			await this.dbHandler.deleteStudent(payload.student_ID);

			sendWsMessage(ws, {
				type: "ack",
				payload: { result: true, content: [], message: "ユーザー削除成功" }
			});

			// 変更: ユーザー削除後にもブロードキャスト
			await this.broadcastData();

		} catch (error) {
			// エラー発生時に、受信したペイロードをログに出力
			console.error(
				"ユーザー削除エラー (handleDeleteUser):",
				error, // ZodError の詳細
				"受信したペイロード:\n", // 受信した内容
				JSON.stringify(data.payload) // JSON文字列としてログ出力
			);
			sendWsMessage(ws, {
				type: "ack",
				payload: { result: false, content: [], message: `ユーザー削除処理エラー: ${error instanceof Error ? error.message : "不明なエラー"}` }
			});
		}
	}
}