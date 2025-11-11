import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

// --- 定数定義 ---

/** カメラの初期設定 */
const INITIAL_CAMERA_CONFIG = {
	POSITION: [0, 10, 0.1] as [number, number, number], // Y=10の高さから少しだけ手前に配置
	LOOK_AT: [0, 0, 0] as [number, number, number],     // シーンの中心を注視
};

/**
 * 3Dシーンのカメラやコントロールに関する設定を行うコンポーネント。
 * このコンポーネント自体は何も描画しない。
 */
const SceneController = () => {
	const { camera } = useThree();

	/**
	 * コンポーネントのマウント時に一度だけカメラの初期位置と注視点を設定する。
	 */
	useEffect(() => {
		camera.position.set(...INITIAL_CAMERA_CONFIG.POSITION);
		camera.lookAt(...INITIAL_CAMERA_CONFIG.LOOK_AT);
	}, [camera]);

	/**
	 * カメラにアタッチされたOrbitControlsを常に有効化する。
	 * (特定の状況で無効化された場合でも、再度有効に戻すため)
	 */
	useEffect(() => {
		// camera.userData.controlsはDreiのOrbitControlsによって設定される
		const controls = (camera.userData as any).controls;
		if (controls) {
			controls.enabled = true;
		}
	}, [camera]);

	return null;
};

export default SceneController;