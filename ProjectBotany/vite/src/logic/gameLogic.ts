import { produce } from "immer";
import { nanoid } from "nanoid";
import cardMasterData from "../data/cardMasterData";
import type {
	ActiveAlienInstance,
	AlienCard,
	AlienCoreCell,
	AlienInvasionAreaCell,
	CardDefinition,
	CellState,
	DirectionType,
	EmptyAreaCell,
	EradicationCard,
	FieldState,
	GameState,
	NativeAreaCell,
	PlayerType,
	RecoveryCard,
	RecoveryPendingAreaCell,
} from "../types/data";

// --- 定数定義 ---
/** ゲームの基本設定 */
const GAME_SETTINGS = {
	FIELD_WIDTH: 7,
	FIELD_HEIGHT: 10,
	MAXIMUM_TURNS: 8,
};

// --- 型安全なセル生成ヘルパー関数 ---

/** 空マス（EmptyAreaCell）を生成するヘルパー関数 */
const createEmptyAreaCell = (x: number, y: number): EmptyAreaCell => ({
	x, y, cellType: "empty_area", ownerId: null,
});

/** 再生待機マス（RecoveryPendingAreaCell）を生成するヘルパー関数 */
const createRecoveryPendingAreaCell = (x: number, y: number, turn: number): RecoveryPendingAreaCell => ({
	x, y, cellType: "recovery_pending_area", ownerId: null, recoveryPendingTurn: turn,
});

/** 在来種マス（NativeAreaCell）を生成するヘルパー関数 */
const createNativeAreaCell = (x: number, y: number): NativeAreaCell => ({
	x, y, cellType: "native_area", ownerId: "native",
});

/** 外来種（コア）マス（AlienCoreCell）を生成するヘルパー関数 */
const createAlienCoreCell = (x: number, y: number, instanceId: string): AlienCoreCell => ({
	x, y, cellType: "alien_core", ownerId: "alien", alienInstanceId: instanceId,
});

/** 侵略マス（AlienInvasionAreaCell）を生成するヘルパー関数 */
const createAlienInvasionAreaCell = (x: number, y: number, dominantId: string): AlienInvasionAreaCell => ({
	x, y, cellType: "alien_invasion_area", ownerId: "alien", dominantAlienInstanceId: dominantId,
});


// --- 公開（エクスポート）するロジック関数 ---

/**
 * カードの効果範囲を計算する。UIでのプレビュー表示と、実際の効果適用時の両方で使われる。
 * @param card - 効果を計算するカードの定義
 * @param targetCell - 効果の中心、または起点となるマス
 * @param field - 現在のフィールドの状態
 * @param facingFactor - プレイヤーの向き(1 or -1)。Y軸の方向を反転させるために使用。
 * @returns 効果が及ぶマスの配列
 */
