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
import {
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
  ButtonStyle,
  resolveColor,
  ActionRowBuilder,
  ButtonBuilder,
  MessageActionRowComponentBuilder,
  InteractionResponse,
} from 'discord.js';
import { alMedia, alUser } from './helpers';
import { Like, Repository } from 'typeorm';
import { ALAnimeMedia, ALMangaMedia } from './entities';
import { AxiosHeaders } from 'axios';
import { Bot } from '../../Classes/core/bot';

class Anilist {
  public async getAnimeByName(name: string): Promise<alMedia | undefined> {
    const queryString = `
            query($query: String) {
                AnimeSearch: Page {
                    media(search: $query, type: ANIME) {
                        id
                        description(asHtml: false)
                        siteUrl
                        season
                        seasonYear
                        episodes
                        status
                        type
                        nextAiringEpisode {
                            timeUntilAiring
                            episode
                        }
                        title {
                            userPreferred
                            native
                            english
                        }
                        averageScore
                        coverImage {
                            large
                            color
                        }
                        trailer {
                            id
                            site
                        }
                        studios(isMain: true) {
                            nodes {
                                id
                                name
                                isAnimationStudio
                                siteUrl
                            }
                        }
                        isAdult
                    }
                }
            }
        `;

    const variables = {
      query: name,
    };

    const payload = JSON.stringify({
      query: queryString,
      variables: variables,
    });

    const configRequest = new AxiosHeaders();
    configRequest.set('Content-Type', 'application/json');
    configRequest.set('Accept', 'application/json');

    const requestResponse = await BotUtil.sendAPIRequest(
      'https://graphql.anilist.co',
      '',
      payload,
      configRequest,
    );
    if (!requestResponse) return undefined;

    return requestResponse.data.data.AnimeSearch.media[0];
  }

  public async getMediaResultsByName(
    name: string,
    type: string,
  ): Promise<ALMangaMedia[] | ALAnimeMedia[] | undefined> {
    const cachedMedia: ALMangaMedia[] | ALAnimeMedia[] | undefined =
      await this.getMediaFromCache(name, type);

    return cachedMedia;
  }

  public async getMangaByName(name: string): Promise<alMedia | undefined> {
    const queryString = `
            query($query: String) {
                MangaSearch: Page {
                    media(search: $query, type: MANGA) {
                        id
                        description
                        siteUrl
                        chapters
                        volumes
                        status
                        type
                        startDate {
                            year
                            month
                        }
                        endDate {
                            year
                            month
                        }
                        title {
                            userPreferred
                            native
                            english
                        }
                        meanScore
                        averageScore
                        coverImage {
                            large
                            color
                        }
                        isAdult
                    }
                }
            }
        `;

    const variables = {
      query: name,
    };

    const payload = JSON.stringify({
      query: queryString,
      variables: variables,
    });

    const configRequest = new AxiosHeaders();
    configRequest.set('Content-Type', 'application/json');
    configRequest.set('Accept', 'application/json');

    const requestResponse = await BotUtil.sendAPIRequest(
      'https://graphql.anilist.co',
      '',
      payload,
      configRequest,
    );
    if (!requestResponse) return undefined;

    return requestResponse.data.data.MangaSearch.media[0];
  }

  public async getUserByName(name: string): Promise<alUser | undefined> {
    const queryString = `
            query ($search: String) {
                User(name: $search) {
                    name
                    siteUrl
                    avatar {
                        large
                    }
                    statistics {
                        anime {
                            count
                            minutesWatched
                            meanScore
                        }
                        manga {
                            chaptersRead
                            count
                            meanScore
                        }
                    }
                    donatorTier
                    donatorBadge
                }
            }
        `;

    const variables = {
      search: name,
    };

    const payload = JSON.stringify({
      query: queryString,
      variables: variables,
    });

    const configRequest = new AxiosHeaders();
    configRequest.set('Content-Type', 'application/json');
    configRequest.set('Accept', 'application/json');

    const requestResponse = await BotUtil.sendAPIRequest(
      'https://graphql.anilist.co',
      '',
      payload,
      configRequest,
    );
    if (!requestResponse) return undefined;

    return requestResponse.data.data.User;
  }

