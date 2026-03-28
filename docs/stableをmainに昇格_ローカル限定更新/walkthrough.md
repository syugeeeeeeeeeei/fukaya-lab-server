# 修正内容の確認（Walkthrough）

## 1. 事前チェック

- `git status --porcelain` が空で、作業ツリーはクリーン。
- 実行時点の参照:
  - `main`: `06d0f94`
  - `stable`: `c022aac`

## 2. バックアップ作成

- `backup/main-before-stable-20260329` を `main` から作成。
- これにより、旧 `main` の先頭 `06d0f94` を保持。

## 3. main を stable に一致

- `git branch -f main stable` を実行。
- 実行後、`main` と `stable` は同一 SHA。

## 4. 検証結果

- `git rev-parse main stable`:
  - `c022aac84ed7f7973d1f0126a6cb1e99dde31371`
  - `c022aac84ed7f7973d1f0126a6cb1e99dde31371`
- `git show -s --oneline main`:
  - `c022aac stable`
- `git branch -vv`:
  - `main` は `c022aac` を指す
  - `backup/main-before-stable-20260329` は `06d0f94` を指す
- `git status -sb`:
  - `stable...origin/stable`（未コミット差分の増加なし）

## 5. 補足

- 今回はローカル更新のみで、`origin/main` への push は未実施。
- リモート反映が必要な場合は、明示合意のうえ `--force-with-lease` を使用する。
