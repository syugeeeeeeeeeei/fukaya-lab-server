import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import cardMasterData from '../data/cardMasterData';
import * as logic from '../logic/gameLogic'; // ゲームロジックをインポート
import type { CellState, GameState, PlayerState, PlayerType } from '../types/data';

// --- 定数定義 ---
/** ゲームの基本設定 */
const GAME_SETTINGS = {
	FIELD_WIDTH: 7,
	FIELD_HEIGHT: 10,
	MAXIMUM_TURNS: 6,
};
/** カードプレビュー時のコマの初期表示位置 */
const DEFAULT_PREVIEW_POSITION = { x: 3, y: 5 };

// --- 型定義 ---

/** UIに固有の状態を管理する型 */
interface UIState {
	/** 現在選択されているカードのインスタンスID */
	selectedCardId: string | null;
	/** 現在選択されているフィールド上の外来種のインスタンスID */
	selectedAlienInstanceId: string | null;
	/** プレイヤーに表示する通知メッセージ */
	notification: { message: string; forPlayer: PlayerType } | null;
	/** カード使用時の効果範囲プレビューの中心位置 */
	previewPlacement: { x: number; y: number } | null;
	/** カードが選択され、プレビュー状態にあるかどうかを示すフラグ */
	isCardPreview: boolean;
}

/** 状態を変更するためのアクション（関数）の型 */
interface UIActions {
	/** 選択中のカードをプレビュー位置で使用する */
	playSelectedCard: () => void;
	/** ターンを進行させる */
	progressTurn: () => void;
	/** 選択中の外来種を移動させる */
	moveAlien: (targetCell: CellState) => void;
	/** 手札のカードを選択する */
	selectCard: (cardId: string) => void;
	/** カードの選択を解除する */
	deselectCard: () => void;
	/** フィールド上の外来種を選択する */
	selectAlienInstance: (instanceId: string | null) => void;
	/** 通知メッセージを設定する */
	setNotification: (message: string | null, forPlayer?: PlayerType) => void;
	/** ゲームを初期状態にリセットする */
	resetGame: () => void;
	/** プレビューコマの位置を設定する */
	setPreviewPlacement: (position: { x: number; y: number } | null) => void;
}

// --- 初期状態生成関数 ---

/** ゲーム全体の初期状態（GameState）を生成する */
const createInitialGameState = (): GameState => ({
	currentTurn: 1,
	maximumTurns: GAME_SETTINGS.MAXIMUM_TURNS,
	activePlayerId: 'alien',
	currentPhase: 'summon_phase',
	isGameOver: false,
	winningPlayerId: null,
	gameField: createInitialFieldState(),
	playerStates: {
		native: createInitialPlayerState('native', '在来種'),
		alien: createInitialPlayerState('alien', '外来種'),
	},
	activeAlienInstances: {},
	nativeScore: 0,
	alienScore: 0,
});

/** UIの初期状態（UIState）を生成する */
const createInitialUIState = (): UIState => ({
	selectedCardId: null,
	selectedAlienInstanceId: null,
	notification: null,
	previewPlacement: null,
	isCardPreview: false,
});

/** プレイヤー一人の初期状態（PlayerState）を生成する */
const createInitialPlayerState = (id: PlayerType, name: string): PlayerState => {
	// ハンデとして在来種側の初期エンバイロメントを多めに設定
	const isHandicapPlayer = id === 'native';
	const initialEnv = isHandicapPlayer ? 1 : 1;

	return {
		playerId: id,
		playerName: name,
		facingFactor: id === 'native' ? -1 : 1, // 奥側(native)を-1, 手前側(alien)を1に
		initialEnvironment: initialEnv, // ハンデ計算の基礎となる値
		currentEnvironment: initialEnv,
		maxEnvironment: initialEnv,
		cardLibrary: [],
		cooldownActiveCards: [],
		limitedCardsUsedCount: {},
	};
};

/** フィールドの初期状態（FieldState）を生成する */
const createInitialFieldState = (): GameState['gameField'] => {
	const { FIELD_WIDTH, FIELD_HEIGHT } = GAME_SETTINGS;
	// 全てのマスを在来種マスで埋める
	const cells = Array.from({ length: FIELD_HEIGHT }, (_, y) =>
		Array.from({ length: FIELD_WIDTH }, (_, x): CellState => ({
			x, y,
			cellType: 'native_area',
			ownerId: 'native',
		}))
	);
	return { width: FIELD_WIDTH, height: FIELD_HEIGHT, cells };
};


// --- Zustand Store ---

