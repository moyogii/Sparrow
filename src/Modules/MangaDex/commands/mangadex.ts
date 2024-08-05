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
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  GuildMember,
  User,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { MangaDex } from '../mangadex';

const command: InteractionCommand = {
  name: 'md',
  type: ApplicationCommandType.ChatInput,
  description: 'Interact with the MangaDex API!',
  options: [
    {
      name: 'follow',
      description: 'Follow a specific manga for latest chapter updates!',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'manga',
          description:
            'Enter the MangaDex ID or URL of the Manga you wish to follow.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'unfollow',
      description:
        'Stop following a specific manga to discontinue all related updates!',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'manga',
          description:
            'Enter the MangaDex ID or URL of the Manga you wish to unfollow.',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'all',
          description: 'This will unfollow all tracked manga.',
          type: ApplicationCommandOptionType.Boolean,
        },
      ],
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const commandArg: string | null = interaction.options.getSubcommand();
      if (!commandArg) return;

      const member: User | undefined = interaction.user
        ? interaction.user
        : (interaction.member?.user as User);
      if (!(member instanceof User)) return;

      const manga: string | null = interaction.options.getString('manga');
      if (!manga) return;

      switch (commandArg) {
        case 'follow': {
          if (!manga)
            return interaction.reply({
              content: `You must provide a manga to follow/unfollow! ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          await MangaDex.updateMangaFollowStatus(
            member.id,
            manga,
            interaction,
            false,
          );
          break;
        }
        case 'unfollow': {
          const deleteAll: boolean | null =
            interaction.options.getBoolean('all');
          if (deleteAll) {
            await MangaDex.updateMangaFollowStatus(
              member.id,
              manga,
              interaction,
              undefined,
              true,
            );
            return;
          }

          if (!manga)
            return interaction.reply({
              content: `You must provide a manga to follow/unfollow! ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          await MangaDex.updateMangaFollowStatus(
            member.id,
            manga,
            interaction,
            true,
          );
          break;
        }
      }
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
