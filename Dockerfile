FROM ubuntu:22.04

RUN apt update && \
    apt upgrade -y && \
    apt install -y curl git

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt install -y nodejs

RUN mkdir -p /app
COPY ./package.json /app
COPY ./package-lock.json /app
COPY ./server /app/server
COPY ./src /app/src

WORKDIR /app

#RUN npm set unsafe-perm true
RUN npm install -g npm
RUN npm install

CMD [ "/usr/bin/node", "server/index.mjs", "--port=3457" ]