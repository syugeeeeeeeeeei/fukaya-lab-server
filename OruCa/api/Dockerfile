# ベースイメージとしてNode.jsを使用
FROM node:20-alpine

# gitをインストール
RUN apk update && apk add --no-cache git

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonをコピー
COPY ./package.json .

# Yarn は `/node_modules/.bin` を認識してくれないので PATH に追加
# See: https://github.com/yarnpkg/yarn/issues/1684
ENV PATH=/node_modules/.bin:$PATH

# 依存関係をインストール
# ※イメージにすでにyarnは入ってる
RUN yarn install --modules-folder=/node_modules

# 使用するポートを指定
EXPOSE 3000