/** @type {import('fastify').FastifyPluginAsync<{}>} */
async function mongoWatchers(server) {
  server.decorate('mongoWatchers', {
    submissions: server.mongo.db
      .collection('submissions')
      .watch(undefined, { fullDocument: 'updateLookup' }),
    globals: server.mongo.db
      .collection('globals')
      .watch(undefined, { fullDocument: 'updateLookup' }),
  })
}

/** fastify plugin to watch MongoDB for changes */
module.exports = require('fastify-plugin').default(mongoWatchers)
