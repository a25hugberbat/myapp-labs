// Carreguem les variables del fitxer .env (que NO es puja a GitHub).
// Així les contrasenyes no queden escrites al codi.
require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Al servidor ens connectem pel socket de MySQL; en local no cal.
if (process.env.DB_SOCKET) {
    config.socketPath = process.env.DB_SOCKET;
}

module.exports = config;
