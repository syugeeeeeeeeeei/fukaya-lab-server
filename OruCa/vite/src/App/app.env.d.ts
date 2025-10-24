export type APIData = {
	student_ID: string;
	student_Name:string|undefined;
	isInRoom: number;
	updated_at: string;
};

export type TWsProcessType = "ack" | "log/fetch" | "log/write" | "user/auth" | "user/update_name" | "user/fetchToken" | "user/delete";
export type TWsPayLoad = {
	result: boolean,
	content: undefined | Record<string, any>[],
	message: string,
}
export type TWsMessage = {
	type: TWsProcessType,
	payload: TWsPayLoad
}
