# base image
FROM ubuntu:18.04

RUN apt-get -y update && apt-get -y upgrade && apt-get -y install bash-completion curl gcc g++ git htop make mc wget 
RUN wget https://deb.nodesource.com/setup_12.x -O nodejs_12.x.sh && bash nodejs_12.x.sh
RUN apt-get install -y nodejs

# copy application to docker container
COPY . /isochrone
WORKDIR /isochrone

RUN npm set unsafe-perm true
RUN npm run clean
RUN git submodule update --init --recursive
RUN npm install

CMD ["/bin/bash", "/isochrone/docker_start_script.sh"]
