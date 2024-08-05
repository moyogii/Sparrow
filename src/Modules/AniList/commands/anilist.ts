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
import { AniList } from '../anilist';
import { BotUtil } from '../../../Classes/util';
import { Bot } from '../../../Classes/core/bot';
import {
  GuildMember,
  User,
  AutocompleteInteraction,
  ApplicationCommandOptionChoiceData,
  ApplicationCommandType,
  ChatInputCommandInteraction,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { alMedia, alUser } from '../helpers';

const command: InteractionCommand = {
  name: 'anilist',
  type: ApplicationCommandType.ChatInput,
  description:
    'This command group allows you to execute commands that interact with the AniList API.',
  options: [
    {
      name: 'type',
      description:
        'Search the AniList database for any type of media. ( Manga / Anime )',
      type: ApplicationCommandOptionType.String,
      choices: [
        {
          name: 'Manga',
          value: 'manga',
        },
        {
          name: 'Anime',
          value: 'anime',
        },
        {
          name: 'User',
          value: 'user',
        },
      ],
      required: true,
    },
    {
      name: 'name',
      description: 'Name of the media that you are searching for.',
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const typeArgument: string | null = interaction.options.getString('type');
      if (!typeArgument) return;

      let nameArgument: string | null = interaction.options.getString('name');
      if (!nameArgument) return;

      switch (typeArgument) {
        case 'user': {
          if (BotUtil.isURL(nameArgument)) {
            nameArgument = nameArgument.split('/')[4];
          }

          const user: alUser | undefined =
            await AniList.getUserByName(nameArgument);
          if (!user) return;

          await AniList.createUserEmbed(user, interaction);
          break;
        }
        case 'manga': {
          if (BotUtil.isURL(nameArgument)) {
            nameArgument = nameArgument.split('/')[5];
          }

          const manga: alMedia | undefined =
            await AniList.getMangaByName(nameArgument);
          if (!manga) return;

          await AniList.createMangaEmbed(manga, interaction);
          break;
        }
        case 'anime': {
          if (BotUtil.isURL(nameArgument)) {
            nameArgument = nameArgument.split('/')[5];
          }

          const anime: alMedia | undefined =
            await AniList.getAnimeByName(nameArgument);
          if (!anime) return;

          await AniList.createAnimeEmbed(anime, interaction);
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
  runAction: async function (interaction: AutocompleteInteraction) {
    const currentType = interaction.options.getString('type');
    if (
      !currentType ||
      (currentType && currentType != 'anime' && currentType != 'manga')
    )
      return;

    const currentOption = interaction.options.getFocused() as string;
    if (!currentOption) return;

    const choices: ApplicationCommandOptionChoiceData[] = [];
    const cachedMedia = await AniList.getMediaResultsByName(
      currentOption,
      currentType,
    );
    if (!cachedMedia) {
      choices.push({
        name: 'No results found. Updating from AniList',
        value: 'N/A',
      });

      // @TODO: Update from AniList here. If we honestly found no results.

      interaction.respond(choices);
      return;
    }

    for (const media of cachedMedia) {
      if (choices.length == 25) break;

      const mediaTitle: string =
        media.name != 'N/A' ? media.name : media.alt_name;
      choices.push({ name: mediaTitle, value: mediaTitle });
    }

    interaction.respond(choices);
  },
};
export = command;
