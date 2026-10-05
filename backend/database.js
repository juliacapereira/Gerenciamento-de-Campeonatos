import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const certificado = fs.readFileSync(
  path.join(__dirname, "certs", "ca.pem"),
  "utf8"
);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    ca: certificado,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2"
  },

  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 2,
  idleTimeout: 30000,
  enableKeepAlive: true,
  connectTimeout: 20000
});

export default pool;