export const getEffectRange = (
	card: CardDefinition,
	targetCell: CellState,
	field: FieldState,
	facingFactor: 1 | -1,
): CellState[] => {
	const { width, height, cells } = field;
	const { x: cx, y: cy } = targetCell;
	const coords: { x: number; y: number }[] = [];

	// 'target' プロパティが 'species' の場合は特別な処理を行う
	if ("target" in card.targeting && card.targeting.target === "species") {
		// 特定の外来種とその支配マス全てを対象とする
		const dominantId =
			(targetCell.cellType === "alien_core" && targetCell.alienInstanceId) ||
			(targetCell.cellType === "alien_invasion_area" && targetCell.dominantAlienInstanceId);

		if (dominantId) {
			// フィールド全体を走査し、同じIDを持つマスをすべて効果範囲に含める
			cells.flat().forEach(cell => {
				if ((cell.cellType === "alien_core" && cell.alienInstanceId === dominantId) ||
					(cell.cellType === "alien_invasion_area" && cell.dominantAlienInstanceId === dominantId)) {
					coords.push({ x: cell.x, y: cell.y });
				}
			});
		} else {
			// 対象が見つからなかった場合は、クリックしたマスのみを対象とする
			coords.push({ x: cx, y: cy });
		}
	} else {
		// 'shape' に基づいて効果範囲を計算
		const { power, shape } = card.targeting;
		switch (shape) {
			case "single": // 単一マス
				coords.push({ x: cx, y: cy });
				break;
			case "cross": // 十字範囲
				// 中心マスを含める
				coords.push({ x: cx, y: cy });
				for (let i = 1; i <= power; i++) {
					coords.push({ x: cx, y: cy + i });
					coords.push({ x: cx, y: cy - i });
					coords.push({ x: cx + i, y: cy });
					coords.push({ x: cx - i, y: cy });
				}
				break;
			case "range": // 正方形範囲
				for (let y = cy - (power - 1); y <= cy + (power - 1); y++) {
					for (let x = cx - (power - 1); x <= cx + (power - 1); x++) {
						coords.push({ x, y });
					}
				}
				break;
			case "straight": // 直線範囲
				{ // スコープをブロック内に限定
					const { direction } = card.targeting; // 型ガードにより direction が存在することが保証される
					const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], vertical: [0, 1, 0, -1], horizon: [1, 0, -1, 0] };
					const move = directions[direction];
					// 奥側プレイヤーの場合、上下の方向を反転させる
					const yMultiplier = (direction === 'up' || direction === 'down' || direction === 'vertical') ? facingFactor : 1;
					for (let i = 1; i <= power; i++) {
						for (let j = 0; j < move.length; j += 2) {
							coords.push({ x: cx + move[j] * i, y: cy + move[j + 1] * i * yMultiplier });
						}
					}
					break;
				}
		}
	}

	// 計算された座標のうち、フィールドの範囲内に収まるものだけを実際のセルオブジェクトに変換して返す
	return coords
		.filter(c => c.x >= 0 && c.x < width && c.y >= 0 && c.y < height)
		.map(c => cells[c.y][c.x]);
};

/**
 * カードの使用を試みるメインロジック。
 * @param state - 現在のゲーム状態
 * @param card - 使用するカードの定義
 * @param targetCell - カードを使用する対象のマス
 * @returns 成功した場合は新しいゲーム状態、失敗した場合はエラーメッセージ文字列
 */
export const playCardLogic = (
	state: GameState,
	card: CardDefinition,
	targetCell: CellState,
): GameState | string => {
	const { activePlayerId } = state;
	const currentPlayer = state.playerStates[activePlayerId];

	// --- バリデーションチェック ---
	if (currentPlayer.currentEnvironment < card.cost) return "エンバイロメントが足りません！";
	// 外来種カードの配置ルール
	if (card.cardType === "alien" && (targetCell.cellType === "empty_area" || targetCell.cellType === "recovery_pending_area" || targetCell.cellType === "alien_core")) return "このマスには配置できません";
	// 回復カードの使用ルール
	if (card.cardType === "recovery" && !("target" in card.targeting && card.targeting.target === "species") && (targetCell.cellType !== "empty_area" && targetCell.cellType !== "recovery_pending_area")) return "このマスは回復できません。";
	// 駆除カードの使用ルール
	if (card.cardType === "eradication" && targetCell.cellType === "native_area") return "在来種マスは駆除対象にできません。";

	// --- 状態更新 (immerを使用) ---
	return produce(state, draft => {
		const newPlayerState = draft.playerStates[activePlayerId];

		// 効果範囲を計算
		const effectRange = getEffectRange(card, targetCell, draft.gameField, newPlayerState.facingFactor);

		// カードの種類に応じて、それぞれの効果適用関数を呼び出す
		switch (card.cardType) {
			case "alien": applyAlienCard(draft, card, targetCell); break;
			case "eradication": applyEradicationCard(draft, card, effectRange); break;
			case "recovery": applyRecoveryCard(draft, card, effectRange); break;
		}

		// カード使用後の共通処理
		newPlayerState.currentEnvironment -= card.cost; // コストを支払う
		if (card.cooldownTurns) { // クールタイムを設定
			newPlayerState.cooldownActiveCards.push({ cardId: card.id, turnsRemaining: card.cooldownTurns });
		}
		if (card.usageLimit) { // 使用回数を記録
			newPlayerState.limitedCardsUsedCount[card.id] = (newPlayerState.limitedCardsUsedCount[card.id] || 0) + 1;
		}
	});
};

