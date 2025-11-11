import React, { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';

// --- 定数定義 ---

/** アニメーション設定 */
const ANIMATIONS = {
	APPEAR_DURATION: '0.2s',
	EXIT_DURATION: '0.5s',
	TIMING_FUNCTION: 'ease-in-out',
};

/** レイアウト・スタイル設定 */
const STYLES = {
	BACKGROUND_COLOR: 'rgba(0, 0, 0, 0.8)',
	BORDER_TOP: '4px solid lightgray',
	Z_INDEX: 100,
	BUTTON_COLOR: '#4CAF50',
	BUTTON_HOVER_COLOR: '#45a049',
};

/** フォントサイズ設定 (メッセージの長さに応じて変動) */
const FONT_SIZES = {
	small: '1.5em',
	medium: '2.0em',
	large: '2.5em',
};

/** フォントサイズを決定する文字数のしきい値 */
const FONT_SIZE_THRESHOLDS = {
	small: 30,
	medium: 20,
};

// --- Keyframes ---

const quickAppear = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;


// --- Styled Components ---

const OverlayContainer = styled.div<{ $isExiting: boolean; side: 'top' | 'bottom' }>`
  position: absolute;
  left: 0;
  width: 100%;
  height: 50%;
  box-sizing: border-box;
  border-top: ${STYLES.BORDER_TOP};

  /* プレイヤーサイドに応じて上下に配置し、上部プレイヤーは180度回転 */
  ${({ side }) => side === 'top' ? 'top: 0;' : 'bottom: 0;'}
  ${({ side }) => side === 'top' && 'transform: rotate(180deg);'}

  background-color: ${STYLES.BACKGROUND_COLOR};
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: ${STYLES.Z_INDEX};
  font-family: sans-serif;
  text-align: center;
  white-space: pre-wrap;
  pointer-events: all;

  /* 表示/非表示状態に応じてアニメーションを適用 */
  animation-name: ${({ $isExiting }) => ($isExiting ? fadeOut : quickAppear)};
  animation-duration: ${({ $isExiting }) => ($isExiting ? ANIMATIONS.EXIT_DURATION : ANIMATIONS.APPEAR_DURATION)};
  animation-timing-function: ${ANIMATIONS.TIMING_FUNCTION};
  animation-fill-mode: forwards;
`;

const Message = styled.h2<{ $fontSize: string }>`
  font-size: ${({ $fontSize }) => $fontSize};
  margin: 0 20px;
  text-shadow: 0 0 10px #000;
`;

const SubMessage = styled.p`
  font-size: 1.3em;
  margin-top: 10px;
`;

const ActionButton = styled.button`
  margin-top: 30px;
  padding: 15px 30px;
  font-size: 1.2em;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  background-color: ${STYLES.BUTTON_COLOR};
  color: white;
  transition: all 0.2s;

  &:hover {
    background-color: ${STYLES.BUTTON_HOVER_COLOR};
  }
`;

const ScoreContainer = styled.div`
  margin-top: 20px;
  font-size: 1.1em;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 10px 20px;
  border-radius: 8px;
`;

const ScoreRow = styled.div`
  display: flex;
  justify-content: space-between;
  width: 250px;
`;


// --- Component ---

interface UIOverlayProps {
	show: boolean;
	message: string;
	subMessage?: string;
	buttonText?: string;
	onButtonClick?: () => void;
	side: 'top' | 'bottom';
	isDismissible?: boolean;
	onDismiss?: () => void;
	scoreInfo?: {
		native: number;
		alien: number;
		total: number;
	}
}

/**
 * ゲームの情報を画面半分に表示するオーバーレイコンポーネント。
 * ターン表示、通知、ゲーム開始/終了画面などに使用される。
 */
const UIOverlay: React.FC<UIOverlayProps> = ({
	show,
	message,
	subMessage,
	buttonText,
	onButtonClick,
	side,
	isDismissible,
	onDismiss,
	scoreInfo,
}) => {
	const [isRendered, setIsRendered] = useState(show);

	/**
	 * メッセージの文字数に応じて動的にフォントサイズを決定する。
	 * 長いメッセージは小さく、短いメッセージは大きく表示する。
	 */
	const fontSize = useMemo(() => {
		const len = message.length;
		if (len > FONT_SIZE_THRESHOLDS.small) return FONT_SIZES.small;
		if (len > FONT_SIZE_THRESHOLDS.medium) return FONT_SIZES.medium;
		return FONT_SIZES.large;
	}, [message]);

	/**
	 * `show` propの変更を監視し、フェードアウトアニメーションのためのレンダリング遅延を管理する。
	 * `show`が`false`になっても、アニメーションが終わるまでコンポーネントをDOMに保持する。
	 */
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		if (show) {
			setIsRendered(true);
		} else {
			timer = setTimeout(() => setIsRendered(false), parseFloat(ANIMATIONS.EXIT_DURATION) * 1000);
		}
		return () => clearTimeout(timer);
	}, [show]);

	/**
	 * オーバーレイ自体がクリックされたときに、即座に非表示にするためのハンドラ。
	 * `isDismissible`がtrueの場合にのみ機能する。
	 */
	const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
		// ボタンなど子要素のクリックイベントは無視
		if (e.target !== e.currentTarget) return;
		if (isDismissible && onDismiss) {
			onDismiss();
		}
	};

	// レンダリングが不要な場合はnullを返す
	if (!isRendered) {
		return null;
	}

	return (
		<OverlayContainer $isExiting={!show} side={side} onClick={handleContainerClick}>
			<Message $fontSize={fontSize}>{message}</Message>
			{subMessage && <SubMessage>{subMessage}</SubMessage>}

			{scoreInfo && (
				<ScoreContainer>
					<ScoreRow>
						<span>在来種マス:</span>
						<span>{scoreInfo.native} / {scoreInfo.total}</span>
					</ScoreRow>
					<ScoreRow>
						<span>外来種マス:</span>
						<span>{scoreInfo.alien} / {scoreInfo.total}</span>
					</ScoreRow>
				</ScoreContainer>
			)}

			{buttonText && onButtonClick && (
				<ActionButton onClick={onButtonClick}>
					{buttonText}
				</ActionButton>
			)}
		</OverlayContainer>
	);
};

export default UIOverlay;