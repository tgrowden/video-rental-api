# Use a Node.js base image
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

RUN pnpm build

CMD [ "pnpm", "start" ]
