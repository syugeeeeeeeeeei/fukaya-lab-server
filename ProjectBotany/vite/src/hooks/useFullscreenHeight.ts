// src/hooks/useFullscreenHeight.ts

import { useEffect } from 'react';

/**
 * 画面の実際の表示領域の高さ(--app-height)を計算し、
 * CSSカスタムプロパティとしてルート要素に設定するカスタムフック。
 * モバイルブラウザの100vh問題を解決するために使用する。
 */
export const useFullscreenHeight = () => {
	useEffect(() => {
		const setAppHeight = () => {
			// document.documentElement は <html> タグを指す
			const doc = document.documentElement;
			// window.innerHeight はブラウザのUIを除いた実際の表示領域の高さ
			doc.style.setProperty('--app-height', `${window.innerHeight}px`);
		};

		// ウィンドウのリサイズ時にも高さを再計算する
		window.addEventListener('resize', setAppHeight);
		// マウント時に一度実行する
		setAppHeight();

		// クリーンアップ関数
		return () => {
			window.removeEventListener('resize', setAppHeight);
		};
	}, []);
};