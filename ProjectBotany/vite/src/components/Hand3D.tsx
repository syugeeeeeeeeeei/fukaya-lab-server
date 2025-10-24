import { animated, to, useSpring } from '@react-spring/three';
import { Plane } from '@react-three/drei';
import { type DragState, useGesture } from '@use-gesture/react';
import React, { useEffect, useMemo, useRef } from 'react';
import { useUIStore } from '../store/UIStore';
import type { CardDefinition, PlayerType } from '../types/data';
import Card3D from './Card3D';
import type { DebugSettings } from './DebugDialog';

// --- 型定義 ---

type CardWithInstanceId = CardDefinition & { instanceId: string };

interface Hand3DProps {
	player: PlayerType;
	cards: CardWithInstanceId[];
	isVisible: boolean;
	onVisibilityChange: (visible: boolean) => void;
	currentPage: number;
	onPageChange: (page: number) => void;
	debugSettings: DebugSettings;
	isInteractionLocked: boolean;
};

// --- 定数定義 ---

/** 手札のレイアウトに関する設定値 */
const HAND_LAYOUT = {
	CARDS_PER_PAGE: 3,      // 1ページあたりのカード枚数
	CARD_WIDTH: 1.8,        // カードの幅
	CARD_SPACING: 0.8,      // カード間のスペース
	get PAGE_WIDTH() {      // 1ページあたりの合計幅（カード+スペース）
		return (this.CARDS_PER_PAGE * this.CARD_WIDTH) + ((this.CARDS_PER_PAGE - 1) * this.CARD_SPACING);
	},
	PAGE_TRANSITION_SPACING: 1, // ページ切り替え時の追加スペース
	POSITION_Y: 2.2,        // 手札全体のY座標
	// 手札の表示/非表示時のZ座標
	Z_POSITIONS: {
		VISIBLE: 3.5,
		HIDDEN: 6,
	},
	// カードの傾き角度 (奥プレイヤーの角度を基準とする)
	TILT_ANGLE_BASE: Math.PI / 2.2,
	// カードのY軸回転 (奥プレイヤーの回転を基準とする)
	Y_ROTATION_BASE: Math.PI,
	CARD_SCALE: 1.25,       // カードの表示スケール
	// ジェスチャーを受け取るPlaneの設定
	GESTURE_PLANE: {
		WIDTH_PADDING: 4,         // 幅の追加分
		ROTATION_X: -Math.PI / 2, // X軸回転
		POSITION_Y: -0.2,         // Y座標
		POSITION_Z: 0.1,          // Z座標
	},
	// CardInLineコンポーネントのアニメーション設定
	CARD_IN_LINE_ANIMATION: {
		Z_POS_SELECTED: -0.5,       // 選択されたカードのZ座標
		Z_POS_DEFAULT: 0,           // デフォルトのZ座標
		OPACITY_VISIBLE: 1,         // 表示時の不透明度
		OPACITY_HIDDEN: 0.5,        // 非表示時の不透明度（選択されていないカード）
		SPRING_CONFIG: { tension: 300, friction: 20 } // アニメーションの物理設定
	},
};

/** ジェスチャー操作に関する設定値 */
const GESTURE_SETTINGS = {
	FLICK_DISTANCE_THRESHOLD: 45, // フリックと判定される最小移動距離
	DRAG_THRESHOLD: 10,           // ドラッグ開始と判定される最小移動距離
};

/**
 * プレイヤーの手札を3D空間に表示するコンポーネント。
 * カードのページング、表示/非表示の切り替え、ジェスチャー操作を管理する。
 */
