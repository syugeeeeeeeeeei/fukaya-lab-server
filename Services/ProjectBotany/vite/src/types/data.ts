/** プレイヤーの種類を定義する */
export type PlayerType = "native" | "alien";

/** マスの状態（種類）を定義する */
export type CellType =
  | "native_area"
  | "alien_core"
  | "alien_invasion_area"
  | "empty_area"
  | "recovery_pending_area";
/** カードの効果範囲の形状を定義する */
export type ShapeType = "single" | "cross" | "straight" | "range";
/** カード効果の方向を定義する */
export type DirectionType =
  | "up"
  | "down"
  | "left"
  | "right"
  | "vertical"
  | "horizon";

// --- 成長関連の型定義 ---

/**
 * 外来種が成長した際の具体的な効果を定義する
 */
export interface GrowthEffect {
  /** 成長後の新しい侵略力 */
  newInvasionPower?: number;
  /** 成長後の新しい侵略形状 */
  newInvasionShape?: ShapeType;
}

/**
 * 外来種が成長するための条件を定義する
 */
export interface GrowthCondition {
  /** 成長条件の種類（現在は最終アクションからのターン経過のみ） */
  type: "turns_since_last_action";
  /** 条件を満たすために必要な値（例: 2ターン） */
  value: number;
}

// --- カード定義 ---

/**
 * 全てのカードが共通して持つ基本プロパティを定義する
 */
interface CardDefinitionBase {
  /** カードをユニークに識別するためのID */
  id: string;
  /** カードの表示名 */
  name: string;
  /** カードの効果などを説明するテキスト */
  description: string;
  /** カードを使用するためのコスト */
  cost: number;
  /** 将来のデッキ構築用：1デッキに入れられる最大枚数 */
  deckCount: number;
  /** カード画像のファイルパス */
  imagePath: string;
  /** 1ゲーム中に使用できる最大回数 (nullの場合は無制限) */
  usageLimit?: number | null;
  /** 使用後に再度使用可能になるまでのターン数 (nullの場合はクールタイムなし) */
  cooldownTurns?: number | null;
}

/** カード効果の範囲・対象を定義する、判別可能なユニオン型 */
type TargetingDefinition =
  | {
    shape: "straight";
    power: number;
    direction: DirectionType;
    target?: "alien_invasion_area" | "alien_core";
  }
  | {
    shape: "cross" | "range" | "single";
    power: number;
    target?: "alien_invasion_area" | "alien_core";
  }
  | {
    target: "species";
  };

/**
 * 外来種カードの定義
 */
export interface AlienCard extends CardDefinitionBase {
  /** カードの種類識別子 */
  cardType: "alien";
  /** AlienCardは target: 'species' を持たない */
  targeting:
  | {
    shape: "straight";
    power: number;
    direction: DirectionType;
  }
  | {
    shape: "cross" | "range" | "single";
    power: number;
  };
  /** 成長能力を持つかどうかのフラグ */
  canGrow?: boolean;
  /** 成長条件のリスト */
  growthConditions?: GrowthCondition[];
  /** 成長効果のリスト */
  growthEffects?: GrowthEffect[];
}

/**
 * 駆除カードの定義
 */
export interface EradicationCard extends CardDefinitionBase {
  /** カードの種類識別子 */
  cardType: "eradication";
  /** 駆除カードは全ての targeting パターンを使いうる */
  targeting: TargetingDefinition;
  /** 駆除されたマスがどの状態になるか */
  postRemovalState: "empty_area" | "recovery_pending_area";
}

/**
 * 回復カードの定義
 */
export interface RecoveryCard extends CardDefinitionBase {
  /** カードの種類識別子 */
  cardType: "recovery";
  /** 回復カードは全ての targeting パターンを使いうる */
  targeting: TargetingDefinition;
  /** 回復されたマスがどの状態になるか */
  postRecoveryState: "native_area" | "recovery_pending_area";
}

/**
 * 全てのカード定義を統合したユニオン型
 */
export type CardDefinition = AlienCard | EradicationCard | RecoveryCard;

// --- インスタンスと状態の型定義 ---

/**
 * プレイヤーがライブラリに持つ、個別のカード実体（定義への参照）
 */
export interface CardInstance {
  /** カード実体をユニークに識別するID */
  instanceId: string;
  /** 対応するカード定義のID */
  cardDefinitionId: string;
}

/**
 * プレイヤー一人の状態を管理する
 */
