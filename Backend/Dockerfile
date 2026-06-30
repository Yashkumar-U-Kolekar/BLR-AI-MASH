FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Set dynamic port for Cloud Run
ENV PORT=8080
EXPOSE $PORT

CMD ["npm", "run", "start"]
