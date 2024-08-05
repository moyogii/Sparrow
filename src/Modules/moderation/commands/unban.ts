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

import { InteractionCommand } from '../../../Classes/core/discord/helpers';
import { Bot } from '../../../Classes/core/bot';
import { Mod } from '../moderation';
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Collection,
  Guild,
  GuildBan,
} from 'discord.js';
import { DiscordLogger } from '../../../Classes/core/discord/logger';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'unban',
  type: ApplicationCommandType.ChatInput,
  description: 'Unban a member.',
  options: [
    {
      name: 'member',
      description: 'Specific member you want to unban.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason you want to unban the member.',
      type: ApplicationCommandOptionType.String,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const userID: string | null = interaction.options.getString('member');
      if (!userID) return;

      const interactionGuild: string | undefined = interaction.guild?.id;
      if (!interactionGuild) return;

      const userGuild: Guild | undefined =
        Bot.app.guilds.cache.get(interactionGuild);
      if (!userGuild) return;

      const guildBans: Collection<string, GuildBan> =
        await userGuild.bans.fetch();
      const userBan: GuildBan | undefined = guildBans.get(userID);
      if (!userBan)
        return interaction.reply({
          content: `The specified member is not banned! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });

      let unbanReason: string | null = interaction.options.getString('reason');
      if (!unbanReason) unbanReason = 'No reason provided';

      await userGuild.members.unban(userBan.user, unbanReason);
      await interaction.reply(
        `${userBan.user} has been unbanned! ${Bot.getStatusEmoji()}`,
      );
      await DiscordLogger.logPunishment(
        interaction.user,
        userBan.user,
        userGuild.id,
        'Unbanned',
        unbanReason,
      );
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    return Mod.hasModPermissions(interaction, true);
  },
  disableDM: true,
};
export = command;
