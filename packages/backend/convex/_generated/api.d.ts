/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bot from "../bot.js";
import type * as bot_service from "../bot/service.js";
import type * as bot_types from "../bot/types.js";
import type * as bot_util from "../bot/util.js";
import type * as bot_voiceStrategies from "../bot/voiceStrategies.js";
import type * as clearTables from "../clearTables.js";
import type * as crons from "../crons.js";
import type * as dailyTotals from "../dailyTotals.js";
import type * as dailyTotals_service from "../dailyTotals/service.js";
import type * as dailyTotals_types from "../dailyTotals/types.js";
import type * as dailyTotals_util from "../dailyTotals/util.js";
import type * as dev_seed from "../dev/seed.js";
import type * as leaderboard from "../leaderboard.js";
import type * as leaderboard_service from "../leaderboard/service.js";
import type * as leaderboard_types from "../leaderboard/types.js";
import type * as leaderboard_util from "../leaderboard/util.js";
import type * as maintenance from "../maintenance.js";
import type * as migrations from "../migrations.js";
import type * as plannedSessions from "../plannedSessions.js";
import type * as plannedSessions_service from "../plannedSessions/service.js";
import type * as plannedSessions_types from "../plannedSessions/types.js";
import type * as preferences from "../preferences.js";
import type * as preferences_service from "../preferences/service.js";
import type * as preferences_types from "../preferences/types.js";
import type * as quotes from "../quotes.js";
import type * as quotes_service from "../quotes/service.js";
import type * as quotes_types from "../quotes/types.js";
import type * as quotes_util from "../quotes/util.js";
import type * as sessions from "../sessions.js";
import type * as sessions_calendar from "../sessions/calendar.js";
import type * as sessions_metrics from "../sessions/metrics.js";
import type * as sessions_service from "../sessions/service.js";
import type * as sessions_types from "../sessions/types.js";
import type * as sessions_util from "../sessions/util.js";
import type * as tasks from "../tasks.js";
import type * as tasks_service from "../tasks/service.js";
import type * as tasks_types from "../tasks/types.js";
import type * as tasks_util from "../tasks/util.js";
import type * as timeline_bands from "../timeline/bands.js";
import type * as timeline_gesture from "../timeline/gesture.js";
import type * as timeline_types from "../timeline/types.js";
import type * as timeline_util from "../timeline/util.js";
import type * as tracking from "../tracking.js";
import type * as tracking_service from "../tracking/service.js";
import type * as tracking_types from "../tracking/types.js";
import type * as tracking_util from "../tracking/util.js";
import type * as users from "../users.js";
import type * as users_service from "../users/service.js";
import type * as users_types from "../users/types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bot: typeof bot;
  "bot/service": typeof bot_service;
  "bot/types": typeof bot_types;
  "bot/util": typeof bot_util;
  "bot/voiceStrategies": typeof bot_voiceStrategies;
  clearTables: typeof clearTables;
  crons: typeof crons;
  dailyTotals: typeof dailyTotals;
  "dailyTotals/service": typeof dailyTotals_service;
  "dailyTotals/types": typeof dailyTotals_types;
  "dailyTotals/util": typeof dailyTotals_util;
  "dev/seed": typeof dev_seed;
  leaderboard: typeof leaderboard;
  "leaderboard/service": typeof leaderboard_service;
  "leaderboard/types": typeof leaderboard_types;
  "leaderboard/util": typeof leaderboard_util;
  maintenance: typeof maintenance;
  migrations: typeof migrations;
  plannedSessions: typeof plannedSessions;
  "plannedSessions/service": typeof plannedSessions_service;
  "plannedSessions/types": typeof plannedSessions_types;
  preferences: typeof preferences;
  "preferences/service": typeof preferences_service;
  "preferences/types": typeof preferences_types;
  quotes: typeof quotes;
  "quotes/service": typeof quotes_service;
  "quotes/types": typeof quotes_types;
  "quotes/util": typeof quotes_util;
  sessions: typeof sessions;
  "sessions/calendar": typeof sessions_calendar;
  "sessions/metrics": typeof sessions_metrics;
  "sessions/service": typeof sessions_service;
  "sessions/types": typeof sessions_types;
  "sessions/util": typeof sessions_util;
  tasks: typeof tasks;
  "tasks/service": typeof tasks_service;
  "tasks/types": typeof tasks_types;
  "tasks/util": typeof tasks_util;
  "timeline/bands": typeof timeline_bands;
  "timeline/gesture": typeof timeline_gesture;
  "timeline/types": typeof timeline_types;
  "timeline/util": typeof timeline_util;
  tracking: typeof tracking;
  "tracking/service": typeof tracking_service;
  "tracking/types": typeof tracking_types;
  "tracking/util": typeof tracking_util;
  users: typeof users;
  "users/service": typeof users_service;
  "users/types": typeof users_types;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
