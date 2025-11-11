# OruCa - FeliCa在室管理システム

OruCaは、FeliCaカードを利用して研究室のメンバーの在室状況をリアルタイムに管理・表示するウェブアプリケーションです。

## 📝 事前準備

アプリケーションをセットアップする前に、お使いの環境に以下のツールがインストールされていることを確認してください。

* **Git:** リポジトリのクローンに必要です。
* **make:** セットアップコマンドの実行に必要です。
* **Docker と Docker Compose:**
    * **Linuxをお使いの場合:** Docker EngineとDocker Composeが利用可能であること。
    * **Windows (WSL)をお使いの場合:** WindowsにDocker Desktopがインストールされ、WSL 2連携が有効になっていること。
* **FeliCaカードリーダー と関連セットアップ (WSLユーザー向け):**
    * FeliCaカードリーダーがPCに接続されていること。
    * Windows側で `usbipd-win` がインストールされ、設定済みであること。(詳細は `usbipd-win` の[公式ドキュメント](https://github.com/dorssel/usbipd-win)を参照してください。)

ご利用のOSやディストリビューションに応じたインストール方法は、各ツールの公式サイト等でご確認ください。

## 🚀 セットアップと起動

1.  **リポジトリのクローン:**
    ```bash
    git clone [https://github.com/your-username/OruCa.git](https://github.com/your-username/OruCa.git)
    cd OruCa
    ```

2.  **環境変数の設定:**
    `dev.env` ファイルをコピーして `.env` ファイルを作成し、必要な情報を編集します。
    ```bash
    cp dev.env .env
    # nano .env や vim .env 等で編集してください
    ```
    最低限、MySQLのパスワード (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`) を設定してください。

3.  **USBデバイスの接続 (WSLユーザー向け):**
    NFCカードリーダーをWSLに接続します。
    ```bash
    make attach-usb
    ```
    このコマンドは内部で `usb-wsl-attach.ps1` を実行します。

4.  **アプリケーションの初期化と起動:**

    * **開発環境のセットアップ (初回や開発時):**
        `vite`コンテナ（開発サーバー）と関連サービス（API、データベース等）を起動します。
        ```bash
        make init-dev
        ```
        完了後、フロントエンド開発サーバーは `http://localhost:4000` (または `ACCESSIBLE_HOST` で指定したホストのポート4000) でアクセス可能になります。

    * **本番環境へのデプロイ (開発終了後や本番運用時):**
        フロントエンドアプリケーションをビルドし、`web`コンテナ（本番用Webサーバー）を含む全ての関連サービスを起動します。
        ```bash
        make init-prod
        ```

        このコマンドは、デフォルトでは外部にポートを公開しません（リバースプロキシ経由などを想定）。<br>
		特定のポートで公開したい場合は、`port`引数を指定してください。
        
		```bash
        make init-prod port=8080
        ```
        完了後、`http://<ACCESSIBLE_HOSTで指定したホスト>:<指定したポート>` (例: `http://localhost:8080`) でアクセスできます。`port`引数を指定しない場合、アクセス方法はMakefileの出力やリバースプロキシの設定に依存します。

    その他の `make` コマンドについては、[Makefileコマンド一覧](#makefileコマンド一覧)を参照してください。

## ✨ 主な特徴

* FeliCaカードによる簡単な入退室記録
* リアルタイムな在室状況のウェブ表示
* Slackへの入退室通知 (設定時)
* 管理者向けユーザー情報編集機能

## 🛠️ 技術スタック

* **フロントエンド:** Vite, React, TypeScript, Chakra UI
* **バックエンド:** Node.js, Express, TypeScript, WebSocket
* **データベース:** MySQL
* **NFC連携:** Python
* **インフラ:** Docker, Docker Compose

## 使い方

* **在室状況確認:**
    * 開発環境 (`make init-dev`): `http://localhost:4000`
    * 本番環境 (`make init-prod port=<ポート番号>`): `http://<ホスト名>:<ポート番号>`
* **入退室:** FeliCaカードリーダーにカードをタッチします。
* **管理者ページ:** 上記URLの末尾に `/admin` を追記してアクセス。認証情報は `mysql/data/init.sql` 内の `admin_pass` (`fukaya_lab`) と事前にNFCで登録したIDを使用します。

## 📖 Makefileコマンド一覧

`make <ターゲット> [引数]` の形式でコマンドを実行します。

| ターゲット          | 説明                                                                                                | 引数 (例)                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `help`              | ヘルプメッセージを表示します。                                                                        |                                                                          |
| `init-dev`          | 開発用環境を初期化し、viteコンテナ（開発サーバー）と関連サービスを起動します。                          | `ACCESSIBLE_HOST=your.ip.address`                                        |
| `init-prod`         | フロントエンドをビルドし、本番環境サービス（web, api等）を起動します。 `port`引数でポート指定可能。 | `ACCESSIBLE_HOST=your.ip.address` <br> `port=8080`                       |
| `up`                | 指定されたプロファイルとサービスのコンテナをフォアグラウンドでビルド・起動します。                      | `p="dev"` <br> `p="prod" t="api"`                                        |
| `up-d`              | 指定されたプロファイルとサービスのコンテナをデタッチモードでビルド・起動します。                        | `p="dev"` <br> `p="prod"`                                                |
| `build`             | 特定のサービスをビルドし、デタッチモードで起動します。                                                  | `t=api`                                                                  |
| `save-backup`       | MySQLデータベースのバックアップを `mysql/backups/YYYYMMDD-HHMMSS/` に保存します。                       |                                                                          |
| `restore-backup`    | 指定されたバックアップ(`backup_id`で指定)からMySQLデータベースをリストアします。                                 | `backup_id=YYYYMMDD-HHMMSS`                                            |
| `cache-clear`       | Dockerビルダーのキャッシュを削除します。                                                              |                                                                          |
| `attach-usb`        | (WSLユーザー向け) USB FeliCaリーダーをWSLにアタッチします。                                           |                                                                          |

**引数の説明:**
* `p="<プロファイル名>"`: Docker Composeのプロファイルを指定します (例: `dev`, `prod`)。複数指定も可能です (例: `p="dev prod"` )。
* `t=<サービス名>`: Docker Composeの特定のサービス名を指定します (例: `vite`, `api`, `web`)。
* `ACCESSIBLE_HOST=<IPまたはホスト名>`: `init-dev` や `init-prod` 実行時に表示されるアクセスURLのホスト部分を指定します。
* `port=<ポート番号>`: `init-prod` 実行時に `web` サービスを外部公開する際のポート番号を指定します。指定しない場合は公開されません。
* `backup_id=<ID(タイムスタンプ)>`: `restore-backup` 実行時にリストアするバックアップのディレクトリ名を指定します (例: `YYYYMMDD-HHMMSS`)。
