import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { DebugDialog, type DebugSettings } from './components/DebugDialog';
import GameBoard3D from './components/GameBoard3D';
import GameInfo from './components/GameInfo';
import Hand3D from './components/Hand3D';
import SceneController from './components/SceneController';
import UIOverlay from './components/UIOverlay';
import cardMasterData from './data/cardMasterData';
import { useUIStore } from './store/UIStore';
import type { CardDefinition, PlayerType } from './types/data';

// --- 定数定義 ---

const GLOBAL_STYLES = {
  BACKGROUND_COLOR: '#50342b',
};
const LAYOUT = {
  SIDE_PANEL_WIDTH: '120px',
  SIDE_PANEL_GAP: '20px',
  SIDE_PANEL_OFFSET: '5px',
};
const CAMERA_SETTINGS = {
  POSITION: [0, 15, 14] as [number, number, number],
  FOV: 70,
};
const LIGHT_SETTINGS = {
  AMBIENT_INTENSITY: 0.8,
  DIRECTIONAL_POSITION: [10, 10, 5] as [number, number, number],
  DIRECTIONAL_INTENSITY: 1,
};
const TIMERS = {
  TURN_BANNER_DELAY: 1000,
  TURN_BANNER_DURATION: 2000,
  NOTIFICATION_DURATION: 3000,
};
const HAND_PAGING = {
  CARDS_PER_PAGE: 3,
};


// --- スタイル定義 ---

const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: ${GLOBAL_STYLES.BACKGROUND_COLOR};
    overscroll-behavior: none;
  }
  #root { width: 100%; height: 100%; }
  body { user-select: none; -webkit-user-select: none; }
`;

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  pointer-events: none;
  overscroll-behavior: none;
`;

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
`;

const SidePanel = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: ${LAYOUT.SIDE_PANEL_WIDTH};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${LAYOUT.SIDE_PANEL_GAP};
  color: white;
  pointer-events: auto;
  z-index: 10;
  font-family: sans-serif;

  &.left {
    left: ${LAYOUT.SIDE_PANEL_OFFSET};
    & > .content {
      display: flex; flex-direction: column;
      align-items: center; gap: 10px;
      transform: rotate(180deg);
    }
  }
  &.right {
    right: ${LAYOUT.SIDE_PANEL_OFFSET};
    & > .content {
      display: flex; flex-direction: column;
      align-items: center; gap: 10px;
    }
  }
`;

const DebugContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

const ScreenLockOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  background-color: transparent;
`;

const BaseActionButton = styled.button`
  flex-grow: 1;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 10px;
  font-size: 1.2em;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease-in-out;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
  width: 100%;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    background: #757575;
    color: #bdbdbd;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
    opacity: 0.7;
  }
