import 'dotenv/config'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import pg from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openPostgres } from '../src/db/postgres.js'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'database.sqlite')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error('DATABASE_URL is required')

const tables = [
  'upload_batches',
  'loans',
  'exceptions',
  'audit_logs',
  'document_manifest',
  'servicer_updates',
  'import_reports',
  'ai_prompt_logs',
  'dynamic_rules'
]

const quote = value => `"${value.replaceAll('"', '""')}"`

const sqlite = await open({ filename: sqlitePath, driver: sqlite3.Database })
const schemaDb = await openPostgres()
await schemaDb.close()
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
})

try {
  for (const table of tables) {
    const columns = await sqlite.all(`PRAGMA table_info(${table})`)
    const names = columns.map(column => column.name)
    const columnSql = names.map(quote).join(', ')
    const batchSize = 500
    let offset = 0
    let copied = 0

    while (true) {
      const rows = await sqlite.all(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [batchSize, offset])
      if (rows.length === 0) break

      const values = []
      const placeholders = rows.map((row, rowIndex) => {
        return `(${names.map((name, columnIndex) => {
          values.push(row[name])
          return `$${rowIndex * names.length + columnIndex + 1}`
        }).join(', ')})`
      }).join(', ')

      await pool.query(
        `INSERT INTO ${quote(table)} (${columnSql}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        values
      )

      copied += rows.length
      offset += rows.length
      console.log(`${table}: ${copied}`)
    }
  }
} finally {
  await sqlite.close()
  await pool.end()
}

console.log('SQLite to Supabase migration complete')
