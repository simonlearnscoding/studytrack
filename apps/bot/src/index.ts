import 'dotenv/config'
import { Client, GatewayIntentBits } from 'discord.js'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@studytrack/backend/convex/_generated/api'

const token = process.env.DISCORD_TOKEN
const convexUrl = process.env.CONVEX_URL
const botSecret = process.env.BOT_SHARED_SECRET

if (!token || !convexUrl || !botSecret) {
  throw new Error('Missing DISCORD_TOKEN, CONVEX_URL or BOT_SHARED_SECRET in the environment')
}

const convex = new ConvexHttpClient(convexUrl)

const client = new Client({
  // Guilds: needed to cache guild/voice state. GuildVoiceStates: required to
  // receive voiceStateUpdate. Both are non-privileged intents.
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
})

client.once('clientReady', () => {
  console.log(`studytrack bot logged in as ${client.user?.tag}`)
})

// The bot is deliberately dumb: it forwards the raw before/after channel ids
// and lets Convex decide whether that opens or closes a study session.
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.member?.user.bot) return

  try {
    await convex.mutation(api.bot.recordVoiceEvent, {
      secret: botSecret,
      discordId: newState.id,
      guildId: newState.guild.id,
      fromChannelId: oldState.channelId ?? null,
      toChannelId: newState.channelId ?? null,
    })
  } catch (error) {
    console.error('Failed to record voice event', error)
  }
})

await client.login(token)
