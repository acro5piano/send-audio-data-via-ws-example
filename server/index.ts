import Fastify from 'fastify'
import delay from 'delay'
import FastifyStatic from 'fastify-static'
import path from 'path'
import FastifyMultipart from 'fastify-multipart'
import cors from 'fastify-cors'
import { EventEmitter } from 'events'
import fsPromise from 'fs/promises'
import { execa } from 'execa'

const app = Fastify({ logger: true })

app.register(cors)

app.register(FastifyStatic, {
  root: path.resolve(__dirname, '../'),
})

app.register(FastifyMultipart)

const ee = new EventEmitter()
let pathName = ''
let ffmpegStarted = false

ee.on('start-ffmpeg', async () => {
  ffmpegStarted = true
  await delay(3000)
  await Promise.all([
    execa('ffmpeg', ['-re', '-i', pathName, 'hls/output.m3u8']),
    execa('ffmpeg', ['-re', '-i', pathName, 'wav/output.wav']),
  ])
})

app.post<{ Body: { data: any } }>('/audio-stream/input', async (req, res) => {
  const data = await req.file()
  const buffer = await data.toBuffer()
  const newFileName = `${data.filename}.webm`
  pathName = `public/recordings/${newFileName}`
  await fsPromise.appendFile(pathName, buffer)
  ee.emit('append', `/recordings/${newFileName}`)
  if (!ffmpegStarted) {
    ee.emit('start-ffmpeg')
  }
  res.send('ok')
})

app.get('/audio-stream/initial', async (_req, res) => {
  res.send(await fsPromise.readFile(pathName))
})

app.listen(9999)
