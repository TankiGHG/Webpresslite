#!/bin/sh
# Applies pending migrations, then hands over to the server.
#
# Failing here is deliberate: a container that could not migrate must not start
# serving against a schema it does not match.
set -e

echo "[entrypoint] applying migrations"
node /app/dist/migrate.mjs

echo "[entrypoint] starting $*"
exec "$@"
