FROM node:14

WORKDIR /node.js

RUN npm i -g nodemon

COPY ./node.js/package.json ./
COPY ./node.js/package-lock.json ./

RUN npm i

COPY ./vanilla.js ./vanilla.js
COPY ./node.js/main.js ./

EXPOSE 8080

ENTRYPOINT [ "npm", "start" ]
