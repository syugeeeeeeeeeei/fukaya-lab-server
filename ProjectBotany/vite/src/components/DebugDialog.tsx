import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

// --- 定数定義 ---

/** ダイアログ全体のレイアウト・スタイル設定 */
const DIALOG_STYLES = {
	POSITION_BOTTOM: '75px',
	POSITION_RIGHT: '20px',
	BACKGROUND_COLOR: '#1c1c1ee6',
	BORDER_COLOR: '#444',
	BORDER_RADIUS: '8px',
	PADDING: '16px',
	MIN_WIDTH: '280px',
	GAP: '15px',
	TRANSITION: 'all 0.2s ease-in-out',
};

/** トグルボタンのレイアウト設定 */
const TOGGLE_BUTTON_STYLES = {
	POSITION_BOTTOM: '20px',
	POSITION_RIGHT: '20px',
};

/** セクションのスタイル設定 */
const SECTION_STYLES = {
	BORDER_TOP: '1px solid #333',
	PADDING_TOP: '10px',
	TITLE_COLOR: '#aaa',
};

/** 各スライダーコントロールの範囲設定 */
const SLIDER_RANGES = {
	SWIPE_AREA_HEIGHT: { min: 1, max: 10, step: 0.5 },
	FLICK_DISTANCE_RATIO: { min: 0.1, max: 0.8, step: 0.05 },
	FLICK_VELOCITY_THRESHOLD: { min: 0.1, max: 1.5, step: 0.05 },
};


// --- Styled Components ---

const DialogContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  bottom: ${DIALOG_STYLES.POSITION_BOTTOM};
  right: ${DIALOG_STYLES.POSITION_RIGHT};
  background-color: ${DIALOG_STYLES.BACKGROUND_COLOR};
  color: white;
  border: 1px solid ${DIALOG_STYLES.BORDER_COLOR};
  border-radius: ${DIALOG_STYLES.BORDER_RADIUS};
  padding: ${DIALOG_STYLES.PADDING};
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: ${DIALOG_STYLES.GAP};
  min-width: ${DIALOG_STYLES.MIN_WIDTH};
  font-family: sans-serif;
  transform-origin: bottom right;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  transform: scale(${({ $isOpen }) => ($isOpen ? 1 : 0.95)});
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: ${DIALOG_STYLES.TRANSITION};
`;

const ToggleButton = styled.button`
  position: fixed;
  bottom: ${TOGGLE_BUTTON_STYLES.POSITION_BOTTOM};
  right: ${TOGGLE_BUTTON_STYLES.POSITION_RIGHT};
  z-index: 1001;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: ${SECTION_STYLES.BORDER_TOP};
  padding-top: ${SECTION_STYLES.PADDING_TOP};
  &:first-child { border-top: none; padding-top: 0; }
`;

const SectionTitle = styled.h4`
  margin: 0;
  color: ${SECTION_STYLES.TITLE_COLOR};
  font-size: 0.9em;
  font-weight: normal;
`;

const ControlRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SliderRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
`;

const PlayerControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;


// --- 子コンポーネント ---

type PlayerControlProps = {
	name: string; currentPage: number; maxPage: number;
	onNext: () => void; onPrev: () => void;
};

/**
 * 特定のプレイヤーの手札ページを操作するためのUI。
 */
const PlayerControls: React.FC<PlayerControlProps> = ({ name, currentPage, maxPage, onNext, onPrev }) => (
	<ControlRow>
		<span>{name}</span>
		<div>
			<button onClick={onPrev} disabled={currentPage === 0}>◀</button>
			<span> {currentPage + 1} / {maxPage + 1} </span>
			<button onClick={onNext} disabled={currentPage === maxPage}>▶</button>
		</div>
	</ControlRow>
);


// --- メインコンポーネント ---

export type DebugSettings = {
	isGestureAreaVisible: boolean;
	flickDistanceRatio: number;
	flickVelocityThreshold: number;
	swipeAreaHeight: number;
};

interface DebugDialogProps {
	debugSettings: DebugSettings;
	onSetDebugSettings: (updater: (prev: DebugSettings) => DebugSettings) => void;
	cardMultiplier: number;
	onSetCardMultiplier: (updater: (prev: number) => number) => void;
	players: PlayerControlProps[];
	isAlienHandVisible: boolean;
	onToggleAlienHand: () => void;
	isNativeHandVisible: boolean;
	onToggleNativeHand: () => void;
}

/**
 * ゲームの各種パラメータをリアルタイムで調整するためのデバッグ用ダイアログ。
 */
