import 'dotenv/config'
import { Client, GatewayIntentBits } from 'discord.js'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@studytrack/backend/convex/_generated/api'
import { describeVoiceMove, hasHumanInVoice, toVoiceSnapshot } from './voice'
import { startLeaderboard, type LeaderboardRefresh } from './leaderboard'

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

// Starts once the gateway is ready; null until then, or if the board channel is
// not a text channel.
let leaderboard: LeaderboardRefresh | null = null

client.once('clientReady', async () => {
  console.log(`studytrack bot logged in as ${client.user?.tag}`)
  try {
    leaderboard = await startLeaderboard(client, convex, botSecret, {
      // Asked on every leaderboard tick, so it reads the gateway cache only.
      hasVoiceActivity: () => {
        for (const guild of client.guilds.cache.values()) {
          if (hasHumanInVoice(guild.voiceStates.cache.values())) return true
        }
        return false
      },
    })
  } catch (error) {
    console.error('[leaderboard] failed to start', error)
  }
})

// The bot is a dumb reporter: it forwards the raw before/after snapshots and
// lets Convex decide whether they open, change or close a workSession.
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.member?.user.bot) return

  const from = toVoiceSnapshot(oldState)
  const to = toVoiceSnapshot(newState)

  const move = describeVoiceMove(oldState.channelId, newState.channelId)
  const fromName = oldState.channel?.name ?? oldState.channelId ?? '-'
  const toName = newState.channel?.name ?? newState.channelId ?? '-'
  console.log(`[voice] ${newState.member?.user.tag} ${move}: ${fromName} -> ${toName}`)

  try {
    await convex.mutation(api.bot.recordVoiceEvent, {
      secret: botSecret,
      discordId: newState.id,
      discordUsername: newState.member?.user.username,
      guildId: newState.guild.id,
      from,
      to,
    })
    // The board's timer would take up to a minute to notice a join; the event is
    // already here, so redraw from it instead of polling faster.
    leaderboard?.nudge()
  } catch (error) {
    console.error('[voice] failed to record event', error)
  }
})

await client.login(token)