/**
 * 外来種の移動を試みるロジック。
 * @param state - 現在のゲーム状態
 * @param alienInstanceId - 移動する外来種のID
 * @param targetCell - 移動先のマス
 * @returns 成功した場合は新しいゲーム状態、失敗した場合はエラーメッセージ文字列
 */
export const moveAlienLogic = (
	state: GameState,
	alienInstanceId: string,
	targetCell: CellState,
): GameState | string => {
	const alien = state.activeAlienInstances[alienInstanceId];
	if (!alien) return "指定された外来種が見つかりません。";

	const originalCard = cardMasterData.find(c => c.id === alien.cardDefinitionId);
	if (!originalCard) return "外来種の元カード情報が見つかりません。";

	const moveCost = originalCard.cost;
	const currentPlayer = state.playerStates[state.activePlayerId];

	// --- バリデーションチェック ---
	if (currentPlayer.currentEnvironment < moveCost) return "移動のためのエンバイロメントが足りません！";
	if (targetCell.cellType !== "alien_invasion_area" || targetCell.dominantAlienInstanceId !== alien.instanceId) return "自身の侵略マスにしか移動できません";

	// --- 状態更新 (immerを使用) ---
	return produce(state, draft => {
		const newAlien = draft.activeAlienInstances[alienInstanceId];
		const newPlayerState = draft.playerStates[draft.activePlayerId];

		// 元いたマスを空マスに置き換える
		draft.gameField.cells[newAlien.currentY][newAlien.currentX] = createEmptyAreaCell(newAlien.currentX, newAlien.currentY);
		// 新しいターゲットマスをコアマスに置き換える
		draft.gameField.cells[targetCell.y][targetCell.x] = createAlienCoreCell(targetCell.x, targetCell.y, newAlien.instanceId);

		// 外来種インスタンスの状態を更新
		newAlien.currentX = targetCell.x;
		newAlien.currentY = targetCell.y;
		newAlien.turnsSinceLastAction = 0; // アクション（移動）したので経過ターンをリセット
		newPlayerState.currentEnvironment -= moveCost; // コストを支払う
	});
};

/**
 * ターンを進行させるロジック。
 * @param state - 現在のゲーム状態
 * @returns 次のターンに進んだ新しいゲーム状態
 */
export const progressTurnLogic = (state: GameState): GameState => {
	if (state.isGameOver) return state;

	return produce(state, draft => {
		// 現在のプレイヤーに応じて、ターン終了時の自動処理（活性フェーズ）を実行
		if (draft.activePlayerId === "alien") {
			runAlienActivationPhase(draft);
		} else {
			runNativeActivationPhase(draft);
		}

		// プレイヤーを交代し、必要であればターン数を進める
		const nextPlayerId: PlayerType = draft.activePlayerId === "alien" ? "native" : "alien";
		const isNewTurnStarting = nextPlayerId === "alien"; // 外来種の手番で新しいターンが始まる
		const nextTurn = isNewTurnStarting ? draft.currentTurn + 1 : draft.currentTurn;

		// 全プレイヤーの状態を更新
		(Object.keys(draft.playerStates) as PlayerType[]).forEach(playerId => {
			const player = draft.playerStates[playerId];

			// ハンデを考慮したエンバイロメント計算式
			// (次のターン数 - 1) に、各プレイヤーの初期エンバイロメントを加算する
			const newMaxEnv = (nextTurn - 1) + player.initialEnvironment;

			// エンバイロメントを最大値まで回復
			player.maxEnvironment = newMaxEnv;
			player.currentEnvironment = newMaxEnv;
			// クールダウンを1ターン進める
			player.cooldownActiveCards = player.cooldownActiveCards
				.map(c => ({ ...c, turnsRemaining: c.turnsRemaining - 1 }))
				.filter(c => c.turnsRemaining > 0);
		});

		// ゲーム終了判定
		const isGameOver = nextTurn > GAME_SETTINGS.MAXIMUM_TURNS;
		if (isGameOver && !draft.isGameOver) {
			// スコアを計算して勝者を決定
			const nativeScore = draft.gameField.cells.flat().filter(c => c.ownerId === "native").length;
			const alienScore = draft.gameField.cells.flat().filter(c => c.ownerId === "alien").length;

			// 計算したスコアをstateに保存
			draft.nativeScore = nativeScore;
			draft.alienScore = alienScore;

			if (nativeScore > alienScore) draft.winningPlayerId = "native";
			else if (alienScore > nativeScore) draft.winningPlayerId = "alien";
			else draft.winningPlayerId = null; // 引き分け
		}

		// 新しい状態をセット
		draft.currentTurn = nextTurn;
		draft.activePlayerId = nextPlayerId;
		draft.isGameOver = isGameOver;
	});
};

