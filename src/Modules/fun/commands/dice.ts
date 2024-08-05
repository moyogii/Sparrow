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

import { Fun } from '../fun';
import { InteractionCommand } from '../../../Classes/core/discord/helpers';
import { Bot } from '../../../Classes/core/bot';
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  GuildMember,
  User,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'dice',
  type: ApplicationCommandType.ChatInput,
  description:
    'Roll the dice with specified rolls and sides. (Default is 1 roll, 6 sides)',
  options: [
    {
      name: 'rolls',
      description: 'How many rolls.',
      type: ApplicationCommandOptionType.Integer,
    },
    {
      name: 'sides',
      description: 'How many sides.',
      type: ApplicationCommandOptionType.Integer,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      let rollsArgument: number | null = 1;
      let sidesArgument: number | null = 6;

      if (
        interaction.options.getInteger('rolls') ||
        interaction.options.getInteger('sides')
      ) {
        rollsArgument = interaction.options.getInteger('rolls');
        sidesArgument = interaction.options.getInteger('sides');
      }

      if (!rollsArgument || !sidesArgument) return;

      await Fun.rollTheDice(interaction, rollsArgument, sidesArgument);
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    const member: User | GuildMember = interaction.user
      ? interaction.user
      : (interaction.member as GuildMember);

    return !!(interaction && member);
  },
};
export = command;
