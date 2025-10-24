import dotenv from "dotenv";
import mysql from "mysql2";
dotenv.config();

// 型安全な取得関数
function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`環境変数 ${name} が設定されていません。`);
	}
	return value;
}

interface IServerConfig{
	port :number;
	host :string;
}

interface IDBConfig extends mysql.PoolOptions {
	host:string;
	user:string;
	password:string;
	database:string;
	waitForConnections: boolean;
	connectionLimit: number;
	queueLimit: number;
	connectTimeout: number;
}

export const SERVER_CONFIG:IServerConfig = {
	port:3000,
	host:"api"
}

export const DB_CONFIG:IDBConfig = {
	host: 'mysql', // Docker Compose内でのサービス名を使用
	user: getEnv("MYSQL_USER"),
	password: getEnv("MYSQL_PASSWORD"),
	database: getEnv("MYSQL_DATABASE"),
	waitForConnections:true,
	connectionLimit:3,
	queueLimit:0,
	connectTimeout: 60000 // 60秒に設定 (ミリ秒)
}

export type TWsProcessType = "ack" | "log/fetch" | "log/write" | "user/auth" | "user/update_name" | "user/fetchToken" | "user/delete" | "slackBot/post";
export type TWsPayLoad = {
	result:boolean,
	content: Record<string,any>[],
	message:string,
}
export type TWsMessage = {
	type:TWsProcessType,
	payload:TWsPayLoad
}

export type DBresult = {
	"default": [mysql.RowDataPacket[], mysql.ResultSetHeader];
	"noHead": [mysql.RowDataPacket[]];
}


export const SLACK_BOT_TOKEN = getEnv("SLACK_BOT_TOKEN"); // 例: xoxb-1234567890-0987654321-ABCDEF123456
export const SLACK_CHANNEL_ID = getEnv("SLACK_CHANNEL_ID"); // 例: C1234567890
