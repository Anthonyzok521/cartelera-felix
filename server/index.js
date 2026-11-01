import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const UPLOADS_DIR = path.join(ROOT, 'uploads')
const DATA_DIR = path.join(ROOT, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const DIST_DIR = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT) || 3001

const MIN_INTERVAL = 1
const MAX_INTERVAL = 300
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_FILES = 40
const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
])

await fs.mkdir(UPLOADS_DIR, { recursive: true })
await fs.mkdir(DATA_DIR, { recursive: true })

const newId = () => crypto.randomBytes(8).toString('hex')
const clampInterval = (value) => Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.round(value)))

const defaultDb = () => ({ settings: { intervalSeconds: 5 }, images: [] })

async function readDb() {
  let parsed = null
  try {
    parsed = JSON.parse(await fs.readFile(DB_FILE, 'utf8'))
  } catch {
    parsed = null
  }

  const fallback = defaultDb()
  const rawInterval = Number(parsed?.settings?.intervalSeconds)
  const settings = {
    intervalSeconds: Number.isFinite(rawInterval) ? clampInterval(rawInterval) : fallback.settings.intervalSeconds,
  }

  const storedImages = Array.isArray(parsed?.images)
    ? parsed.images.filter((item) => item && typeof item.id === 'string' && typeof item.filename === 'string')
    : []

  let files = []
  try {
    files = (await fs.readdir(UPLOADS_DIR)).filter((file) => file !== '.gitkeep')
  } catch {
    files = []
  }

  const onDisk = new Set(files)
  const images = storedImages.filter((item) => onDisk.has(item.filename))
  const known = new Set(images.map((item) => item.filename))

  for (const filename of files) {
    if (known.has(filename)) continue
    const stat = await fs.stat(path.join(UPLOADS_DIR, filename)).catch(() => null)
    images.push({
      id: newId(),
      filename,
      createdAt: stat ? stat.mtime.toISOString() : new Date().toISOString(),
    })
  }

  return { settings, images }
}

let db = await readDb()

let writeQueue = Promise.resolve()

function saveDb() {
  const snapshot = JSON.stringify(db, null, 2)
  writeQueue = writeQueue
    .then(() => fs.writeFile(DB_FILE, snapshot))
    .catch((error) => console.error('No se pudo guardar la base de datos:', error))
  return writeQueue
}

await saveDb()

const clients = new Set()

function broadcast() {
  for (const client of clients) {
    client.write(`event: update\ndata: ${Date.now()}\n\n`)
  }
}

function publicImage(image) {
  return {
    id: image.id,
    filename: image.filename,
    url: `/uploads/${encodeURIComponent(image.filename)}`,
    createdAt: image.createdAt,
  }
}

function statePayload() {
  return {
    settings: db.settings,
    images: db.images.map(publicImage),
  }
}

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }))

app.get('/api/state', (_req, res) => {
  res.json(statePayload())
})

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
  res.flushHeaders()
  res.write('retry: 3000\n\n')

  clients.add(res)
  req.on('close', () => clients.delete(res))
})

setInterval(() => {
  for (const client of clients) client.write(': ping\n\n')
}, 25000).unref()

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_TYPES.get(file.mimetype) ?? path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true)
    else cb(new Error('Formato no permitido. Usa JPG, PNG, WEBP, GIF o AVIF.'))
  },
})

app.post('/api/images', (req, res) => {
  upload.array('images', MAX_FILES)(req, res, async (error) => {
    if (error) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Cada imagen debe pesar menos de 20 MB.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? `Puedes subir hasta ${MAX_FILES} imágenes a la vez.`
            : error.message
      return res.status(400).json({ error: message })
    }

    const files = req.files ?? []
    if (files.length === 0) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen.' })
    }

    for (const file of files) {
      db.images.push({ id: newId(), filename: file.filename, createdAt: new Date().toISOString() })
    }

    await saveDb()
    broadcast()
    res.status(201).json(statePayload())
  })
})

app.delete('/api/images/:id', async (req, res) => {
  const entry = db.images.find((image) => image.id === req.params.id)
  if (!entry) return res.status(404).json({ error: 'Imagen no encontrada.' })

  db.images = db.images.filter((image) => image.id !== entry.id)
  await saveDb()
  await fs.rm(path.join(UPLOADS_DIR, entry.filename), { force: true })
  broadcast()
  res.json(statePayload())
})

app.post('/api/images/:id/move', async (req, res) => {
  const direction = req.body?.direction
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'La dirección debe ser "up" o "down".' })
  }

  const index = db.images.findIndex((image) => image.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Imagen no encontrada.' })

  const target = direction === 'up' ? index - 1 : index + 1
  if (target >= 0 && target < db.images.length) {
    const [moved] = db.images.splice(index, 1)
    db.images.splice(target, 0, moved)
    await saveDb()
    broadcast()
  }

  res.json(statePayload())
})

app.put('/api/settings', async (req, res) => {
  const seconds = Number(req.body?.intervalSeconds)
  if (!Number.isFinite(seconds)) {
    return res.status(400).json({ error: 'El tiempo debe ser un número de segundos.' })
  }

  db.settings.intervalSeconds = clampInterval(seconds)
  await saveDb()
  broadcast()
  res.json(statePayload())
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' })
})

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Cartelera disponible en http://localhost:${PORT}`)
  console.log(`Panel de administración en http://localhost:${PORT}/#/admin`)
})
