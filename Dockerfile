ARG environment

FROM ubuntu:22.04 AS base

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y curl git jq

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs
RUN npm install -g npm

FROM base AS version-for-dev

FROM base AS version-for-prod
RUN mkdir -p /app
COPY ./package.json /app
COPY ./package-lock.json /app
COPY ./server /app/server
COPY ./src /app/src
RUN cd /app && npm install

FROM version-for-${environment} AS final

WORKDIR /app

CMD [ "/usr/bin/npm", "start" ]