// Carrega variables des d'un fitxer .env (si existeix) sense dependències extra.
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    for (const linia of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = linia.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m || linia.trim().startsWith('#')) continue;
        let valor = m[2];
        // Treu les cometes de l'inici/final si n'hi ha
        if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
    }
}

module.exports = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'a25hugberbat_root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'a25hugberbat_tr0'
};
