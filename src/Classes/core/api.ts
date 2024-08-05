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

import { Bot } from './bot';
import { Config } from './config';
import express from 'express';
import https from 'https';
import fs from 'fs';
import { Osu } from '../../Modules/osu!/osu';

export class SparrowAPI {
  private app = express();
  private port = 30000;
  private httpsOptions = {
    key: fs.readFileSync('./ssl/privkey.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
  };

  constructor() {
    if (Config.env === 'PRODUCTION') {
      https.createServer(this.httpsOptions, this.app).listen(this.port, () => {
        console.log(`API - HTTPS server started on Port ${this.port}`);
      });
    } else {
      this.app.listen(this.port, () => {
        console.log(`API - HTTP server started on Port ${this.port}`);
      });
    }

    this.app.get('/', (req, res) => {
      res.send('Nothing to see here, move along. >:(');
    });

    this.app.get('/auth/osu', async (req, res) => {
      try {
        if (!res) return;

        res.redirect(
          `https://discord.com/api/oauth2/authorize?client_id=${Config.botClientID}&redirect_uri=${Config.osuDiscordRedirectURI}&response_type=code&scope=identify`,
        );
      } catch (error) {
        Bot.catchError(error);
      }
    });

    this.app.get('/auth/osu/callback', async (req, res) => {
      try {
        if (typeof req.query.code !== 'string') return;

        await Osu.createOsuPlayerConnection(req.query.code, res);
      } catch (error) {
        Bot.catchError(error);
      }
    });

    this.app.get('/auth/osu/discordcallback', async (req, res) => {
      try {
        const code = req.query.code as string;
        if (!code) return;

        await Osu.getDiscordUser(code, res);
      } catch (error) {
        Bot.catchError(error);
      }
    });
  }
}
