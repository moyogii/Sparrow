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

import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export type GuildConfigurableOptionsList = Record<
  string,
  GuildConfigurableOptions
>;

export interface GuildConfigurable {
  guild_id: string;
  options: string | boolean | number;
  setup: boolean;
  premium: boolean;
}

export interface GuildConfigurableOptions {
  name: string;
  value: string;
  desc: string;
  disabled?: boolean;
  type?: ApplicationCommandOptionType;
}
