// EditableDataTable.tsx
import { APIData, TWsMessage, TWsProcessType } from '@Apps/app.env';
import { useWebSocket } from '@Apps/contexts/WebSocketContext';
import { Table } from '@chakra-ui/react';
import DeleteButton from '@components/Buttons/DeleteButton';
import GenericDataTable, { ColumnDefinition, getDefaultCellStyles } from '@components/GenericDataTable';
import { toaster, Toaster } from "@snippets/toaster";
import { useCallback, useEffect, useState } from 'react';
import DeleteDialog from './DeleteDialog';
import NameInput from './NameInput';

// メッセージタイプの定数定義
const MESSAGE_TYPES:Record<string,TWsProcessType> = {
	FETCH: "log/fetch",
	UPDATE_NAME: "user/update_name",
	DELETE: "user/delete"
};

// EditableDataTable コンポーネント
function EditableDataTable() {
	// 状態管理
	const [data, setData] = useState<APIData[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const { socket, requestData, sendMessage } = useWebSocket();

	// トースト表示ヘルパー関数
	const showToast = useCallback((isSuccess: boolean, action: string) => {
		const successMessages = {
			update: "名前を変更しました！",
			delete: "ユーザーを削除しました！"
		};

		const errorMessages = {
			update: "名前を変更出来ませんでした",
			delete: "ユーザーを削除出来ませんでした"
		};

		toaster.create({
			title: isSuccess ? successMessages[action as keyof typeof successMessages] : errorMessages[action as keyof typeof errorMessages],
			description: "",
			type: isSuccess ? "success" : "error",
			duration: 1500,
		});
	}, []);

	// WebSocketメッセージハンドラー
	const handleWebSocketMessage = useCallback((event: MessageEvent) => {
		const message: TWsMessage = JSON.parse(event.data);
		const { type, payload } = message;

		switch (type) {
			case MESSAGE_TYPES.FETCH:
				if (payload.content) {
					setData(payload.content as APIData[]);
				}
				break;

			case MESSAGE_TYPES.UPDATE_NAME:
				showToast(!!payload.result, "update");
				setIsLoading(false);
				requestData();
				break;

			case MESSAGE_TYPES.DELETE:
				showToast(!!payload.result, "delete");
				requestData();
				break;
		}
	}, [requestData, showToast]);

	// WebSocketの初期化
	useEffect(() => {
		if (!socket) return;

		socket.addEventListener("message", handleWebSocketMessage);
		requestData(); // 初期データ読み込み

		// クリーンアップ
		return () => {
			socket.removeEventListener("message", handleWebSocketMessage);
		};
	}, [socket, handleWebSocketMessage, requestData]);

	// 名前変更処理
	const handleNameUpdate = useCallback((student_ID: string, student_Name: string) => {
		if (!socket || !student_Name.trim()) return;

		setIsLoading(true);
		sendMessage({
			type: MESSAGE_TYPES.UPDATE_NAME,
			payload: {
				result: true,
				content: [{ student_ID, student_Name }],
				message: `${student_ID}の名前を${student_Name}に変更`
			}
		});
	}, [socket, sendMessage]);

	// ユーザー削除処理
	const handleUserDelete = useCallback((student_ID: string) => {
		if (!socket) return;

		sendMessage({
			type: MESSAGE_TYPES.DELETE,
			payload: {
				result: true,
				content: [{ student_ID }],
				message: `ID:${student_ID}を削除`
			}
		});
	}, [socket, sendMessage]);

	// テーブルカラム定義
	const columns: ColumnDefinition[] = [
		{ header: '学籍番号', width: "25%", key: "student_ID" },
		{ header: '氏名', width: "50%", key: "student_Name" },
		{ header: '削除ボタン', width: "25%", key: "actions" },
	];

	// 各行のレンダリング
	const renderRow = useCallback((item: APIData) => {
		const tdStyles = getDefaultCellStyles();

		return (
			<Table.Row key={item.student_ID} _hover={{ bg: 'gray.100' }}>
				<Table.Cell {...tdStyles}>{item.student_ID}</Table.Cell>
				<Table.Cell {...tdStyles}>
					<NameInput
						student_ID={item.student_ID}
						student_Name={item.student_Name}
						onClick={handleNameUpdate}
						disabled={isLoading}
					/>
				</Table.Cell>
				<Table.Cell {...tdStyles}>
					<DeleteDialog
						trigger={<DeleteButton disabled={isLoading} />}
						student_ID={item.student_ID}
						student_Name={item.student_Name}
						onApproved={() => handleUserDelete(item.student_ID)}
					/>
				</Table.Cell>
			</Table.Row>
		);
	}, [handleNameUpdate, handleUserDelete, isLoading]);

	return (
		<>
			<GenericDataTable
				columns={columns}
				data={data}
				renderRow={renderRow}
				styles={{
					maxHeight: "90%"
				}}
			/>
			<Toaster />
		</>
	);
}

export default EditableDataTable;