// --- 内部ヘルパー関数 ---

/**
 * 外来種の成長ロジックを適用する
 * @param alien - 成長対象の外来種インスタンス
 * @param cardDef - 対応するカード定義
 */
const applyGrowthLogic = (alien: ActiveAlienInstance, cardDef: AlienCard) => {
	// 成長能力がないカードは対象外
	if (!cardDef.canGrow || !cardDef.growthConditions || !cardDef.growthEffects) {
		return;
	}

	const currentStage = alien.currentGrowthStage;
	// 次の成長段階の定義を取得
	const nextCondition = cardDef.growthConditions[currentStage];
	const nextEffect = cardDef.growthEffects[currentStage];

	// 完全に成長しきっている場合は何もしない
	if (!nextCondition || !nextEffect) {
		return;
	}

	// 成長条件をチェック
	let conditionMet = false;
	if (nextCondition.type === 'turns_since_last_action') {
		if (alien.turnsSinceLastAction >= nextCondition.value) {
			conditionMet = true;
		}
	}

	// 条件を満たしていれば成長効果を適用
	if (conditionMet) {
		if (nextEffect.newInvasionPower) {
			alien.currentInvasionPower = nextEffect.newInvasionPower;
		}
		if (nextEffect.newInvasionShape) {
			alien.currentInvasionShape = nextEffect.newInvasionShape;
		}
		// 成長段階を進め、経過ターンをリセット
		alien.currentGrowthStage += 1;
		alien.turnsSinceLastAction = 0;
	}
}

/** 外来種カードの効果を適用する */
const applyAlienCard = (state: GameState, card: AlienCard, targetCell: CellState) => {
	// 新しい外来種インスタンスを作成
	const newAlienInstance: ActiveAlienInstance = {
		instanceId: nanoid(),
		cardDefinitionId: card.id,
		spawnedTurn: state.currentTurn,
		currentX: targetCell.x,
		currentY: targetCell.y,
		currentGrowthStage: 0,
		currentInvasionPower: card.targeting.power,
		currentInvasionShape: card.targeting.shape,
		turnsSinceLastAction: 0,
	};
	state.activeAlienInstances[newAlienInstance.instanceId] = newAlienInstance;
	// 対象マスを新しい外来種（コア）マスに置き換える
	state.gameField.cells[targetCell.y][targetCell.x] = createAlienCoreCell(targetCell.x, targetCell.y, newAlienInstance.instanceId);
};

