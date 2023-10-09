ARG environment

FROM ubuntu:22.04 AS base

RUN apt update && \
    apt upgrade -y && \
    apt install -y ca-certificates curl git gnupg jq

RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN apt update && \
    apt install -y nodejs
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