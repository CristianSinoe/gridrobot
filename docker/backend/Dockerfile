FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm install

CMD ["npm", "run", "dev"]