/** 駆除カードの効果を適用する */
const applyEradicationCard = (state: GameState, card: EradicationCard, effectRange: CellState[]) => {
	effectRange.forEach(target => {
		const cellToUpdate = state.gameField.cells[target.y][target.x];
		// 駆除対象が外来種（コア）マスだった場合、対応するインスタンスも削除
		if (cellToUpdate.cellType === "alien_core" && state.activeAlienInstances[cellToUpdate.alienInstanceId]) {
			delete state.activeAlienInstances[cellToUpdate.alienInstanceId];
		}
		// カード定義に基づき、マスを空マスまたは再生待機マスに置き換える
		if (card.postRemovalState === "empty_area") {
			state.gameField.cells[target.y][target.x] = createEmptyAreaCell(target.x, target.y);
		} else {
			state.gameField.cells[target.y][target.x] = createRecoveryPendingAreaCell(target.x, target.y, state.currentTurn);
		}
	});
};

/** 回復カードの効果を適用する */
const applyRecoveryCard = (state: GameState, card: RecoveryCard, effectRange: CellState[]) => {
	effectRange.forEach(target => {
		const cellToUpdate = state.gameField.cells[target.y][target.x];
		// 回復可能なマス（空マス、再生待機マスなど）かチェック
		if (cellToUpdate.cellType === "empty_area" || cellToUpdate.cellType === "recovery_pending_area" || ("target" in card.targeting && card.targeting.target === "species")) {
			// カード定義に基づき、マスを在来種マスまたは再生待機マスに置き換える
			if (card.postRecoveryState === "native_area") {
				state.gameField.cells[target.y][target.x] = createNativeAreaCell(target.x, target.y);
			} else {
				state.gameField.cells[target.y][target.x] = createRecoveryPendingAreaCell(target.x, target.y, state.currentTurn);
			}
		}
	});
};

/** 外来種サイドの活性フェーズ（ターン終了時処理）を実行する */
const runAlienActivationPhase = (state: GameState) => {
	// 1. 全ての外来種の経過ターンをインクリメント
	Object.values(state.activeAlienInstances).forEach(alien => {
		alien.turnsSinceLastAction += 1;
	});

	// 2. 侵略優先度（コスト大＞配置が新しい）に基づいて外来種をソート
	const sortedAliens: ActiveAlienInstance[] = Object.values(state.activeAlienInstances).sort((a, b) => {
		const costA = cardMasterData.find(c => c.id === a.cardDefinitionId)?.cost ?? 0;
		const costB = cardMasterData.find(c => c.id === b.cardDefinitionId)?.cost ?? 0;
		if (costA !== costB) return costB - costA;
		return b.spawnedTurn - a.spawnedTurn;
	});

	// 3. 優先度の高い順に、成長と拡散（侵略）処理を行う
	sortedAliens.forEach(alien => {
		if (!state.activeAlienInstances[alien.instanceId]) return; // 処理中に除去された場合はスキップ
		const cardDef = cardMasterData.find(c => c.id === alien.cardDefinitionId);
		if (!cardDef || cardDef.cardType !== "alien") return;

		// 3a. 成長ロジックを適用
		applyGrowthLogic(alien, cardDef);

		// 3b. 成長後の能力を反映した一時的なカード定義を作成
		// 成長によって形状が変化する可能性があるため、型安全にtargetingオブジェクトを再構築する
		let currentTargeting: AlienCard['targeting'];
		const newPower = alien.currentInvasionPower;
		const newShape = alien.currentInvasionShape;

		if (newShape === 'straight') {
			// 形状が'straight'の場合、'direction'プロパティが必須となる
			let direction: DirectionType = 'vertical'; // デフォルト値
			if (cardDef.targeting.shape === 'straight') {
				// 元のカードも'straight'なら、そのdirectionを引き継ぐ
				direction = cardDef.targeting.direction;
			} else {
				// 元の形状が'straight'でない場合、どのdirectionにするかルールが未定義。
				// 開発者に通知し、暫定的なデフォルト値を使用する。
				console.error(
					`[GameLogic] Alien card '${cardDef.name}' (ID: ${cardDef.id}) grew into a 'straight' shape, ` +
					`but no direction was specified. Defaulting to '${direction}'.`
				);
			}
			currentTargeting = { shape: 'straight', power: newPower, direction };
		} else {
			// 'cross', 'range', 'single' の場合
			currentTargeting = { shape: newShape, power: newPower };
		}

		const currentCardState: AlienCard = {
			...cardDef,
			targeting: currentTargeting,
		};

		// 3c. 拡散（侵略）処理
		const invasionTargets = getEffectRange(currentCardState, state.gameField.cells[alien.currentY][alien.currentX], state.gameField, 1);
		invasionTargets.forEach(target => {
			const cell = state.gameField.cells[target.y][target.x];
			if (cell.cellType === "alien_core") return; // 他のコアは上書きしない

			const existingDominantAlien = cell.cellType === "alien_invasion_area" ? state.activeAlienInstances[cell.dominantAlienInstanceId] : null;
			const shouldOverwrite = !existingDominantAlien || checkInvasionPriority(alien, existingDominantAlien);

			if (shouldOverwrite) {
				state.gameField.cells[target.y][target.x] = createAlienInvasionAreaCell(target.x, target.y, alien.instanceId);
			}
		});
	});

	// 4. 拡散処理の結果、支配マスが0になった外来種を除去
	const dominantCounts = countDominantCells(state.gameField);
	Object.keys(state.activeAlienInstances).forEach(instanceId => {
		if (!dominantCounts[instanceId]) {
			const alienToRemove = state.activeAlienInstances[instanceId];
			if (alienToRemove) {
				const { currentX, currentY } = alienToRemove;
				const coreCell = state.gameField.cells[currentY][currentX];
				if (coreCell.cellType === "alien_core" && coreCell.alienInstanceId === instanceId) {
					state.gameField.cells[currentY][currentX] = createEmptyAreaCell(currentX, currentY);
				}
				delete state.activeAlienInstances[instanceId];
			}
		}
	});
};

