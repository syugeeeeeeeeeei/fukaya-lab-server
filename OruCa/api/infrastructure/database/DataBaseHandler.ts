// DataBaseHandler.ts
import { IDBConfig } from "@src/config";
import mysql from "mysql2/promise";

export class DatabaseHandler {
	private pool: mysql.Pool;

	constructor(config: IDBConfig) {
		this.pool = mysql.createPool({
			connectionLimit: config.connectionLimit,
			host: config.host,
			user: config.user,
			password: config.password,
			database: config.database,
			waitForConnections: config.waitForConnections,
			queueLimit: config.queueLimit,
			connectTimeout: config.connectTimeout,
			timezone: "+09:00", // タイムゾーン設定 (前回適用済み)
		});
	}

	public async connect(): Promise<void> {
		try {
			// 接続テスト
			const connection = await this.pool.getConnection();
			console.log("MySQL データベースに接続しました。");
			connection.release(); // すぐに解放
		} catch (err) {
			console.error("MySQL データベース接続エラー:", err);
			throw err; // サーバーの起動を停止させるためにエラーをスロー
		}
	}

	public async close(): Promise<void> {
		try {
			await this.pool.end();
			console.log("MySQL データベース接続が正常にクローズされました。");
		} catch (err) {
			console.error("MySQL 接続クローズエラー:", err);
			throw err;
		}
	}

	/**
	 * student_log_view からすべての学生ログを取得します。
	 */
	public async fetchStudentLogs(): Promise<any[]> {
		const sql = "SELECT * FROM student_log_view";
		try {
			const [rows] = await this.pool.query(sql);
			return rows as any[];
		} catch (err) {
			console.error("SQL実行エラー (fetchStudentLogs):", err);
			throw err; // エラーを呼び出し元に伝播させる
		}
	}

	/**
	 * 指定された student_ID のログを挿入または更新します。
	 * (ストアドプロシージャ 'insert_or_update_log' を呼び出します)
	 */
	public async insertOrUpdateLog(studentID: string): Promise<void> {
		const sql = "CALL insert_or_update_log(?)";
		try {
			await this.pool.query(sql, [studentID]);
		} catch (err) {
			console.error("SQL実行エラー (insertOrUpdateLog):", err);
			throw err;
		}
	}

	/**
	 * 指定された student_ID の学生名を更新します。
	 * (ストアドプロシージャ 'update_student_name' を呼び出します)
	 */
	public async updateStudentName(
		studentID: string,
		studentName: string
	): Promise<void> {
		const sql = "CALL update_student_name(?, ?)";
		try {
			await this.pool.query(sql, [studentID, studentName]);
		} catch (err) {
			console.error("SQL実行エラー (updateStudentName):", err);
			throw err;
		}
	}

	/**
	 * 指定された student_ID の学生トークンを取得します。
	 * (ストアドプロシージャ 'get_student_token' を呼び出します)
	 */
	public async getStudentToken(studentID: string): Promise<string | null> {
		const sql = "CALL get_student_token(?)";
		try {
			// ストアドプロシージャの呼び出し結果は複雑なネスト構造になる
			const [rows] = (await this.pool.query(sql, [studentID])) as any[];
			// rows[0] が SELECT の結果セット
			if (rows[0] && rows[0].length > 0) {
				return rows[0][0].student_token;
			}
			return null;
		} catch (err) {
			console.error("SQL実行エラー (getStudentToken):", err);
			throw err;
		}
	}

	// 変更: ここから追加 (Slack通知のため)
	/**
	 * 現在在室している人数を取得します。
	 */
	public async getInRoomCount(): Promise<number> {
		const sql = "SELECT COUNT(*) AS inRoomCount FROM logs WHERE isInRoom = TRUE";
		try {
			const [rows] = (await this.pool.query(sql)) as any[];
			if (rows && rows.length > 0) {
				return rows[0].inRoomCount;
			}
			return 0;
		} catch (err) {
			console.error("SQL実行エラー (getInRoomCount):", err);
			throw err;
		}
	}
	/**
	 * 指定された student_ID のユーザーを削除します。
	 * (logs テーブルも CASCADE により削除されます)
	 */
	public async deleteStudent(studentID: string): Promise<void> {
		const sql = "DELETE FROM users WHERE student_ID = ?";
		try {
			await this.pool.query(sql, [studentID]);
		} catch (err) {
			console.error("SQL実行エラー (deleteStudent):", err);
			throw err;
		}
	}

	/**
	 * 在室中のすべてのユーザーを「不在」状態に更新します。
	 * (日次リセット用)
	 * @returns 更新された行数
	 */
	public async setAllUsersOutOfRoom(): Promise<number> {
		// isInRoom = TRUE のレコードのみを FALSE に更新
		const sql = "UPDATE logs SET isInRoom = FALSE WHERE isInRoom = TRUE";
		try {
			const [results] = (await this.pool.query(sql)) as [
				mysql.ResultSetHeader,
				any
			];
			console.log(
				`Daily reset: ${results.affectedRows} users set to 'out of room'.`
			);
			return results.affectedRows; // 影響を受けた行数を返す
		} catch (err) {
			console.error("SQL実行エラー (setAllUsersOutOfRoom):", err);
			throw err; // エラーを呼び出し元に伝播させる
		}
	}
}