  public async createUserEmbed(
    user: alUser,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    let userFooter = ``;
    const daysWatched: number = Math.floor(
      user.statistics.anime.minutesWatched / 1440,
    );

    const userEmbed: EmbedBuilder = new EmbedBuilder()
      .setTitle(user.name)
      .setAuthor({
        name: 'Anilist',
        iconURL: 'https://anilist.co/img/icons/apple-touch-icon.png',
      })
      .addFields([
        {
          name: 'Total Anime',
          value: user.statistics.anime.count.toString(),
          inline: true,
        },
        {
          name: 'Days Watched',
          value: daysWatched.toString(),
          inline: true,
        },
        {
          name: 'Anime Mean Score',
          value: `${user.statistics.anime.meanScore.toString()}%`,
          inline: true,
        },
        {
          name: 'Total Manga',
          value: user.statistics.manga.count.toString(),
          inline: true,
        },
        {
          name: 'Chapters Read',
          value: user.statistics.manga.chaptersRead.toString(),
          inline: true,
        },
        {
          name: 'Manga Mean Score',
          value: `${user.statistics.manga.meanScore.toString()}%`,
          inline: true,
        },
      ])
      .setImage(user.avatar.large)
      .setColor(resolveColor('Random'))
      .setURL(user.siteUrl);

    const isDonator: boolean = user.donatorTier > 0 ? true : false;
    const donatorStatus: string = isDonator ? 'Yes' : 'No';
    userFooter += `Donator: ${donatorStatus}`;

    const hasCustomBadge: boolean =
      user.donatorBadge !== 'Donator' && isDonator ? true : false;
    if (hasCustomBadge) userFooter += `\nDonator Badge: ${user.donatorBadge}`;

    userEmbed.setFooter({ text: userFooter });

    return await interaction.reply({ embeds: [userEmbed] });
  }

  public async createAnimeEmbed(
    anime: alMedia,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    await this.checkForNSFW(anime, interaction);

    const animeName: string = anime.title.english
      ? anime.title.english
      : anime.title.userPreferred;
    const animeEpisodes = anime.episodes ? anime.episodes : 'N/A';
    const animeDesc: string = anime.description
      ? BotUtil.cleanText(BotUtil.shortText(anime.description, 500))
      : 'No description currently provided for this Anime.';
    const animeScore: string = anime.averageScore
      ? `${anime.averageScore}%`
      : 'N/A';
    const animeColor = anime.coverImage.color
      ? (anime.coverImage.color as `#${string}`)
      : ('RANDOM' as `#${string}`);
    const animeSeason: string = anime.season
      ? `${anime.season.toString()} ${anime.seasonYear.toString()}`
      : 'N/A';
    const animeStatus: string =
      anime.status === 'RELEASING'
        ? 'Airing'
        : anime.status === 'NOT_YET_RELEASED'
          ? 'Not Yet Released'
          : anime.status;
    let animeFooter = `Status: ${animeStatus}`;

    const animeEmbed: EmbedBuilder = new EmbedBuilder()
      .setTitle(animeName)
      .setDescription(animeDesc)
      .setAuthor({
        name: 'Anilist',
        iconURL: 'https://anilist.co/img/icons/apple-touch-icon.png',
      })
      .addFields([
        {
          name: 'Episodes',
          value: animeEpisodes.toString(),
          inline: true,
        },
        { name: 'Season', value: animeSeason, inline: true },
        { name: 'Score', value: animeScore, inline: true },
      ])
      .setImage(anime.coverImage.large)
      .setColor(resolveColor(animeColor))
      .setURL(anime.siteUrl);

    const isAiring: boolean = anime.status == 'RELEASING' ? true : false;
    if (isAiring) {
      if (!anime.nextAiringEpisode) {
        animeFooter += `\nEpisode airing time is not currently available.`;
      } else {
        animeFooter += `\nEpisode ${anime.nextAiringEpisode.episode} airs in ${BotUtil.numberToDays(anime.nextAiringEpisode.timeUntilAiring)}`;
      }
    }

    let animeStudio: string = anime.studios.nodes
      ? anime.studios.nodes[0].name
      : 'N/A';
    if (anime.studios.nodes.length > 1) {
      animeStudio = anime.studios.nodes.map((studio) => studio.name).join(', ');
    }

    animeFooter += '\nAnimated by ' + animeStudio;

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    const animeTrailer: string = anime.trailer ? anime.trailer.site : '';
    if (animeTrailer == 'youtube') {
      const trailerLink = new ButtonBuilder()
        .setURL('https://www.youtube.com/watch?v=' + anime.trailer.id)
        .setLabel('Trailer Preview')
        .setStyle(ButtonStyle.Link);

      row.addComponents([trailerLink]);
    }

    animeEmbed.setFooter({ text: animeFooter });

    const payload =
      row.components.length >= 1
        ? {
            embeds: [animeEmbed],
            components: [row],
          }
        : { embeds: [animeEmbed] };

    return await interaction.reply(payload);
  }

