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

import { Bot } from '../bot';
import { Config } from '../config';
import { SteamPlayerSummary, SteamSummaryResponse } from './helpers';
import axios from 'axios';
export class SteamAPI {
  public async getPlayerSummary(
    steamid: string,
  ): Promise<SteamPlayerSummary | undefined> {
    const playerSteamSummary = await axios
      .get<SteamSummaryResponse>(
        `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${Config.steamAPIKey}&steamids=${steamid}`,
        {
          responseType: 'json',
        },
      )
      .catch(function (error) {
        Bot.catchError(error);
      });

    if (!playerSteamSummary) return undefined;

    return playerSteamSummary.data.response.players[0];
  }
}

export const Steam = new SteamAPI();
