const mysql = require('mysql2');
const config = require('./config');

const con = mysql.createPool(config);

module.exports = con;
