import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function testarBanco() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log("Conexão com o banco realizada com sucesso.");

    const [tabelas] = await connection.query("SHOW TABLES");

    console.log("\nTabelas encontradas:");
    console.table(tabelas);

    const [esportes] = await connection.query(
      "SELECT * FROM esporte"
    );

    console.log("\nEsportes cadastrados:");
    console.table(esportes);

  } catch (erro) {
    console.error("Erro ao conectar ou consultar o banco:");
    console.error(erro.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testarBanco();