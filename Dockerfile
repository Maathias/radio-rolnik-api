FROM node:16
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
ENV NODE_ENV production
CMD ["yarn", "start"]