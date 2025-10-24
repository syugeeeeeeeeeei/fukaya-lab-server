// src/pages/AdminLogin.tsx
import { TWsMessage } from "@Apps/app.env";
import { Box, Button, Card, Field, Fieldset, Input } from "@chakra-ui/react";
import { useWebSocket } from '@contexts/WebSocketContext';
import { Toaster, toaster } from "@snippets/toaster";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LoginForm = () => {
	// 状態管理
	const [formData, setFormData] = useState({
		username: "",
		password: ""
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ルーティングとWebSocket
	const navigate = useNavigate();
	const location = useLocation();
	const { socket } = useWebSocket();

	// 入力フィールドへの参照
	const nameInputRef = useRef<HTMLInputElement>(null);
	const passInputRef = useRef<HTMLInputElement>(null);
	const submitButtonRef = useRef<HTMLButtonElement>(null);

	// WebSocketメッセージのハンドリング
	useEffect(() => {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		const handleMessage = (event: MessageEvent) => {
			const data: TWsMessage = JSON.parse(event.data);

			if (data.type === "user/auth" && data.payload.content) {
				setIsSubmitting(false);

				if (data.payload.result) {
					navigate("/admin/settings", { state: { loginStatus: true } });
				} else {
					showErrorToast("ログイン失敗", "ユーザー名またはパスワードが間違っています。");
				}
			}
		};

		socket.addEventListener("message", handleMessage);

		return () => {
			socket.removeEventListener("message", handleMessage);
		};
	}, [socket, navigate]);

	// ルーティング状態によるエラー表示
	useEffect(() => {
		if (location.state?.loginStatus === false) {
			showErrorToast("ログイン失敗", "アクセスに失敗しました");
			// 戻るときにも表示されるのを防止するためstateをクリア
			window.history.replaceState({}, document.title);
		}
	}, [location.state]);

	// 初期フォーカス設定
	useEffect(() => {
		nameInputRef.current?.focus();
	}, []);

	// 入力ハンドラ
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	// キーボードイベントハンドラ
	const handleKeyDown = (e: React.KeyboardEvent, nextField: React.RefObject<HTMLElement|null>) => {
		if (e.key === "Enter" && nextField.current) {
			e.preventDefault();
			nextField.current.focus();
		}
	};

	// ログイン処理
	const handleSubmit = (e?: FormEvent) => {
		if (e) e.preventDefault();

		if (isSubmitting) return;
		setIsSubmitting(true);

		if (!socket || socket.readyState !== WebSocket.OPEN) {
			showErrorToast("ログイン失敗", "認証サーバーとの通信が出来ませんでした");
			setIsSubmitting(false);
			return;
		}

		const { username, password } = formData;
		if (!username || !password) {
			showErrorToast("入力エラー", "ユーザー名とパスワードを入力してください");
			setIsSubmitting(false);
			return;
		}

		const authMessage: TWsMessage = {
			type: "user/auth",
			payload: {
				result: true,
				content: [{ student_ID: username, password }],
				message: "認証"
			}
		};

		socket.send(JSON.stringify(authMessage));
		window.history.replaceState({}, document.title);
	};

	// エラーメッセージ表示用ヘルパー関数
	const showErrorToast = (title: string, description: string) => {
		toaster.create({
			title,
			description,
			type: "error",
			duration: 1500,
		});
	};

	return (
		<>
			<Box
				w="100%"
				h="100%"
				display="flex"
				alignItems="center"
				justifyContent="center"
			>
				<Card.Root
					w="fit-content"
					p={[2, null, 10]}
					borderWidth={2}
					borderColor="default/20"
					shadow="md"
				>
					<Card.Body>
						<form onSubmit={handleSubmit}>
							<Fieldset.Root gap={[3, null, 7]} size="lg">
								<Fieldset.Legend
									fontSize={["lg", null, "2xl"]}
									color="default"
									fontWeight="semibold"
									pb={2}
								>
									管理者ログイン
								</Fieldset.Legend>

								<Fieldset.Content gap={[6, null, 12]} color="default">
									<Field.Root>
										<Field.Label fontSize={["sm", null, "lg"]}>ユーザー名</Field.Label>
										<Input
											name="username"
											type="text"
											fontSize={["sm", null, "lg"]}
											size={["xs", null, "lg"]}
											value={formData.username}
											onChange={handleInputChange}
											onKeyDown={(e) => handleKeyDown(e, passInputRef)}
											ref={nameInputRef}
											autoComplete="username"
											disabled={isSubmitting}
										/>
									</Field.Root>

									<Field.Root>
										<Field.Label fontSize={["sm", null, "lg"]}>パスワード</Field.Label>
										<Input
											name="password"
											type="password"
											fontSize={["sm", null, "lg"]}
											size={["xs", null, "lg"]}
											value={formData.password}
											onChange={handleInputChange}
											onKeyDown={(e) => handleKeyDown(e, submitButtonRef)}
											ref={passInputRef}
											autoComplete="current-password"
											disabled={isSubmitting}
										/>
									</Field.Root>
								</Fieldset.Content>

								<Button
									type="submit"
									transition="backgrounds"
									transitionDuration="fast"
									bgColor={{
										base: "default",
										_hover: "rgb(83, 63, 194)"
									}}
									py={5}
									fontSize={["mg", null, "lg"]}
									size={["md", null, "lg"]}
									onClick={handleSubmit}
									ref={submitButtonRef}
									disabled={isSubmitting}
									loadingText="認証中..."
								>
									ログイン
								</Button>
							</Fieldset.Root>
						</form>
					</Card.Body>
				</Card.Root>
			</Box>
			<Toaster />
		</>
	);
};

export default LoginForm;