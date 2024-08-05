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
import { BotUtil } from '../../../Classes/util';
import { Bot } from '../../../Classes/core/bot';
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  Role,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'setup',
  type: ApplicationCommandType.ChatInput,
  description: 'Run this command to setup SparrowBot in this Discord.',
  options: [
    {
      name: 'modrole',
      description: 'The mod role for moderator functions in SparrowBot.',
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
    {
      name: 'adminrole',
      description: 'The admin role for admin functions in SparrowBot.',
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
    {
      name: 'override',
      description:
        'Override the setup function to allow you to re-setup the bot.',
      type: ApplicationCommandOptionType.Boolean,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const override: boolean | null =
        interaction.options.getBoolean('override');

      const interactionGuild: string | undefined = interaction.guild?.id;
      if (!interactionGuild) return;

      // Check if the Guild has been created, if not create it.
      const isGuildCreated: boolean =
        await BotUtil.config.getGuildCreated(interactionGuild);
      if (!isGuildCreated) {
        Bot.app.guilds.cache.forEach(async (guild) => {
          if (guild.id !== interaction.guild?.id) return;

          await BotUtil.config.createGuild(guild.id, guild.ownerId, guild.name);
        });
      }

      if (!override && BotUtil.config.isGuildSetup(interactionGuild)) {
        const embed = new EmbedBuilder()
          .setDescription(
            'The bot has already been setup in this Discord server. Pass the override argument to setup the bot again.',
          )
          .setFooter({
            text: 'SparrowBot',
            iconURL: Bot.app.user!.avatarURL() || undefined,
          })
          .setTimestamp()
          .setColor(0xf93a2f);

        return interaction.reply({ embeds: [embed] });
      }

      const modArg: Role | null = interaction.options.getRole(
        'modrole',
      ) as Role;
      if (!modArg) return;

      const adminArg: Role | null = interaction.options.getRole(
        'adminrole',
      ) as Role;
      if (!adminArg) return;

      BotUtil.config.setupGuild(interactionGuild, modArg, adminArg);

      const embed = new EmbedBuilder()
        .setDescription(
          `SparrowBot has now been successfully setup, you are now free to use any of the commands provided. You can type / in the chat box, and click on SparrowBot to view all of the commands.`,
        )
        .setFooter({
          text: 'SparrowBot',
          iconURL: Bot.app.user!.avatarURL() || undefined,
        })
        .setTimestamp()
        .setColor(0x00d166);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    const memberPermissions = interaction.member!
      .permissions as Readonly<PermissionsBitField>;

    return memberPermissions.has(PermissionsBitField.Flags.Administrator);
  },
  disableDM: true,
};
export = command;