export const DebugDialog: React.FC<DebugDialogProps> = ({
	debugSettings,
	onSetDebugSettings,
	cardMultiplier,
	onSetCardMultiplier,
	players,
	isAlienHandVisible,
	onToggleAlienHand,
	isNativeHandVisible,
	onToggleNativeHand,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

	const {
		isGestureAreaVisible,
		flickDistanceRatio,
		flickVelocityThreshold,
		swipeAreaHeight
	} = debugSettings;

	/** ブラウザのフルスクリーン表示を切り替える */
	const handleToggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(err => {
				alert(`全画面表示にできませんでした: ${err.message}`);
			});
		} else {
			document.exitFullscreen();
		}
	};

	/**
	 * フルスクリーン状態の変更（例: Escキー押下）を検知し、
	 * コンポーネントの`isFullscreen` stateに反映させる。
	 */
	useEffect(() => {
		const onFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
	}, []);

	return (
		<>
			<ToggleButton onClick={() => setIsOpen(o => !o)}>
				{isOpen ? 'Close Debug' : 'Open Debug'}
			</ToggleButton>
			<DialogContainer $isOpen={isOpen}>
				<Section>
					<SectionTitle>一般設定</SectionTitle>
					<ControlRow>
						<label>全画面表示</label>
						<button onClick={handleToggleFullscreen}>
							{isFullscreen ? '終了する' : '開始する'}
						</button>
					</ControlRow>
				</Section>

				<Section>
					<SectionTitle>表示設定</SectionTitle>
					<ControlRow>
						<label htmlFor="toggle-gesture-area">ジェスチャーエリア表示</label>
						<input
							type="checkbox" id="toggle-gesture-area"
							checked={isGestureAreaVisible}
							onChange={() => onSetDebugSettings(s => ({ ...s, isGestureAreaVisible: !s.isGestureAreaVisible }))}
						/>
					</ControlRow>
					<ControlRow>
						<label htmlFor="toggle-alien-hand">エイリアン手札表示</label>
						<input
							type="checkbox" id="toggle-alien-hand"
							checked={isAlienHandVisible}
							onChange={onToggleAlienHand}
						/>
					</ControlRow>
					<ControlRow>
						<label htmlFor="toggle-native-hand">ネイティブ手札表示</label>
						<input
							type="checkbox" id="toggle-native-hand"
							checked={isNativeHandVisible}
							onChange={onToggleNativeHand}
						/>
					</ControlRow>
					<SliderRow>
						<label>スワイプエリアの高さ</label>
						<span>{swipeAreaHeight.toFixed(1)}</span>
						<input
							type="range"
							{...SLIDER_RANGES.SWIPE_AREA_HEIGHT}
							value={swipeAreaHeight}
							onChange={(e) => onSetDebugSettings(s => ({ ...s, swipeAreaHeight: parseFloat(e.target.value) }))}
							style={{ gridColumn: '1 / -1' }}
						/>
					</SliderRow>
				</Section>

				<Section>
					<SectionTitle>ジェスチャー感度</SectionTitle>
					<SliderRow>
						<label>距離の比率 (小さいほど敏感)</label>
						<span>{flickDistanceRatio.toFixed(2)}</span>
						<input
							type="range"
							{...SLIDER_RANGES.FLICK_DISTANCE_RATIO}
							value={flickDistanceRatio}
							onChange={(e) => onSetDebugSettings(s => ({ ...s, flickDistanceRatio: parseFloat(e.target.value) }))}
							style={{ gridColumn: '1 / -1' }}
						/>
					</SliderRow>
					<SliderRow>
						<label>速度のしきい値 (小さいほど敏感)</label>
						<span>{flickVelocityThreshold.toFixed(2)}</span>
						<input
							type="range"
							{...SLIDER_RANGES.FLICK_VELOCITY_THRESHOLD}
							value={flickVelocityThreshold}
							onChange={(e) => onSetDebugSettings(s => ({ ...s, flickVelocityThreshold: parseFloat(e.target.value) }))}
							style={{ gridColumn: '1 / -1' }}
						/>
					</SliderRow>
				</Section>

				<Section>
					<SectionTitle>カード設定</SectionTitle>
					<ControlRow>
						<span>カード枚数倍率</span>
						<div>
							<button onClick={() => onSetCardMultiplier(m => Math.max(1, m - 1))}>-</button>
							<span> x{cardMultiplier} </span>
							<button onClick={() => onSetCardMultiplier(m => m + 1)}>+</button>
						</div>
					</ControlRow>
				</Section>

				<Section>
					<SectionTitle>手札ページ操作</SectionTitle>
					<PlayerControlsContainer>
						{players.map(p => <PlayerControls key={p.name} {...p} />)}
					</PlayerControlsContainer>
				</Section>
			</DialogContainer>
		</>
	);
};