FROM node:14-stretch AS build
WORKDIR /build
COPY package-lock.json package.json ./
RUN npm ci
COPY . .


FROM node:14-alpine AS deploy
USER node
WORKDIR /home/node/src
COPY --from=build --chown=node:node /build .
CMD ["node", "index.js"]