export interface PlayerState {
  /** プレイヤーの識別子 ('native' または 'alien') */
  playerId: PlayerType;
  /** プレイヤーの表示名 */
  playerName: string;
  /** プレイヤーの向き。対面プレイ時の方向計算に用いる（奥側プレイヤーは-1） */
  facingFactor: 1 | -1;
  /** ゲーム開始時の初期エンバイロメント量（ハンデ調整用） */
  initialEnvironment: number;
  /** 現在のエンバイロメント量 */
  currentEnvironment: number;
  /** 現在のエンバイロメントの最大値 */
  maxEnvironment: number;
  /** プレイヤーが使用可能なカードのライブラリ */
  cardLibrary: CardInstance[];
  /** 現在クールタイム中のカードとその残りターン数 */
  cooldownActiveCards: { cardId: string; turnsRemaining: number }[];
  /** 使用回数制限のあるカードの使用済み回数 */
  limitedCardsUsedCount: { [cardId: string]: number };
}

/**
 * フィールドに実際に配置（召喚）されている、活動中の外来種の状態
 */
export interface ActiveAlienInstance {
  /** 配置された外来種をユニークに識別するID */
  instanceId: string;
  /** 配置されたターン数 */
  spawnedTurn: number;
  /** 対応するカード定義のID */
  cardDefinitionId: string;
  /** 現在のX座標 */
  currentX: number;
  /** 現在のY座標 */
  currentY: number;
  /** 現在の侵略力 */
  currentInvasionPower: number;
  /** 現在の侵略形状 */
  currentInvasionShape: ShapeType;
  /** 現在の成長段階 */
  currentGrowthStage: number;
  /** 最後の移動やアクションからの経過ターン数 */
  turnsSinceLastAction: number;
}

/** マスの基本情報 */
interface CellStateBase {
  /** マスのX座標 */
  x: number;
  /** マスのY座標 */
  y: number;
}
/** 在来種マス */
export interface NativeAreaCell extends CellStateBase {
  cellType: "native_area";
  ownerId: "native";
}
/** 空マス */
export interface EmptyAreaCell extends CellStateBase {
  cellType: "empty_area";
  ownerId: null;
}
/** 再生待機マス */
export interface RecoveryPendingAreaCell extends CellStateBase {
  cellType: "recovery_pending_area";
  ownerId: null;
  /** 再生待機状態になったターン数 */
  recoveryPendingTurn: number;
}
/** 外来種（コア）マス */
export interface AlienCoreCell extends CellStateBase {
  cellType: "alien_core";
  ownerId: "alien";
  /** このマスに存在する外来種インスタンスのID */
  alienInstanceId: string;
}
/** 侵略マス */
export interface AlienInvasionAreaCell extends CellStateBase {
  cellType: "alien_invasion_area";
  ownerId: "alien";
  /** このマスを現在支配している外来種インスタンスのID */
  dominantAlienInstanceId: string;
}
/** マスの状態を表現する全ての型を統合したユニオン型 */
export type CellState =
  | NativeAreaCell
  | EmptyAreaCell
  | RecoveryPendingAreaCell
  | AlienCoreCell
  | AlienInvasionAreaCell;

/**
 * ゲームフィールド全体の状態
 */
export interface FieldState {
  /** フィールドの幅 */
  width: number;
  /** フィールドの高さ */
  height: number;
  /** 全てのマスの状態を保持する二次元配列 */
  cells: CellState[][];
}

/**
 * ゲーム全体の最上位の状態
 */
export interface GameState {
  /** 現在のターン数 */
  currentTurn: number;
  /** ゲームの最大ターン数 */
  maximumTurns: number;
  /** 現在手番のプレイヤー */
  activePlayerId: PlayerType;
  /** ゲームフィールドの状態 */
  gameField: FieldState;
  /** 全プレイヤーの状態 */
  playerStates: {
    [key in PlayerType]: PlayerState;
  };
  /** 現在のフェーズ */
  currentPhase: "environment_phase" | "summon_phase" | "activation_phase";
  /** ゲームが終了したかどうかのフラグ */
  isGameOver: boolean;
  /** 勝利したプレイヤー (引き分けの場合はnull) */
  winningPlayerId: PlayerType | null;
  /** フィールド上の全アクティブ外来種インスタンス */
  activeAlienInstances: { [instanceId: string]: ActiveAlienInstance };
  /** 在来種サイドの最終スコア */
  nativeScore: number;
  /** 外来種サイドの最終スコア */
  alienScore: number;
}