/** 在来種サイドの活性フェーズ（ターン終了時処理）を実行する */
const runNativeActivationPhase = (state: GameState) => {
	const cellsToUpdate: { x: number, y: number, newCell: CellState }[] = [];

	// 1. 再生待機マス（黄色）を在来種マス（緑）に
	state.gameField.cells.flat().forEach(cell => {
		if (cell.cellType === "recovery_pending_area") {
			cellsToUpdate.push({ x: cell.x, y: cell.y, newCell: createNativeAreaCell(cell.x, cell.y) });
		}
	});
	cellsToUpdate.forEach(update => {
		state.gameField.cells[update.y][update.x] = update.newCell;
	});

	cellsToUpdate.length = 0; // 配列をクリア

	// 2. 空マス（灰色）を再生待機マス（黄色）に
	state.gameField.cells.flat().forEach(cell => {
		if (cell.cellType === "empty_area") {
			cellsToUpdate.push({ x: cell.x, y: cell.y, newCell: createRecoveryPendingAreaCell(cell.x, cell.y, state.currentTurn) });
		}
	});
	cellsToUpdate.forEach(update => {
		state.gameField.cells[update.y][update.x] = update.newCell;
	});
};

/** 2つの外来種の侵略優先度を比較する */
const checkInvasionPriority = (newAlien: ActiveAlienInstance, existingAlien: ActiveAlienInstance): boolean => {
	const costA = cardMasterData.find(c => c.id === newAlien.cardDefinitionId)?.cost ?? 0;
	const costB = cardMasterData.find(c => c.id === existingAlien.cardDefinitionId)?.cost ?? 0;
	if (costA !== costB) return costA > costB;
	return newAlien.spawnedTurn > existingAlien.spawnedTurn;
};

/** 各外来種の支配マス数を数える */
const countDominantCells = (field: FieldState): { [key: string]: number } => {
	const counts: { [key: string]: number } = {};
	field.cells.flat().forEach(cell => {
		if (cell.cellType === "alien_invasion_area") {
			counts[cell.dominantAlienInstanceId] = (counts[cell.dominantAlienInstanceId] || 0) + 1;
		}
		if (cell.cellType === "alien_core") {
			counts[cell.alienInstanceId] = (counts[cell.alienInstanceId] || 0) + 1;
		}
	});
	return counts;
};