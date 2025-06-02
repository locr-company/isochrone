ARG environment

FROM node:22 AS base

ARG environment
ENV NODE_ENV=${environment}

WORKDIR /app

FROM base AS version-for-dev

FROM base AS version-for-prod
COPY src ./src
COPY server ./server
COPY package.json ./
COPY package-lock.json ./
RUN npm install --ignore-scripts

FROM version-for-${environment} AS final
COPY start_env.sh ./

CMD [ "./start_env.sh" ]