FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM alpine:3.20
COPY --from=build /app/dist /build-output
CMD ["cp", "-r", "/build-output/.", "/usr/share/nginx/html/"]
