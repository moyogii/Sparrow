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
  Guild,
  GuildMember,
} from 'discord.js';
import { DiscordLogger } from '../../../Classes/core/discord/logger';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'kick',
  type: ApplicationCommandType.ChatInput,
  description: 'Kick a member.',
  options: [
    {
      name: 'member',
      description: 'Specific member you want to kick.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason you want to kick the member.',
      type: ApplicationCommandOptionType.String,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const target: GuildMember | null = interaction.options.getMember(
        'member',
      ) as GuildMember;
      if (!target) return;

      const member: GuildMember | null = interaction.member as GuildMember;
      if (!member) return;

      const bCanTarget = member.roles.cache.find(
        (role) => role.position > target.roles.highest.position,
      );
      if (!bCanTarget)
        return interaction.reply({
          content: `You do not have permission to target this member! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });

      const interactionGuild: string | undefined = interaction.guild?.id;
      if (!interactionGuild) return;

      let kickReason: string | null = interaction.options.getString('reason');
      if (!kickReason) kickReason = 'No reason provided';

      const userGuild: Guild | undefined =
        Bot.app.guilds.cache.get(interactionGuild);
      if (!userGuild) return;

      await target.kick(kickReason);
      await interaction.reply(
        `${target} has been kicked. ${Bot.getStatusEmoji()}`,
      );

      await DiscordLogger.logPunishment(
        interaction.user,
        target.user,
        userGuild.id,
        'Kicked',
        kickReason,
      );
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    return Mod.hasModPermissions(interaction);
  },
  disableDM: true,
};
export = command;
