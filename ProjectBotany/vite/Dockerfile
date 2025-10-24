# compose/vite/Dockerfile

# -----------------------------------------------------------
# devステージ: 開発環境用のビルド
# 依存関係のインストールのみを行い、ソースコードはコピーしない
# -----------------------------------------------------------
FROM node:22-alpine AS dev

WORKDIR /app

# package.jsonと.yarnrc.ymlをコピー
# これにより、開発環境でボリュームマウントしても、
# node_modulesが上書きされないようにする
COPY package.json .yarnrc.yml ./

# corepackを有効にし、yarnの安定版をインストール
RUN corepack enable && yarn set version stable

# 依存関係をインストール
RUN yarn install

# -----------------------------------------------------------
# prodステージ: 本番環境用のビルド
# devステージから依存関係をコピーし、ソースコードをコピーしてビルドする
# -----------------------------------------------------------
FROM node:22-alpine AS prod

WORKDIR /app

# package.jsonと.yarnrc.ymlをコピー
COPY package.json .yarnrc.yml ./

# prodステージでもcorepackを有効化
RUN corepack enable && yarn set version stable

COPY . .

# 本番環境でも依存関係を再インストールする
# devDependenciesも含めてインストールするために、productionフラグを付けない
RUN yarn install
