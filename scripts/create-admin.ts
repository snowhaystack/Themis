/**
 * Script per creare un utente admin in locale.
 * Uso: npx tsx scripts/create-admin.ts <email> <password>
 *
 * Esempio: npx tsx scripts/create-admin.ts admin@themis.it Admin1234!
 */
import 'dotenv/config'
import Redis from 'ioredis'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Uso: npx tsx scripts/create-admin.ts <email> <password>')
  process.exit(1)
}

if (password.length < 8) {
  console.error('La password deve essere di almeno 8 caratteri')
  process.exit(1)
}

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

async function main() {
  const emailLower = email.toLowerCase()
  const existingId = await redis.get(`themis:users:email:${emailLower}`)

  if (existingId) {
    console.log(`⚠️  Utente con email ${email} già esistente (id: ${existingId})`)
    console.log('   Vuoi aggiornarlo ad admin? Aggiorna manualmente il ruolo con:')
    console.log(`   redis-cli HSET themis:user:${existingId} role admin`)
    await redis.quit()
    return
  }

  const id = uuidv4()
  const passwordHash = await bcrypt.hash(password, 10)
  const now = new Date().toISOString()

  await redis
    .multi()
    .hset(`themis:user:${id}`, {
      id,
      email: emailLower,
      passwordHash,
      role: 'admin',
      provider: 'credentials',
      createdAt: now,
      lastActiveAt: now,
    })
    .set(`themis:users:email:${emailLower}`, id)
    .zadd('themis:users:index', Date.now(), id)
    .exec()

  console.log('✅ Utente admin creato:')
  console.log(`   Email: ${emailLower}`)
  console.log(`   ID:    ${id}`)
  console.log(`   Ruolo: admin`)
  await redis.quit()
}

main().catch(e => {
  console.error('Errore:', e.message)
  redis.quit()
  process.exit(1)
})