/** ストア全体の型定義 */
type StoreState = GameState & UIState & UIActions;

/**
 * ゲームの状態を一元管理するZustandストア
 */
export const useUIStore = create(
	immer<StoreState>((set, get) => ({
		...createInitialGameState(),
		...createInitialUIState(),

		/** 選択中のカードをプレビュー位置で使用する */
		playSelectedCard: () => {
			const { selectedCardId, previewPlacement, gameField } = get();
			if (!selectedCardId || !previewPlacement) return;
			const card = cardMasterData.find(c => c.id === selectedCardId.split('-instance-')[0]);
			if (!card) return;

			const targetCell = gameField.cells[previewPlacement.y][previewPlacement.x];
			// ゲームロジックを呼び出し、状態更新を試みる
			const result = logic.playCardLogic(get(), card, targetCell);

			if (typeof result === 'string') {
				// ロジックがエラーメッセージを返した場合、通知として表示
				set({ notification: { message: result, forPlayer: get().activePlayerId } });
			} else {
				// 成功した場合、新しいゲーム状態でストアを更新し、プレビュー状態を解除
				set({ ...result, selectedCardId: null, previewPlacement: null, isCardPreview: false });
			}
		},
		/** ターンを進行させる */
		progressTurn: () => {
			// ゲームロジックを呼び出し、次のターンの状態を取得
			const nextState = logic.progressTurnLogic(get());
			// ストアを更新し、選択状態などをリセット
			set({ ...nextState, selectedCardId: null, selectedAlienInstanceId: null, previewPlacement: null, isCardPreview: false });
		},
		/** 選択中の外来種を移動させる */
		moveAlien: (targetCell) => {
			const { selectedAlienInstanceId } = get();
			if (!selectedAlienInstanceId) return;
			// ゲームロジックを呼び出し、移動を試みる
			const result = logic.moveAlienLogic(get(), selectedAlienInstanceId, targetCell);
			if (typeof result === 'string') {
				set({ notification: { message: result, forPlayer: get().activePlayerId } });
			} else {
				set({ ...result, selectedAlienInstanceId: null });
			}
		},
		/** 手札のカードを選択する */
		selectCard: (cardId) => set((state: StoreState) => {
			const cardDefId = cardId.split('-instance-')[0];
			const player = state.playerStates[state.activePlayerId];

			// クールダウン中かチェック
			if (player.cooldownActiveCards.some(c => c.cardId === cardDefId)) {
				state.notification = { message: `このカードはクールタイム中です。`, forPlayer: state.activePlayerId };
				return;
			}
			const cardDef = cardMasterData.find(c => c.id === cardDefId);
			if (!cardDef) return;

			// 使用回数制限をチェック
			const limit = cardDef.usageLimit;
			const usedCount = player.limitedCardsUsedCount[cardDef.id] || 0;
			if (limit && usedCount >= limit) {
				state.notification = { message: `このカードはもう使用できません。`, forPlayer: state.activePlayerId };
				return;
			}

			// プレビュー状態を開始
			state.selectedCardId = cardId;
			state.selectedAlienInstanceId = null;
			state.previewPlacement = DEFAULT_PREVIEW_POSITION;
			state.isCardPreview = true;
		}),
		/** カードの選択を解除する */
		deselectCard: () => set({ selectedCardId: null, previewPlacement: null, isCardPreview: false }),
		/** フィールド上の外来種を選択する */
		selectAlienInstance: (instanceId) => set((state) => {
			if (state.activePlayerId !== 'alien') {
				state.notification = { message: "外来種サイドのターンではありません。", forPlayer: 'native' };
				return;
			}
			// 同じインスタンスを再度クリックした場合は選択解除
			if (state.selectedAlienInstanceId === instanceId) {
				state.selectedAlienInstanceId = null;
				return;
			}
			// 新しいインスタンスを選択し、他の選択状態をリセット
			state.selectedAlienInstanceId = instanceId;
			state.selectedCardId = null;
			state.previewPlacement = null;
			state.isCardPreview = false;
		}),
		/** 通知メッセージを設定する */
		setNotification: (message, forPlayer) => set((state) => {
			if (message && forPlayer) {
				state.notification = { message, forPlayer };
			} else {
				state.notification = null;
			}
		}),
		/** ゲームを初期状態にリセットする */
		resetGame: () => set({ ...createInitialGameState(), ...createInitialUIState() }),
		/** プレビューコマの位置を設定する（GameBoard3Dからのドラッグ操作で呼ばれる） */
		setPreviewPlacement: (position) => set((state) => {
			state.previewPlacement = position;
		}),
	}))
);