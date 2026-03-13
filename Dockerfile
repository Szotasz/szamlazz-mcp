FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
