// api/infrastructure/server/http/HttpHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import express from "express";

export class HttpHandler {
	private dbHandler: DatabaseHandler; // mysql.PoolConnection から DatabaseHandler に変更
	// private slackService: SlackService; // 削除
	// private onDataUpdated: () => Promise<void>; // 削除

	constructor(
		app: express.Express,
		dbHandler: DatabaseHandler, // 引数を DatabaseHandler に変更
		onDataUpdated: () => Promise<void> // 💡 引数は残すが、内部では使用しない（onDataUpdatedはWebSocket側で実行されるため）
	) {
		this.dbHandler = dbHandler; // DatabaseHandler を保持
		this.initializeHttpRoutes(app);
	}

	private initializeHttpRoutes(app: express.Express) {
		// 💡 削除: app.post("/log/write", ... ) { ... } ルートを完全に削除
		app.get("/echo", express.json(), async (req: express.Request, res: express.Response) => {
			res.status(200).json("http(api) is connected\n");
		});
	}
}