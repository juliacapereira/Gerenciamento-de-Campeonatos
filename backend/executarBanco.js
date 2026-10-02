import fs from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function executarBanco() {

    let connection;

    try {

        console.log("Conectando ao Aiven...");

        connection = await mysql.createConnection({

            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),

            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,

            database: process.env.DB_NAME,

            ssl: {
                rejectUnauthorized: false
            },

            multipleStatements: true
        });


        console.log("Conectado ao Aiven.");

        const sql = fs.readFileSync(
            "./banco.sql",
            "utf8"
        );


        console.log("Executando banco.sql...");

        await connection.query(sql);


        console.log("");
        console.log("=================================");
        console.log("BANCO CRIADO COM SUCESSO!");
        console.log("=================================");


        const [tabelas] = await connection.query(
            "SHOW TABLES"
        );


        console.log("");
        console.log("Tabelas encontradas:");

        console.table(tabelas);


    } catch (erro) {

        console.error("");
        console.error("ERRO AO CRIAR O BANCO:");
        console.error(erro.message);

        console.error("");
        console.error("Código:");
        console.error(erro.code);


    } finally {

        if (connection) {

            await connection.end();

            console.log("");
            console.log("Conexão encerrada.");

        }

    }

}


executarBanco();