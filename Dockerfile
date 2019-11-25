FROM node:11
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY src src
COPY index.js index.js
CMD ["node", "index.js"]
