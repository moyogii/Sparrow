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
  name: 'rps',
  type: ApplicationCommandType.ChatInput,
  description: 'The classic minigame. Rock. Paper. Scissors.',
  options: [
    {
      name: 'choice',
      description: 'Rock, Paper or Scissors?',
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: 'Rock', value: 'Rock' },
        { name: 'Paper', value: 'Paper' },
        { name: 'Scissors', value: 'Scissors' },
      ],
      required: true,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const selectionArgument: string | null =
        interaction.options.getString('choice');
      if (!selectionArgument) return;

      await Fun.rockPaperScissors(selectionArgument, interaction);
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
