// Si arrenquem amb Docker, les dades de connexió arriben per variables
// d'entorn (docker-compose.yml). Si no, fem servir les del servidor de l'institut.
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'a25hugberbat_root',
    password: process.env.DB_PASSWORD || 'b9McS_R}#;QFlee-',
    database: process.env.DB_NAME || 'a25hugberbat_tr0'
};

// Al servidor de l'institut ens connectem pel socket de MySQL;
// dins de Docker, en canvi, per xarxa (host "db").
if (!process.env.DB_HOST) {
    config.socketPath = '/run/mysqld/mysqld.sock';
}

module.exports = config;
