// api/server.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler";
// ServerHandler のインポートパスを修正 (infrastructure 内のものを指すように)
import { ServerHandler } from "@infra/server/ServerHandler";
import { DB_CONFIG, SERVER_CONFIG } from "@src/config";
import express from "express";

const app = express();
const port = SERVER_CONFIG.port;
const host = SERVER_CONFIG.host;

const databaseHandler = new DatabaseHandler(DB_CONFIG);

const initializeDatabase = async () => {
	try {
		await databaseHandler.connect();
	} catch (err) {
		console.error("MySQLの初期化に失敗しました。サーバーを停止します。", err);
		process.exit(1);
	}
};

const initializeServerHandlers = async () => { // 関数名を変更して明確化
	// DatabaseHandler インスタンスを ServerHandler に渡す
	const sh = new ServerHandler(app, databaseHandler);
	return sh.getServer();
};

const startServer = async () => {
	await initializeDatabase();
	const server = await initializeServerHandlers(); // 修正後の関数を呼び出し

	server.listen(port, host, () => {
		console.log(`APIサーバーは http://${host}:${port} で実行中`);
	});

	const shutdown = async (signal: string) => {
		console.log(`${signal}信号を受信。サーバーを正常にシャットダウンします...`);
		try {
			await databaseHandler.close();
			server.close((err) => {
				if (err) {
					console.error("HTTPサーバーのクローズ中にエラー:", err);
					process.exit(1); // エラー時は異常終了
				}
				console.log('HTTPサーバーが閉じられました。');
				process.exit(0); //正常終了
			});
		} catch (err) {
			console.error("シャットダウン処理中にエラー:", err);
			process.exit(1);
		}
	};

	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();