const Hand3D: React.FC<Hand3DProps> = ({
	player,
	cards,
	isVisible,
	onVisibilityChange,
	currentPage,
	onPageChange,
	debugSettings,
	isInteractionLocked
}) => {
	// --- StateとStore ---
	const { isGestureAreaVisible, flickVelocityThreshold, swipeAreaHeight } = debugSettings;
	const { deselectCard, selectedCardId, playerStates } = useUIStore();
	const { facingFactor } = playerStates[player];

	// --- 変数とロジック ---
	const maxPage = Math.ceil(cards.length / HAND_LAYOUT.CARDS_PER_PAGE) - 1;

	const isVisibleRef = useRef(isVisible);
	useEffect(() => {
		isVisibleRef.current = isVisible;
	}, [isVisible]);

	// --- アニメーション ---
	const { x } = useSpring({
		x: -currentPage * (HAND_LAYOUT.PAGE_WIDTH + HAND_LAYOUT.PAGE_TRANSITION_SPACING) * facingFactor,
		config: { tension: 300, friction: 30 },
	});

	const { z } = useSpring({
		z: isVisible ? HAND_LAYOUT.Z_POSITIONS.VISIBLE : HAND_LAYOUT.Z_POSITIONS.HIDDEN,
		config: { tension: 300, friction: 20 },
	});


	// --- ジェスチャーハンドラ ---

	/**
	 * 左右フリック（ページめくり）を専門に扱う関数
	 * @param state - useGestureから渡されるドラッグ状態
	 */
	const handleHorizontalFlick = (state: DragState) => {
		const { movement: [mx], velocity: [vx], direction: [dx] } = state;
		const absMx = Math.abs(mx);

		// 条件判定
		const isFlickDistanceMet = absMx > GESTURE_SETTINGS.FLICK_DISTANCE_THRESHOLD;
		const isFlickVelocityMet = Math.abs(vx) > flickVelocityThreshold;

		if (isFlickDistanceMet && isFlickVelocityMet) {
			// フリック方向（dx）に応じて、ページ番号を増減させる量を決定する (-1 or 1)
			// この計算は、プレイヤーの向き（facingFactor）に関わらず、両プレイヤーで共通となる
			const pageIncrement = -Math.sign(dx) * facingFactor;

			// 現在のページ番号に増減値を加え、新しいページ番号を計算する
			// ただし、計算結果が 0 未満や最大ページ数を超えないよう、Math.maxとMath.minで範囲内に収める
			const newPage = Math.max(0, Math.min(maxPage, currentPage + pageIncrement));
			console.log(newPage, currentPage, maxPage);

			if (newPage !== currentPage) onPageChange(newPage);
		}
	};

	/**
	 * 上下フリック（手札の表示/非表示）を専門に扱う関数
	 * @param state - useGestureから渡されるドラッグ状態
	 */
	const handleVerticalFlick = (state: DragState) => {
		const { movement: [_, my], velocity: [__, vy], direction: [___, dy] } = state;
		const absMy = Math.abs(my);

		// 条件判定
		const isFlickDistanceMet = absMy > GESTURE_SETTINGS.FLICK_DISTANCE_THRESHOLD;
		const isFlickVelocityMet = Math.abs(vy) > (flickVelocityThreshold * 0.5);

		if (isFlickDistanceMet && isFlickVelocityMet) {
			// facingFactorを使い、スワイプ方向と表示/非表示のロジックを一般化
			// 奥側(factor:-1): 上スワイプ(dy<0)で隠す -> dy*factor > 0
			// 手前側(factor:1): 下スワイプ(dy>0)で隠す -> dy*factor > 0
			const shouldHide = (dy * facingFactor) > 0;
			const shouldShow = (dy * facingFactor) < 0;

			if (shouldHide && isVisibleRef.current) {
				onVisibilityChange(false);
			} else if (shouldShow && !isVisibleRef.current) {
				onVisibilityChange(true);
			}
		}
	};

	/**
	 * ドラッグイベントの司令塔（ディスパッチャー）となるハンドラ
	 */
	const bind = useGesture(
		{
			onDrag: (state) => {
				const { last, movement: [mx, my], tap, event } = state;
				// ドラッグ終了時でなければ何もしない
				if (tap || !last) return;
				event.stopPropagation();

				const isDragHorizontal = Math.abs(mx) > Math.abs(my);

				// ドラッグ方向に応じて、専門のハンドラを呼び出す
				if (isDragHorizontal) {
					handleHorizontalFlick(state);
				} else {
					handleVerticalFlick(state);
				}
			},
			onClick: ({ event }) => {
				event.stopPropagation();
				if (isVisibleRef.current && selectedCardId) {
					deselectCard();
				}
			},
		},
		{
			enabled: !isInteractionLocked,
			drag: {
				filterTaps: true,
				threshold: GESTURE_SETTINGS.DRAG_THRESHOLD,
			},
		}
	);

	const pages = useMemo(() => {
		// --- ステップ1: プレイヤーの向きに応じてカードの表示順を決定する ---

		const orderedCards: CardWithInstanceId[] = cards;
		
		// --- ステップ2: 順番が確定したカードリストを、ページ単位の配列に分割する ---

		const allPages: CardWithInstanceId[][] = [];
		const cardsPerPage = HAND_LAYOUT.CARDS_PER_PAGE; // 1ページあたりのカード枚数

		// forループを使い、1ページあたりの枚数ずつインデックスを増やしながら処理
		for (let i = 0; i < orderedCards.length; i += cardsPerPage) {
			// Array.slice() を使い、現在のインデックスから1ページ分のカードを切り出す
			const singlePage = orderedCards.slice(i, i + cardsPerPage);

			// 切り出したページを最終的な結果の配列に追加する
			allPages.push(singlePage);
		}
		return allPages;

	}, [cards, facingFactor]);
	

	// --- レンダリング ---
	return (
		<animated.group position={to([z], (zVal) => [0, HAND_LAYOUT.POSITION_Y, zVal * facingFactor])}>
			<Plane
				args={[HAND_LAYOUT.PAGE_WIDTH + HAND_LAYOUT.GESTURE_PLANE.WIDTH_PADDING, swipeAreaHeight]}
				rotation={[HAND_LAYOUT.GESTURE_PLANE.ROTATION_X, 0, 0]}
				position={[0, HAND_LAYOUT.GESTURE_PLANE.POSITION_Y, HAND_LAYOUT.GESTURE_PLANE.POSITION_Z]}
				{...bind()}
			>
				<meshStandardMaterial
					color="red"
					transparent
					opacity={0.3}
					visible={isGestureAreaVisible}
				/>
			</Plane>

			<animated.group position-x={x}>
				{pages.map((pageCards, pageIndex) => (
					<group key={pageIndex} position={[ pageIndex * (HAND_LAYOUT.PAGE_WIDTH + HAND_LAYOUT.PAGE_TRANSITION_SPACING) * facingFactor, 0, 0]}>
						{pageCards.map((card, cardIndex) => (
							<CardInLine
								key={card.instanceId}
								card={card}
								index={cardIndex}
								player={player}
								facingFactor={facingFactor}
								isSelected={selectedCardId === card.instanceId}
								isListVisible={isVisible}
							/>
						))}
					</group>
				))}
			</animated.group>
		</animated.group>
	);
};


