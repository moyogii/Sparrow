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
  DiscordAPIError,
  Guild,
  GuildMember,
} from 'discord.js';
import { DiscordLogger } from '../../../Classes/core/discord/logger';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'timeout',
  type: ApplicationCommandType.ChatInput,
  description:
    'Timeout a member for a specified amount of time or indefinitely.',
  options: [
    {
      name: 'member',
      description: 'Specific member you want to mute.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'time',
      description:
        'How long you want the member to be muted for. (In minutes) (0 = Remove Timeout)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason you want to mute the member.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const memberTarget = interaction.options.getMember(
        'member',
      ) as GuildMember;
      if (!memberTarget) return;

      const member: GuildMember = interaction.member as GuildMember;
      if (!member || !memberTarget) return;

      const bCanTarget = member.roles.cache.find(
        (role) => role.position > memberTarget.roles.highest.position,
      );
      if (!bCanTarget)
        return interaction.reply({
          content: `You do not have permission to target this member! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });

      const interactionGuild: string | undefined = interaction.guild?.id;
      if (!interactionGuild) return;

      const reason: string | null = interaction.options.getString('reason');
      let time: number | null = interaction.options.getInteger('time');
      if (time == null || !reason) return;

      const userGuild: Guild | undefined =
        Bot.app.guilds.cache.get(interactionGuild);
      if (!userGuild) return;

      // If time is equal to 0, then remove the timeout as we don't want permanent timeouts it also serve as a way to remove timeouts.
      if (time <= 0) {
        await memberTarget.timeout(null, reason);
        await DiscordLogger.logPunishment(
          member.user,
          memberTarget.user,
          userGuild.id,
          'Time out removed',
          reason,
        );

        return await interaction.reply({
          content: `${memberTarget.user.tag}'s time out has been removed. ${Bot.getStatusEmoji()}`,
          ephemeral: true,
        });
      }

      // To avoid us going over the max safe integer limit, just set to the maximum we can.
      if (time > 35791) time = 35791;

      const bTimedOut: boolean =
        memberTarget.communicationDisabledUntilTimestamp
          ? memberTarget.communicationDisabledUntilTimestamp > Date.now()
          : false;
      if (bTimedOut)
        return interaction.reply({
          content: 'This member is already timed out.',
          ephemeral: true,
        });

      await memberTarget
        .timeout(time * 60 * 1000, reason)
        .catch(async function (error: DiscordAPIError) {
          if (!error) return;

          if (error.message.includes('Missing Permissions'))
            return await interaction.reply({
              content: `I do not have permission to timeout this member! ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          Bot.catchError(error);
        });

      await DiscordLogger.logPunishment(
        member.user,
        memberTarget.user,
        userGuild.id,
        'Timed out',
        reason,
        time,
      );

      const muteString: string =
        time > 0 ? `for ${time} minutes` : 'Indefinitely';
      await interaction.reply({
        content: `${memberTarget.user.tag} has been timed out ${muteString}. ${Bot.getStatusEmoji()}`,
        ephemeral: true,
      });
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
