import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const ConsoleContainer = styled.div`
  position: fixed;
  bottom: 10px;
  left: 10px;
  width: calc(100% - 20px);
  max-width: 500px;
  height: 200px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #0f0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  border: 1px solid #333;
  border-radius: 5px;
  overflow-y: scroll;
  padding: 5px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse; // 新しいログが一番下（見やすい位置）に来るように
`;

const LogMessage = styled.div<{ type: string }>`
  white-space: pre-wrap;
  word-break: break-all;
  padding: 2px 0;
  border-bottom: 1px dotted #333;
  color: ${({ type }) => {
		switch (type) {
			case 'error': return '#f00';
			case 'warn': return '#ff0';
			default: return '#0f0';
		}
	}};
`;

interface LogEntry {
	id: number;
	type: 'log' | 'error' | 'warn' | 'info';
	message: string;
}

export const OnScreenConsole: React.FC = () => {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [isVisible, setIsVisible] = useState(true);

	const formatMessage = (args: any[]): string => {
		return args.map(arg => {
			if (typeof arg === 'object' && arg !== null) {
				try {
					return JSON.stringify(arg, null, 2);
				} catch (e) {
					return '[Unserializable Object]';
				}
			}
			return String(arg);
		}).join(' ');
	};

	useEffect(() => {
		const originalConsole = { ...console };

		const intercept = (type: LogEntry['type']) => (...args: any[]) => {
			originalConsole[type](...args); // 元のコンソール出力も維持
			setLogs(prevLogs => [
				{ id: Date.now() + Math.random(), type, message: formatMessage(args) },
				...prevLogs
			]);
		};

		console.log = intercept('log');
		console.error = intercept('error');
		console.warn = intercept('warn');
		console.info = intercept('info');

		return () => { // クリーンアップ
			Object.assign(console, originalConsole);
		};
	}, []);

	if (!isVisible) {
		return (
			<button onClick={() => setIsVisible(true)} style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999 }}>
				Show Console
			</button>
		);
	}

	return (
		<ConsoleContainer>
			<div>
				<button onClick={() => setIsVisible(false)} style={{ width: '100%' }}>Hide</button>
				<button onClick={() => setLogs([])} style={{ width: '100%' }}>Clear</button>
				{logs.map(log => (
					<LogMessage key={log.id} type={log.type}>
						[{log.type.toUpperCase()}] {log.message}
					</LogMessage>
				))}
			</div>
		</ConsoleContainer>
	);
};