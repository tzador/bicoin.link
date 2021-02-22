FROM node:14

WORKDIR /nodejsapp

RUN npm i -g nodemon

COPY ./node.js/package.json ./
COPY ./node.js/package-lock.json ./

RUN npm install

COPY ./vanilla.js /vanilla.js
# COPY ./node.js/.env ./
COPY ./node.js/store.js ./
COPY ./node.js/binance.js ./
COPY ./node.js/main.js ./

EXPOSE 8080

ENTRYPOINT [ "npm", "start" ]
