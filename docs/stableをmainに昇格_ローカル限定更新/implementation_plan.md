# 実装計画

## 目的

`main` の参照先を `stable` と同一にし、`stable` を実質的な `main` として扱える状態にする。

## 方針

1. 実行前に作業ツリーがクリーンであることを確認する。
2. 旧 `main` をバックアップブランチとして保存する。
3. `git branch -f main stable` で `main` を `stable` に強制一致する。
4. 参照先一致・履歴整合性・作業ツリー状態を確認する。
5. 必要時のロールバックコマンドを残す。

## 実行コマンド

```bash
git status --porcelain
git branch backup/main-before-stable-20260329 main
git branch -f main stable
git rev-parse main stable
git show -s --oneline main
git branch -vv
git log --oneline --decorate --max-count=5 main
git log --oneline --decorate --max-count=5 backup/main-before-stable-20260329
git status -sb
```

## ロールバック

```bash
git branch -f main backup/main-before-stable-20260329
```
