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
import { InteractionCommand } from '../../../Classes/core/discord/helpers';
import {
  ApplicationCommandType,
  Channel,
  ChatInputCommandInteraction,
} from 'discord.js';
import { Mod } from '../../moderation/moderation';
import { Embeds } from '../../embeds/embeds';

const command: InteractionCommand = {
  name: 'say',
  type: ApplicationCommandType.ChatInput,
  description: 'Allows the bot to send a message in the current channel.',
  options: [],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const channel: Channel | null = interaction.channel;
      if (!channel) return;

      await Embeds.createSayModal(interaction);
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    return Mod.hasModPermissions(interaction, true);
  },
};
export = command;
