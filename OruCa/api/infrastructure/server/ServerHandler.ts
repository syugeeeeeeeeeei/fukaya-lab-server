// api/infrastructure/server/ServerHandler.ts
import { DatabaseHandler } from "@infra/database/DataBaseHandler"; // DatabaseHandler をインポート
import { HttpHandler } from "@infra/server/http/HttpHandler";
import { WebSocketHandler } from "@infra/server/websocket/WebSocketHandler";
import express from 'express';
import * as http from "http";
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
	}

	public getServer(): http.Server {
		return this.httpServer;
	}
}