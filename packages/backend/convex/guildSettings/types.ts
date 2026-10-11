import { v, type Infer } from 'convex/values'

export const getGuildSettingsArgs = v.object({
  guildId: v.string(),
})

export const setStudyChannelsArgs = v.object({
  guildId: v.string(),
  channelIds: v.array(v.string()),
})

export type GetGuildSettingsArgs = Infer<typeof getGuildSettingsArgs>
export type SetStudyChannelsArgs = Infer<typeof setStudyChannelsArgs>
