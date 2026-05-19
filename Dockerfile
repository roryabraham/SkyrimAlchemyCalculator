# syntax=docker/dockerfile:1
FROM oven/bun:1.3.14-debian

WORKDIR /app

COPY package.json bun.lock ./
COPY web/package.json ./web/
COPY server/package.json ./server/

COPY data ./data
COPY libs ./libs
COPY scripts ./scripts
COPY server ./server
COPY web ./web
COPY tsconfig.base.json ./

ENV HUSKY=0
RUN bun install --frozen-lockfile

RUN bun run build

ENV NODE_ENV=production
ENV STATIC_ROOT=/app/web/dist
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "--cwd", "server", "start"]
