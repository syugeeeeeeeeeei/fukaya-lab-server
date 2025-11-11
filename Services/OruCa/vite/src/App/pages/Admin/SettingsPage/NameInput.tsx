import { Box, HStack, Input, Text } from "@chakra-ui/react";
import CheckButton from "@components/Buttons/CheckButton";
import CrossButton from "@components/Buttons/CrossButton";
import EditButton from "@components/Buttons/EditButton";
import React, { ChangeEvent, useRef, useState } from "react";

// コンポーネントのプロパティ型定義
type NameInputProps = {
	student_ID: string;
	student_Name: string | undefined;
	onClick: (student_ID: string, student_Name: string) => void;
	disabled?: boolean;
};

// 分離したスタイル定義
const styles = {
	container: {
		w: "100%"
	},
	inputStack: {
		w: "100%",
		justify: "right" as const,
		gap: [1, null, 3]
	},
	input: {
		placeholder: "名前を入力",
		w: "80%",
		h: "fit-content",
		borderColor: "blackAlpha.400",
		borderWidth: 1,
		fontSize: ["2xs", null, "lg"],
		py: [0, null, 2],
		letterSpacing: 1
	},
	displayStack: {
		w: "100%",
		justify: "right" as const
	},
	text: {
		w: "100%",
		textAlign: "center" as const,
		textDecoration: "underline",
		fontSize: ["xs", null, "xl"],
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis"
	}
};

/**
 * 名前入力コンポーネント
 * 通常モードと編集モードを切り替えて名前の表示・編集ができる
 */
const NameInput: React.FC<NameInputProps> = ({
	student_ID,
	student_Name = "",
	onClick,
	disabled = false
}) => {
	// 状態管理
	const [isEditable, setIsEditable] = useState(false);
	const [value, setValue] = useState<string>(student_Name);
	const inputRef = useRef<HTMLInputElement>(null);

	// 入力値の変更ハンドラ
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setValue(e.target.value);
	};

	// 編集モードを開始する関数
	const openInput = () => {
		if (disabled) return;
		setIsEditable(true);
		// DOMの更新後にフォーカスを設定
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	// 編集モードをキャンセルする関数
	const closeInput = () => {
		setIsEditable(false);
		setValue(student_Name); // キャンセル時に元の値に戻す
	};

	// 編集内容を確定する関数
	const handleSubmit = () => {
		if (disabled) return;
		onClick(student_ID, value);
		setIsEditable(false);
	};

	// キーボードイベント処理（Enter: 確定、Escape: キャンセル）
	const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSubmit();
		} else if (e.key === "Escape") {
			closeInput();
		}
	};

	return (
		<Box {...styles.container}>
			{isEditable ? (
				// 編集モード: 入力フィールドと確定/キャンセルボタンを表示
				<HStack {...styles.inputStack}>
					<Input
						{...styles.input}
						value={value}
						onChange={handleChange}
						ref={inputRef}
						onKeyDown={handleInputKeyDown}
						disabled={disabled}
					/>
					<CheckButton onClick={handleSubmit} disabled={disabled} />
					<CrossButton onClick={closeInput} disabled={disabled} />
				</HStack>
			) : (
				// 表示モード: 名前テキストと編集ボタンを表示
				<HStack {...styles.displayStack}>
					<Text
						{...styles.text}
						color={student_Name ? "default" : "none"}
					>
						{student_Name ? student_Name : "未入力"}
					</Text>
					<EditButton onClick={openInput} disabled={disabled} />
				</HStack>
			)}
		</Box>
	);
};

export default NameInput;