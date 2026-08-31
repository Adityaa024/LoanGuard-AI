import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'database.sqlite')
const logsPath = path.join(dataDir, 'app.log')

console.log('Cleaning up data directory...')

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log(`- Deleted ${dbPath}`)
} else {
  console.log(`- ${dbPath} not found, skipping`)
}

if (fs.existsSync(logsPath)) {
  fs.unlinkSync(logsPath)
  console.log(`- Deleted ${logsPath}`)
} else {
  console.log(`- ${logsPath} not found, skipping`)
}

console.log('Clean completed successfully. Next time you start the app, a fresh database will be created.')
