# Node公式イメージ
FROM node:20-alpine

# 作業ディレクトリの指定
WORKDIR /app

# package.jsonをコピー
COPY ./package.json ./

# Yarn は `/node_modules/.bin` を認識してくれないので PATH に追加
# See: https://github.com/yarnpkg/yarn/issues/1684
ENV PATH=/node_modules/.bin:$PATH

# 依存関係をインストール
# ※イメージにすでにyarnは入ってる
RUN yarn install --modules-folder=/node_modules

# Viteのデフォルトポートは5173だが、必要に応じて変更可能
EXPOSE 4000