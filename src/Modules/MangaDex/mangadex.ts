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

import { BotUtil } from '../../Classes/util';
import axios, { AxiosResponse } from 'axios';
import { mdConnection } from './entities';
import {
  mdMangaFeed,
  mdAccessResponse,
  mdFollowList,
  mdMangaResponse,
  mdMangaData,
  mdMangaCover,
} from './helpers';
import {
  CommandInteraction,
  DiscordAPIError,
  EmbedBuilder,
  User,
  ButtonStyle,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  ButtonBuilder,
  InteractionResponse,
} from 'discord.js';
import { Bot } from '../../Classes/core/bot';

class MangaDexAPI {
  private currentToken: string;

  // ???
  public async setup(): Promise<void> {
    const currentConnection: mdConnection | null = await Bot.db
      .getRepository(mdConnection)
      .findOne({});
    if (!currentConnection) return;

    this.currentToken = currentConnection.token;

    setInterval(() => {
      Bot.app.guilds.cache.forEach((guild) => {
        this.getLastMangaUpdates(guild.id);
      });
    }, 300 * 1000);
  }

  public async updateMangaFollowStatus(
    follower_id: string,
    manga_id: string,
    interaction: CommandInteraction,
    unfollow?: boolean,
    deleteAll?: boolean,
  ): Promise<InteractionResponse<boolean>> {
    if (!interaction.guild?.id)
      return await interaction.reply({
        content: `This command can only be used in a server! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });
    const mdSavedList = await BotUtil.config.getValue(
      'mangadex.followlist',
      interaction.guild.id,
    );

    let mdList: mdFollowList[] = mdSavedList === '{}' ? [] : mdSavedList;
    if (deleteAll) {
      mdList = [];
      BotUtil.config.setValue(
        'mangadex.followlist',
        mdList,
        interaction.guild.id,
        true,
      );

      return await interaction.reply({
        content: `All currently tracked manga has now been unfollowed! ${Bot.getStatusEmoji()}`,
        ephemeral: true,
      });
    }

    await this.checkAccessToken();

    if (BotUtil.isURL(manga_id)) {
      manga_id = manga_id.split('/')[4];
    }

    const mangaRes: void | AxiosResponse<mdMangaResponse> = await axios
      .get(`https://api.mangadex.org/manga/${manga_id}`, {
        headers: {
          Authorization: 'Bearer ' + this.currentToken,
          'Content-Type': 'application/json',
        },
      })
      .catch(async function () {
        await interaction.reply({
          content: `The manga specified does not exist on MangaDex! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });
        return;
      });

    if (!mangaRes)
      return await interaction.reply({
        content: `The manga specified does not exist on MangaDex! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    const mangaData: mdMangaData = mangaRes.data.data as mdMangaData;
    if (!mangaData)
      return await interaction.reply({
        content: `The manga specified does not exist on MangaDex! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    if (mdList.length >= 1) {
      for (const mangaData of mdList) {
        const follower = mangaData.discord_id;
        if (follower != follower_id) continue;

        const mangaList: string[] = mangaData.manga;
        if (unfollow) {
          if (!mangaList.includes(manga_id))
            return interaction.reply({
              content: `You are not following this Manga! ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          const mangaIndex: number = mangaData.manga.indexOf(manga_id);
          mangaData.manga.splice(mangaIndex, 1);

          break;
        }

        if (mangaList.includes(manga_id))
          return interaction.reply({
            content: `You are already following this Manga! ${Bot.getStatusEmoji(true)}`,
            ephemeral: true,
          });

        mangaData.manga.push(manga_id);
      }
    } else {
      if (unfollow)
        return interaction.reply({
          content: `You are not following any manga. Try following something! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });

      mdList.push({ discord_id: follower_id, manga: [manga_id] });
    }

    BotUtil.config.setValue(
      'mangadex.followlist',
      mdList,
      interaction.guild.id,
      true,
    );

    const updateMessage: string = unfollow
      ? `${mangaData.attributes.title.en} is no longer being followed! ${Bot.getStatusEmoji()}`
      : `${mangaData.attributes.title.en} is now being followed! ${Bot.getStatusEmoji()}`;
    return await interaction.reply({ content: updateMessage, ephemeral: true });
  }

  public async getLastMangaUpdates(guild_id: string): Promise<void> {
    if (!guild_id) return;

    await this.checkAccessToken();

    const headers = {
      headers: {
        Authorization: 'Bearer ' + this.currentToken,
        'Content-Type': 'application/json',
      },
    };

    const mdList: mdFollowList[] = await BotUtil.config.getValue(
      'mangadex.followlist',
      guild_id,
    );
    if (!mdList) return;

    for (const mangaData of mdList) {
      const follower: string = mangaData.discord_id;
      const followerList: string[] = mangaData.manga;
      if (!followerList) continue;

      for (const manga of followerList) {
        const mangaRes = await axios
          .get(
            `https://api.mangadex.org/manga/${manga}/feed?limit=1&order[chapter]=desc&translatedLanguage[]=en`,
            headers,
          )
          .catch(async function (error) {
            if (!error.isAxiosError) return;
          });

        if (!mangaRes) return;
        if (!mangaRes.data.data[0]) return; // MangaDex has manga that has zero chapters..

        const mangaChapterData = mangaRes.data.data[0] as mdMangaFeed;
        if (!mangaChapterData) return;

        const mangaDetailRes: void | AxiosResponse<mdMangaResponse> =
          await axios
            .get(`https://api.mangadex.org/manga/${manga}`, headers)
            .catch(async function (error) {
              if (!error.isAxiosError) return;
            });

        if (!mangaDetailRes) return;

        const mangaData: mdMangaData = mangaDetailRes.data.data as mdMangaData;
        if (!mangaData) return;

        const mangaCoverRes: void | AxiosResponse<mdMangaResponse> = await axios
          .get(
            `https://api.mangadex.org/cover/?limit=1&order[createdAt]=desc&manga[]=${manga}`,
            headers,
          )
          .catch(async function (error) {
            if (!error.isAxiosError) return;
          });

        if (!mangaCoverRes) return;

        const mangaCoverData = mangaCoverRes.data.data[0] as mdMangaCover;
        if (!mangaCoverData) return;

        const currentTime: Date = new Date();
        const publishTime: Date = new Date(
          Date.parse(mangaChapterData.attributes.publishAt),
        );
        const timeDiff: number = currentTime.getTime() - publishTime.getTime();

        if (timeDiff > 0 && timeDiff < 300 * 1000) {
          const user: User = await Bot.app.users.fetch(follower);

          const embed = new EmbedBuilder();
          embed.setTitle(
            mangaData.attributes.title.en + ' - New chapter available!',
          );
          embed.setDescription(
            'Chapter ' +
              mangaChapterData.attributes.chapter +
              ' is now available to read!',
          );
          embed.setImage(
            'https://uploads.mangadex.org/covers/' +
              manga +
              '/' +
              mangaCoverData.attributes.fileName,
          );
          embed.setTimestamp();

          const chapterLink = new ButtonBuilder()
            .setURL('https://mangadex.org/chapter/' + mangaChapterData.id)
            .setLabel('Link - Chapter ' + mangaChapterData.attributes.chapter)
            .setStyle(ButtonStyle.Link);

          const row =
            new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
              [chapterLink],
            );

          await user
            .send({ embeds: [embed], components: [row] })
            .catch(async function (error: DiscordAPIError) {
              if (!error) return;
              if (error.message.includes('Cannot send messages to this user'))
                return;

              Bot.catchError(error);
            });
        }
      }
    }
  }

  public async checkAccessToken(): Promise<void> {
    await axios
      .get(`https://api.mangadex.org/manga/`, {
        headers: {
          Authorization: 'Bearer ' + this.currentToken,
          'Content-Type': 'application/json',
        },
      })
      .catch(async (error) => {
        if (!error.isAxiosError) return;

        if (error.response && error.response.status == 400) {
          const tokenData = {
            username: process.env.MD_USER,
            password: process.env.MD_PASS,
          };

          const tokenResponse: void | AxiosResponse<mdAccessResponse> =
            await axios
              .post(
                `https://api.mangadex.org/auth/login`,
                JSON.stringify(tokenData),
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                },
              )
              .catch(async function (error) {
                if (!error.isAxiosError) return;
              });

          if (!tokenResponse) return;

          const tokenDatabase = Bot.db.getRepository(mdConnection);
          const tokenConnection = await tokenDatabase.findOne({
            where: { token: this.currentToken },
          });

          if (!tokenConnection) return;

          tokenConnection.token = tokenResponse.data.token.refresh;
          this.currentToken = tokenResponse.data.token.refresh;
          await tokenDatabase.save(tokenConnection);
        }
      });
  }
}

export const MangaDex = new MangaDexAPI();
