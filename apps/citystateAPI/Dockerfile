FROM node:14.5.0-alpine3.12
ARG NODE_PORT
ARG ZIP_API_KEY
ENV NODE_PORT=${NODE_PORT}
ENV ZIP_API_KEY=${ZIP_API_KEY}

RUN mkdir -p /var/lib/api
WORKDIR /var/lib/api
ADD package.json /var/lib/api/package.json
RUN npm install
COPY src/** /var/lib/api

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node","index.js" ]


