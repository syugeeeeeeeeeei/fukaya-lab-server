import React from 'react';
import styled from 'styled-components';
import { useUIStore } from '../store/UIStore';
import type { PlayerType } from '../types/data';

// --- 定数定義 ---

/** スタイル設定 */
const STYLES = {
  BACKGROUND_COLOR: 'rgba(0, 0, 0, 0.7)',
  TEXT_COLOR: 'white',
  SUB_TEXT_COLOR: '#aaa',
  PADDING: '10px 5px',
  BORDER_RADIUS: '8px',
  GAP: '10px',
  FONT_SIZE: '1.3em',
  SUB_FONT_SIZE: '0.8em',
};

// --- Styled Components ---

const InfoContainer = styled.div`
  background-color: ${STYLES.BACKGROUND_COLOR};
  color: ${STYLES.TEXT_COLOR};
  padding: ${STYLES.PADDING};
  border-radius: ${STYLES.BORDER_RADIUS};
  display: flex;
  flex-direction: column;
  gap: ${STYLES.GAP};
  align-items: center;
  width: 100%;
`;

const InfoItem = styled.div`
  text-align: center;
  font-size: ${STYLES.FONT_SIZE};
  
  /* ラベル部分のスタイル */
  & > div:first-child {
    font-size: ${STYLES.SUB_FONT_SIZE};
    color: ${STYLES.SUB_TEXT_COLOR};
  }
`;


// --- Component ---

interface GameInfoProps {
  player: PlayerType; // PlayerId を PlayerType に修正
}

/**
 * プレイヤー名と現在のリソース（エンバイロメント）を表示するUIコンポーネント。
 * @param player 表示対象のプレイヤーID
 */
const GameInfo: React.FC<GameInfoProps> = ({ player }) => {
  const { playerStates } = useUIStore();
  const playerData = playerStates[player];

  // playerDataが存在しない場合は何も表示しない
  if (!playerData) {
    return null;
  }

  return (
    <InfoContainer>
      <InfoItem>
        <div>Player</div>
        <div>{playerData.playerName}</div>
      </InfoItem>
      <InfoItem>
        <div>Environment</div>
        <div>{`${playerData.currentEnvironment} / ${playerData.maxEnvironment}`}</div>
      </InfoItem>
    </InfoContainer>
  );
};

export default GameInfo;