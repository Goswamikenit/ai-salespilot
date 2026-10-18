import "dotenv/config";
import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: process.env.MYSQL_PASSWORD,
  database: "salespilot",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testDatabase() {
  const connection = await db.getConnection();

  try {
    await connection.query("SELECT 1");
    console.log("✅ MySQL database connected");
  } finally {
    connection.release();
  }
}