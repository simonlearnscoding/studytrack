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
import type * as crons from "../crons.js";
import type * as guildSettings from "../guildSettings.js";
import type * as guildSettings_service from "../guildSettings/service.js";
import type * as guildSettings_types from "../guildSettings/types.js";
import type * as sessions from "../sessions.js";
import type * as sessions_service from "../sessions/service.js";
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
  crons: typeof crons;
  guildSettings: typeof guildSettings;
  "guildSettings/service": typeof guildSettings_service;
  "guildSettings/types": typeof guildSettings_types;
  sessions: typeof sessions;
  "sessions/service": typeof sessions_service;
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
