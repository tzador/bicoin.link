FROM node:14

WORKDIR /red.js

RUN npm i -g typescript ts-node
RUN npm i -g nodemon

COPY ./package.json ./
COPY ./package-lock.json ./

RUN npm install

COPY ./red.js ./

EXPOSE 6789

ENTRYPOINT [ "npm", "start" ]