  public async createMangaEmbed(
    manga: alMedia,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    await this.checkForNSFW(manga, interaction);

    const mangaName: string = manga.title.english
      ? manga.title.english
      : manga.title.userPreferred;
    const mangaColor = manga.coverImage.color
      ? (manga.coverImage.color as `#${string}`)
      : ('RANDOM' as `#${string}`);
    let mangaFooter = `Status: ${manga.status}`;

    const mangaEmbed: EmbedBuilder = new EmbedBuilder()
      .setTitle(mangaName)
      .setDescription(
        BotUtil.cleanText(BotUtil.shortText(manga.description, 500)),
      )
      .setAuthor({
        name: 'Anilist',
        iconURL: 'https://anilist.co/img/icons/apple-touch-icon.png',
      })
      .setImage(manga.coverImage.large)
      .setColor(resolveColor(mangaColor))
      .setURL(manga.siteUrl);

    const mangaScore: number = manga.averageScore
      ? manga.averageScore
      : manga.meanScore;
    const chapterAmount = manga.chapters ? manga.chapters : 'N/A';
    const volumeAmount = manga.volumes ? manga.volumes : 'N/A';

    mangaEmbed.addFields([
      { name: 'Score', value: `${mangaScore}%`, inline: true },
      { name: 'Chapters', value: chapterAmount.toString(), inline: true },
      { name: 'Volumes', value: volumeAmount.toString(), inline: true },
    ]);

    const isReleasing: boolean = manga.startDate.year ? true : false;
    if (isReleasing)
      mangaFooter += `\nStart Date: ${BotUtil.numberToMonth(manga.startDate.month - 1)} ${manga.startDate.year}`;

    const isEnded: boolean = manga.endDate.year ? true : false;
    if (isEnded)
      mangaFooter += `\nEnd Date: ${BotUtil.numberToMonth(manga.endDate.month - 1)} ${manga.endDate.year}`;

    mangaEmbed.setFooter({ text: mangaFooter });
    return await interaction.reply({ embeds: [mangaEmbed] });
  }

  private async checkForNSFW(
    content: alMedia,
    interaction: CommandInteraction,
  ) {
    const isNSFW: boolean = content.isAdult ? true : false;
    if (isNSFW) {
      const currentChannel = interaction.channel as TextChannel;
      if (!currentChannel) return;

      if (!currentChannel.nsfw) {
        await interaction.reply({
          content:
            'This ' +
            content.type.toLowerCase() +
            ' is NSFW, but you are not in a NSFW channel. Please try again in a NSFW channel!',
          ephemeral: true,
        });
        return;
      }
    }
  }

  private async getMediaFromCache(name: string, type: string) {
    let mediaRepo:
      | Repository<ALMangaMedia>
      | Repository<ALAnimeMedia>
      | undefined = undefined;

    if (type.toLowerCase() === 'anime') {
      mediaRepo = Bot.db.getRepository(ALAnimeMedia);
    } else if (type.toLowerCase() === 'manga') {
      mediaRepo = Bot.db.getRepository(ALMangaMedia);
    }

    if (!mediaRepo) return undefined;

    let media: ALAnimeMedia[] | ALMangaMedia[] = await mediaRepo.find({
      where: {
        name: Like(`%${name}%`),
      },
    });

    if (!media || media.length == 0) {
      media = await mediaRepo.find({
        where: {
          alt_name: Like(`%${name}%`),
        },
      });
    }

    if (!media || media.length == 0) return undefined;

    return media;
  }
}

export const AniList = new Anilist();