`;

const TurnEndButton = styled(BaseActionButton)`
  background: linear-gradient(145deg, #81c784, #4caf50);
`;

const ActionButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
`;
const SummonButton = styled(BaseActionButton)`
  background: linear-gradient(145deg, #ffc107, #ff8f00);
  font-size: 1em;
`;
const CancelButton = styled(BaseActionButton)`
  background: linear-gradient(145deg, #9e9e9e, #616161);
  font-size: 1em;
`;


/**
 * アプリケーションのメインコンポーネント。
 */
function App() {
  const store = useUIStore();
  const {
    activePlayerId, selectedCardId, selectedAlienInstanceId, notification, setNotification,
    resetGame, isCardPreview, playSelectedCard, deselectCard
  } = store;

  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showTurnBanner, setShowTurnBanner] = useState(false);
  const [isStartingTurn, setIsStartingTurn] = useState(false);

  // ★★★ ここから修正 ★★★
  // ユーザーの手動操作（スワイプ、デバッグUI）による表示希望状態のみを管理する
  const [isAlienHandManuallyVisible, setAlienHandManuallyVisible] = useState(true);
  const [isNativeHandManuallyVisible, setNativeHandManuallyVisible] = useState(true);
  // ★★★ ここまで修正 ★★★

  const [alienHandPage, setAlienHandPage] = useState(0);
  const [nativeHandPage, setNativeHandPage] = useState(0);
  const [debugSettings, setDebugSettings] = useState<DebugSettings>({
    isGestureAreaVisible: false,
    flickDistanceRatio: 0.25,
    flickVelocityThreshold: 0.2,
    swipeAreaHeight: 4,
  });

  // ★★★ 修正: 状態復元用のuseRefと、カード選択状態を監視するuseEffectは不要になったため削除 ★★★

  useEffect(() => {
    if (!isGameStarted || store.isGameOver) return;
    setIsStartingTurn(true);
    const timer = setTimeout(() => {
      setShowTurnBanner(true);
      setIsStartingTurn(false);
    }, TIMERS.TURN_BANNER_DELAY);
    return () => clearTimeout(timer);
  }, [store.activePlayerId, store.currentTurn, isGameStarted, store.isGameOver]);

  useEffect(() => {
    if (showTurnBanner) {
      const timer = setTimeout(() => { setShowTurnBanner(false); }, TIMERS.TURN_BANNER_DURATION);
      return () => clearTimeout(timer);
    }
  }, [showTurnBanner]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), TIMERS.NOTIFICATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);


  const { alienCards, nativeCards } = useMemo(() => {
    const duplicateCards = (cards: CardDefinition[]) => {
      return cards.flatMap(card => Array.from({ length: card.deckCount }).map((_, i) => ({ ...card, instanceId: `${card.id}-instance-${i}` })));
    };
    const allAlienCards = cardMasterData.filter(c => c.cardType === 'alien');
    const duplicatedAlienCards = duplicateCards(allAlienCards);
    duplicatedAlienCards.sort((a, b) => a.cost - b.cost);
    const eradicationCards = cardMasterData.filter(c => c.cardType === 'eradication');
    const recoveryCards = cardMasterData.filter(c => c.cardType === 'recovery');
    const duplicatedEradication = duplicateCards(eradicationCards);
    const duplicatedRecovery = duplicateCards(recoveryCards);
    duplicatedEradication.sort((a, b) => a.cost - b.cost);
    duplicatedRecovery.sort((a, b) => a.cost - b.cost);
    const combinedNativeCards = [...duplicatedEradication, ...duplicatedRecovery];
    return { alienCards: duplicatedAlienCards, nativeCards: combinedNativeCards };
  }, []);


  const getOverlayProps = (thisPlayerId: PlayerType) => {
    const { isGameOver, winningPlayerId, activePlayerId, currentTurn, playerStates } = store;
    const isMyTurn = activePlayerId === thisPlayerId;

    if (!isGameStarted) {
      return { show: true, message: 'Project Botany', buttonText: 'Start Game', onButtonClick: () => setIsGameStarted(true) };
    }
    if (isGameOver) {
      let resultText = '';
      if (winningPlayerId === thisPlayerId) resultText = 'あなたの勝利！';
      else if (winningPlayerId === null) resultText = '引き分け';
      else resultText = 'あなたの敗北';
      return { show: true, message: 'Game Over', subMessage: resultText, buttonText: 'Play Again', onButtonClick: () => { resetGame(); setIsGameStarted(true); } };
    }
    if (showTurnBanner) {
      const role = isMyTurn ? '(あなた)' : '(あいて)';
      const message = `Turn ${currentTurn}/${store.maximumTurns}\n${playerStates[activePlayerId].playerName} ${role} のターン`;
      return { show: true, message };
    }
    if (notification && notification.forPlayer === thisPlayerId) {
      return { show: true, message: notification.message, isDismissible: true };
    }
    return { show: false, message: '' };
  };

  const createPageHandlers = (
    _page: number,
    setPage: React.Dispatch<React.SetStateAction<number>>,
    cardsLength: number
  ) => {
    const maxPage = Math.ceil(cardsLength / HAND_PAGING.CARDS_PER_PAGE) - 1;
    return {
      handleNext: () => setPage(p => Math.min(p + 1, maxPage)),
      handlePrev: () => setPage(p => Math.max(p - 1, 0)),
      maxPage
    };
  };

  const alienOverlayProps = getOverlayProps('alien');
  const nativeOverlayProps = getOverlayProps('native');
  const alienPageHandlers = createPageHandlers(alienHandPage, setAlienHandPage, alienCards.length);
  const nativePageHandlers = createPageHandlers(nativeHandPage, setNativeHandPage, nativeCards.length);

  // ★★★ ここから修正 ★★★
  // カード選択中かどうかを判定するフラグ
  const isSelecting = !!(selectedCardId || selectedAlienInstanceId);

  // 実際に手札を表示するかどうかを、複数のルールから派生（算出）させる
  // 表示条件: 1.手動で表示ON  2.自分のターンである  3.カード選択中でない
  const isAlienHandActuallyVisible = isAlienHandManuallyVisible && activePlayerId === 'alien' && !isSelecting;
  const isNativeHandActuallyVisible = isNativeHandManuallyVisible && activePlayerId === 'native' && !isSelecting;
  // ★★★ ここまで修正 ★★★

  const debugDialogProps = {
    debugSettings,
    onSetDebugSettings: setDebugSettings,
    players: [
      { name: 'Alien Side', currentPage: alienHandPage, maxPage: alienPageHandlers.maxPage, onNext: alienPageHandlers.handleNext, onPrev: alienPageHandlers.handlePrev },
      { name: 'Native Side', currentPage: nativeHandPage, maxPage: nativePageHandlers.maxPage, onNext: nativePageHandlers.handleNext, onPrev: nativePageHandlers.handlePrev },
    ],
    // ★★★ 修正: 派生した表示状態と、手動状態を変更する関数を渡す
    isAlienHandVisible: isAlienHandActuallyVisible,
    onToggleAlienHand: () => setAlienHandManuallyVisible(v => !v),
    isNativeHandVisible: isNativeHandActuallyVisible,
    onToggleNativeHand: () => setNativeHandManuallyVisible(v => !v),
  };

  const isHandInteractionLocked = isSelecting;

  return (
    <>
      <GlobalStyle />
      {isStartingTurn && <ScreenLockOverlay />}

      <DebugContainer>
        <DebugDialog {...debugDialogProps} cardMultiplier={0} onSetCardMultiplier={() => { }} />
      </DebugContainer>

      <MainContainer>
        <UIOverlay
          {...alienOverlayProps}
          side="bottom"
          onDismiss={alienOverlayProps.isDismissible ? () => setNotification(null) : undefined}
        />
        <UIOverlay
          {...nativeOverlayProps}
          side="top"
          onDismiss={nativeOverlayProps.isDismissible ? () => setNotification(null) : undefined}
        />

        <CanvasContainer>
          <Canvas shadows camera={{ position: CAMERA_SETTINGS.POSITION, fov: CAMERA_SETTINGS.FOV }}>
            <color attach="background" args={[GLOBAL_STYLES.BACKGROUND_COLOR]} />
            <ambientLight intensity={LIGHT_SETTINGS.AMBIENT_INTENSITY} />
            <directionalLight
              position={LIGHT_SETTINGS.DIRECTIONAL_POSITION}
              intensity={LIGHT_SETTINGS.DIRECTIONAL_INTENSITY}
            />
            <GameBoard3D fieldState={store.gameField} />

            {/* ★★★ 修正: 派生した表示状態と、手動状態を変更する関数を渡す */}
            <Hand3D
              key='alien-hand'
              player="alien"
              cards={alienCards}
              isVisible={isAlienHandActuallyVisible}
              onVisibilityChange={setAlienHandManuallyVisible}
              currentPage={alienHandPage}
              onPageChange={setAlienHandPage}
              debugSettings={debugSettings}
              isInteractionLocked={isHandInteractionLocked}
            />
            <Hand3D
              key='native-hand'
              player="native"
              cards={nativeCards}
              isVisible={isNativeHandActuallyVisible}
              onVisibilityChange={setNativeHandManuallyVisible}
              currentPage={nativeHandPage}
              onPageChange={setNativeHandPage}
              debugSettings={debugSettings}
              isInteractionLocked={isHandInteractionLocked}
            />
            <OrbitControls makeDefault enableZoom={false} enableRotate={false} enablePan={false} />
            <SceneController />
          </Canvas>
        </CanvasContainer>

        <SidePanel className="right">
          <div className="content">
            <GameInfo player="alien" />
            {isCardPreview && store.activePlayerId === 'alien' ? (
              <ActionButtonContainer>
                <SummonButton onClick={playSelectedCard}>召喚</SummonButton>
                <CancelButton onClick={deselectCard}>取消</CancelButton>
              </ActionButtonContainer>
            ) : (
              <TurnEndButton onClick={store.progressTurn} disabled={store.isGameOver || store.activePlayerId !== 'alien'}>
                ターン終了
              </TurnEndButton>
            )}
          </div>
        </SidePanel>
        <SidePanel className="left">
          <div className="content">
            <GameInfo player="native" />
            {isCardPreview && store.activePlayerId === 'native' ? (
              <ActionButtonContainer>
                <SummonButton onClick={playSelectedCard}>召喚</SummonButton>
                <CancelButton onClick={deselectCard}>取消</CancelButton>
              </ActionButtonContainer>
            ) : (
              <TurnEndButton onClick={store.progressTurn} disabled={store.isGameOver || store.activePlayerId !== 'native'}>
                ターン終了
              </TurnEndButton>
            )}
          </div>
        </SidePanel>
      </MainContainer>
    </>
  );
}

export default App;