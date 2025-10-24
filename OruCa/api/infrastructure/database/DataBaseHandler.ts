import mysql from "mysql2/promise";

export class DatabaseHandler {
	private dbPool: mysql.Pool;
	private dbConfig: mysql.PoolOptions;
	private keepAliveIntervalId?: NodeJS.Timeout; // インターバルIDを保存

	constructor(dbConfig: mysql.PoolOptions) {
		this.dbConfig = dbConfig;
		// mysql2/promiseが認識しないカスタムオプションを除外する場合があります
		// 例: const { customOption, ...poolConfig } = dbConfig as any;
		this.dbPool = mysql.createPool(dbConfig);
		console.log("データベース接続プールが作成されました。");
		this.setupKeepAlive(); // コンストラクタでキープアライブを開始
	}

	// 初期接続テスト用のメソッド
	public async connect(): Promise<void> {
		let connection: mysql.PoolConnection | null = null;
		try {
			connection = await this.dbPool.getConnection();
			await connection.ping(); // pingで軽量な接続確認
			console.log("MySQLに接続し、正常に応答しました (初期接続確認)。");
		} catch (err) {
			console.error("MySQLの初期接続またはPingに失敗しました:", err);
			throw err; // サーバー起動処理でエラーを補足できるように再スロー
		} finally {
			if (connection) {
				connection.release();
			}
		}
	}

	// プールから接続を取得 (プールが再接続を管理)
	public async getConnection(): Promise<mysql.PoolConnection> {
		try {
			const connection = await this.dbPool.getConnection();
			return connection;
		} catch (error) {
			console.error("プールからのMySQL接続の取得に失敗:", error);
			throw error;
		}
	}

	// ヘルスチェック実行メソッド
	private async performHealthCheck(): Promise<void> {
		let connection: mysql.PoolConnection | null = null;
		try {
			connection = await this.dbPool.getConnection();
			await connection.ping();
			// console.log('データベースヘルスチェック: Ping成功'); // 冗長な場合があるためコメントアウト
		} catch (err) {
			console.error('データベースヘルスチェック/Ping失敗:', err);
			// mysql2/promiseプールは、後続のgetConnection呼び出しで接続の再確立を試みます。
		} finally {
			if (connection) {
				connection.release();
			}
		}
	}

	// 定期的なヘルスチェックの設定
	private setupKeepAlive(intervalMs: number = 300000): void { // デフォルト5分 (300,000 ms)
		if (this.keepAliveIntervalId) {
			clearInterval(this.keepAliveIntervalId);
		}
		this.keepAliveIntervalId = setInterval(() => {
			this.performHealthCheck();
		}, intervalMs);
		console.log(`データベースの定期的なヘルスチェックが${intervalMs / 60000}分ごとに設定されました。`);
	}

	// プールを閉じ、キープアライブインターバルをクリア
	public async close(): Promise<void> {
		if (this.keepAliveIntervalId) {
			clearInterval(this.keepAliveIntervalId);
			this.keepAliveIntervalId = undefined;
		}
		try {
			await this.dbPool.end();
			console.log("MySQL接続プールが正常に閉じられました。");
		} catch (err) {
			console.error("MySQL接続プールのクローズ中にエラーが発生しました:", err);
		}
	}
}