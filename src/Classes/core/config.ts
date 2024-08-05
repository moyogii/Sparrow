/* 
    Copyright (C) 2024 Moyogii

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { config } from '@dotenvx/dotenvx';
config();

class BotConfig {
  public readonly env =
    process.env.DEPLOYMENT_ENV !== undefined
      ? process.env.DEPLOYMENT_ENV
      : 'DEVELOPMENT';
  public readonly version = '1.0.0';

  // Bunch of bot variables assigned by .env
  public botToken =
    this.env === 'PRODUCTION'
      ? process.env.APP_TOKEN
      : process.env.APP_TOKEN_CANARY;
  public botClientID =
    this.env === 'PRODUCTION'
      ? process.env.APP_CLIENT_ID
      : process.env.APP_CLIENT_ID_CANARY;
  public botPublicKey =
    this.env === 'PRODUCTION'
      ? process.env.APP_PUBLIC_KEY
      : process.env.APP_PUBLIC_KEY_CANARY;
  public botSecret =
    this.env === 'PRODUCTION'
      ? process.env.APP_CLIENT_SECRET
      : process.env.APP_CLIENT_SECRET_CANARY;
  public botRedirectURI =
    this.env === 'PRODUCTION'
      ? process.env.BOT_REDIRECT_URL
      : 'http://127.0.0.1:3000/';

  public osuClientID =
    this.env === 'PRODUCTION'
      ? process.env.OSU_CLIENT_ID
      : process.env.OSU_CLIENT_ID_CANARY;
  public osuClientSecret =
    this.env === 'PRODUCTION'
      ? process.env.OSU_CLIENT_SECRET
      : process.env.OSU_CLIENT_SECRET_CANARY;
  public osuRedirectURI =
    this.env === 'PRODUCTION'
      ? process.env.OSU_REDIRECT_URI
      : process.env.OSU_REDIRECT_URI_CANARY;
  public osuDiscordRedirectURI =
    this.env === 'PRODUCTION'
      ? process.env.APP_CLIENT_SECRET
      : process.env.APP_CLIENT_SECRET_CANARY;

  public spotClientID = process.env.SPOTIFY_CLIENT_ID;
  public spotClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  public steamAPIKey = process.env.STEAM_API_KEY;

  public musicNodeHost = process.env.MUSIC_NODE_HOST;
  public musicNodePort = process.env.MUSIC_NODE_PORT;
  public musicNodePass = process.env.MUSIC_NODE_PASS;

  public sentryDSN = process.env.SENTRY_DSN;
}

export const Config = new BotConfig();
