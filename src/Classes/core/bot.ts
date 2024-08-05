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

import { Config } from './config';
import { Client } from 'discord.js';
import { Interactions } from './interactions';
import { MusicAPI } from '../../Modules/music/music';
import { DiscordEvents } from './discord/events';
import { BotUtil } from '../util';
import { DataSource } from 'typeorm';
import * as Sentry from '@sentry/node';
import { osuPlayerConnection } from '../../Modules/osu!/entities';
import { GuildConfigData, GuildData, MemberWarning } from './guild/entities';
import { mdConnection } from '../../Modules/MangaDex/entities';
import { MangaDex } from '../../Modules/MangaDex/mangadex';
import { ALAnimeMedia, ALMangaMedia } from '../../Modules/AniList/entities';
import { GatewayIntentBits } from 'discord-api-types/v9';
import { Osu } from '../../Modules/osu!/osu';

class BotApp {
  public app: Client;
  public music: MusicAPI;
  public db: DataSource;

  public async setup(): Promise<void> {
    this.app = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildModeration,
      ],
      presence: {
        status: 'online',
        activities: [{ name: `Sparrow ${Config.version}` }],
      },
    });

    this.music = new MusicAPI();

    // Setup and Initialize Sentry for error handling
    Sentry.init({
      dsn: Config.sentryDSN,
      tracesSampleRate: 1.0,
    });

    // Start up the bot
    await this.startDatabaseConnection();
    await this.app.login(Config.botToken);
    await Interactions.setup();
    await BotUtil.config.loadGuildConfigs();
    await Osu.setup();
    await MangaDex.setup();
    DiscordEvents.setup();

    console.log(
      `Core - Setup complete. SparrowBot [${Config.env}] is now online.`,
    );
  }

  public async startDatabaseConnection(): Promise<void> {
    this.db = new DataSource({
      type: 'mysql',
      host: process.env.MYSQL_HOST,
      port: 3306,
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      entities: [
        mdConnection,
        osuPlayerConnection,
        GuildConfigData,
        GuildData,
        MemberWarning,
        ALAnimeMedia,
        ALMangaMedia,
      ],
      database: process.env.MYSQL_DB,
      synchronize: false,
    });

    if (this.db !== undefined)
      console.log('Database - Connected to MySQL server successfully!');
    else console.error('Database - Connection to MySQL server has failed...');
  }

  public catchError(error: unknown): void {
    Sentry.captureException(error);
  }

  public catchMessage(message: string): void {
    Sentry.captureMessage(message);
  }

  public getStatusEmoji(error?: boolean): string {
    return error ? ':x:' : ':white_check_mark:';
  }

  public getIconURL(): string | undefined {
    return this.app.user?.displayAvatarURL();
  }
}

export const Bot = new BotApp();
