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

import { Bot } from '../../../Classes/core/bot';
import { Interactions } from '../../../Classes/core/interactions';
import { InteractionCommand } from '../../../Classes/core/discord/helpers';
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  GuildMember,
  User,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'deletecommand',
  type: ApplicationCommandType.ChatInput,
  description: 'This allows you to delete a global or guild based command.',
  options: [
    {
      name: 'command',
      description: 'The name of the command you want to delete.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'guild',
      description: 'The guild id the command is attached to.',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const command: string | null = interaction.options.getString('command');
      if (!command) return;

      if (!interaction.options[1]) {
        await Interactions.deleteCommand(command);
      } else {
        const guild: string | null = interaction.options.getString('guild');
        if (!guild) return;

        await Interactions.deleteCommand(command, guild);
      }
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    return true;
  },
};
export = command;
