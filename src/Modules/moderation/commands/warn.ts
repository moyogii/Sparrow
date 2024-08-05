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
  CommandInteraction,
  Guild,
  GuildMember,
} from 'discord.js';
import { DiscordLogger } from '../../../Classes/core/discord/logger';
import { BotUtil } from '../../../Classes/util';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'warn',
  type: ApplicationCommandType.ChatInput,
  description: 'Warn a member.',
  options: [
    {
      name: 'member',
      description: 'Specific member you want to warn.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'reason',
      description: 'Reason you want to warn the member.',
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

      const userGuild: Guild | undefined =
        Bot.app.guilds.cache.get(interactionGuild);
      if (!userGuild) return;

      let warnReason: string | null = interaction.options.getString('reason');
      if (!warnReason) warnReason = 'No reason provided';

      if (BotUtil.containsProfanity(warnReason))
        return await interaction.reply({
          content: `You can not use profanity when warning a member! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });

      const userWarnings: number = await Mod.getWarningAmount(target.id);
      const maxWarnings = BotUtil.isNumber(
        BotUtil.config.getValue('discord.maxwarnings', userGuild.id),
      )
        ? Number(BotUtil.config.getValue('discord.maxwarnings', userGuild.id))
        : undefined;

      if (maxWarnings && maxWarnings > 0 && userWarnings >= maxWarnings) {
        await Mod.muteMemberFromWarnings(target, userGuild, interaction);

        return;
      }

      const memberName: string =
        target.user.username + '#' + target.user.discriminator;
      const inflictorName: string =
        interaction.user.username + '#' + interaction.user.discriminator;

      await Mod.addWarning(
        target.user.id,
        memberName,
        warnReason,
        inflictorName,
        interactionGuild,
      );
      await interaction.reply(
        `${target} has been warned! ${Bot.getStatusEmoji()}`,
      );
      await DiscordLogger.logPunishment(
        interaction.user,
        target.user,
        userGuild.id,
        'Warned',
        warnReason,
      );
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: CommandInteraction) {
    return Mod.hasModPermissions(interaction);
  },
  disableDM: true,
};
export = command;
