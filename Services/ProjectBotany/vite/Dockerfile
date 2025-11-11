# -----------------------------------------------------------
# prodステージ: 本番環境用のビルド
# devステージから依存関係をコピーし、ソースコードをコピーしてビルドする
# -----------------------------------------------------------
FROM docker.io/library/node:24-alpine

WORKDIR /app

# package.jsonと.yarnrc.ymlをコピー
COPY . .

# prodステージでもcorepackを有効化
RUN corepack enable
RUN yarn set version stable
RUN yarn install
