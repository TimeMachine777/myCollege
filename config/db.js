import pg from "pg";
import env from "dotenv";

env.config();

// console.log(process.env.DB_PORT);
// console.log('hello');
const {Pool} = pg;
const pool=new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 10,
});

function shutdown() {
    pool.end(()=> {
        console.log("Database connection pool is closed now.");
        process.exit(0);
    });
}

process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);

export default pool;