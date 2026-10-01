FROM node:22-alpine

WORKDIR /app

# Primer només els package*.json: així Docker reaprofita la capa de
# "npm ci" si no canvien les dependències.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 20012

# Carrega les preguntes a la BD (només si està buida) i arrenca el servidor
CMD ["sh", "-c", "node migrate.js && node app.js 20012"]
