// WebSocketContext.tsx
import { TWsMessage } from '@Apps/app.env';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const API_URL = '/socket';

type TWebSocketContext = {
	socket: WebSocket | null;
	sendMessage: (jsonMsg: TWsMessage) => void;
	requestData: () => void;
};
type TWebSocketProvider = {
	children?: React.ReactNode;
};

const WebSocketContext = createContext<TWebSocketContext | undefined>(undefined);

export const WebSocketProvider: React.FC<TWebSocketProvider> = ({ children }) => {
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const sendMessage = (jsonMsg: TWsMessage) => {
		if (socket && socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(jsonMsg));
		}
	};

	const requestData = () => {
		sendMessage({
			type: "log/fetch",
			payload: {
				result: true,
				content: [],
				message: ""
			}
		});
	};

	const connectWebSocket = () => {
		const ws = new WebSocket(API_URL);

		ws.onopen = () => {
			console.log('WebSocket connected');
			setSocket(ws);
			// 再接続成功 → リトライ停止
			if (reconnectIntervalRef.current) {
				clearInterval(reconnectIntervalRef.current);
				reconnectIntervalRef.current = null;
			}
		};

		ws.onclose = () => {
			console.log('WebSocket disconnected');
			if (!reconnectIntervalRef.current) {
				reconnectIntervalRef.current = setInterval(() => {
					console.log('WebSocket 再接続を試行中...');
					connectWebSocket();
				}, 5000);
			}
		};

		ws.onerror = (error) => {
			console.log('WebSocket error:', error);
		};
	};

	useEffect(() => {
		connectWebSocket();

		return () => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.close();
			}
			if (reconnectIntervalRef.current) {
				clearInterval(reconnectIntervalRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<WebSocketContext.Provider value={{ socket, sendMessage, requestData }}>
			{children}
		</WebSocketContext.Provider>
	);
};

export const useWebSocket = (): TWebSocketContext => {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error('useWebSocketはWebSocketProviderの内部で使用してください');
	}
	if (!context.socket && !context.sendMessage) {
		throw new Error('WebSocketの確立に失敗している可能性があります');
	}
	return context;
};