// --- CardInLineコンポーネント ---

interface CardInLineProps {
	card: CardWithInstanceId;
	index: number;
	player: PlayerType;
	facingFactor: 1 | -1;
	isSelected: boolean;
	isListVisible: boolean;
}

/**
 * 手札の中で横一列に並ぶ個々のカード。
 * 位置計算と表示状態に応じたアニメーションを担当する。
 */
const CardInLine: React.FC<CardInLineProps> = ({ card, index, player, facingFactor, isSelected, isListVisible }) => {
	// --- 位置計算 ---
	const totalWidth = HAND_LAYOUT.PAGE_WIDTH;
	const startX = -totalWidth / 2;
	const xPos = facingFactor * ( startX + index * (HAND_LAYOUT.CARD_WIDTH + HAND_LAYOUT.CARD_SPACING) + HAND_LAYOUT.CARD_WIDTH / 2);

	// --- 角度計算 ---
	// 奥側(factor:-1)は正の角度、手前側(factor:1)は負の角度になる
	const tiltAngle = HAND_LAYOUT.TILT_ANGLE_BASE * -facingFactor;
	// 奥側(factor:-1)はPI回転、手前側(factor:1)は0回転になる
	const yRotation = (1 - facingFactor) / 2 * HAND_LAYOUT.Y_ROTATION_BASE;

	// --- アニメーション ---
	const { z, opacity } = useSpring({
		// isSelectedがtrueの場合、カードを少し手前に移動させる
		// 奥側(factor:-1)はZ+方向、手前側(factor:1)はZ-方向に浮き上がる
		z: isSelected ? facingFactor * HAND_LAYOUT.CARD_IN_LINE_ANIMATION.Z_POS_SELECTED : facingFactor * HAND_LAYOUT.CARD_IN_LINE_ANIMATION.Z_POS_DEFAULT,

		opacity: isListVisible
			? HAND_LAYOUT.CARD_IN_LINE_ANIMATION.OPACITY_VISIBLE
			// eslint-disable-next-line indent
			: (isSelected ? HAND_LAYOUT.CARD_IN_LINE_ANIMATION.OPACITY_VISIBLE : HAND_LAYOUT.CARD_IN_LINE_ANIMATION.OPACITY_HIDDEN),

		config: HAND_LAYOUT.CARD_IN_LINE_ANIMATION.SPRING_CONFIG,
	});

	// --- レンダリング ---
	return (
		<animated.group position-x={xPos} position-z={z}>
			<group rotation={[tiltAngle, yRotation, 0]} scale={HAND_LAYOUT.CARD_SCALE}>
				<Card3D
					card={card}
					position={[0, 0, 0]}
					player={player}
					width={HAND_LAYOUT.CARD_WIDTH}
					opacity={opacity}
				/>
			</group>
		</animated.group>
	);
};

export default Hand3D;