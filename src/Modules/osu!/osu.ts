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
import { Bot } from '../../Classes/core/bot';
import {
  osuAccessResponse,
  osuBeatmap,
  osuBeatmapResult,
  osuBeatmapSet,
  osuPlayer,
  osuScore,
  osuUser,
  osuUserStatistics,
} from './helpers';
import { Interactions } from '../../Classes/core/interactions';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  CommandInteraction,
  DMChannel,
  EmbedAuthorData,
  EmbedBuilder,
  GuildEmoji,
  InteractionResponse,
  MessageActionRowComponentBuilder,
  NewsChannel,
  resolveColor,
  TextChannel,
  User,
} from 'discord.js';
import { diff, modbits, parser, ppv2, std_diff, std_ppv2 } from 'ojsama';
import { Config } from '../../Classes/core/config';
import { Repository } from 'typeorm';
import { osuPlayerConnection } from './entities';
import axios, { AxiosHeaders, AxiosResponse } from 'axios';
import express from 'express';
import DiscordOauth2 from 'discord-oauth2';
import fetch from 'node-fetch';

const oAuth = new DiscordOauth2();

type PlayerList = osuPlayer[];
type PlayList = osuBeatmapResult[];

export class osuAPI {
  public arrPlayers: PlayerList = [];
  private trackAmount = 30;

  public async setup(): Promise<void> {
    const playerList = await Bot.db.getRepository(osuPlayerConnection).find();
    if (!playerList) return;

    for (const player of playerList) {
      if (!player) continue;

      this.createOsuPlayer(
        player.player_id,
        player.discord_id,
        player.token,
        player.refresh_token,
      );
    }

    setInterval(() => {
      Bot.app.guilds.cache.forEach((guild) => {
        if (!BotUtil.config.getValue('osu.trackchannel', guild.id)) return;

        this.displayNewTopScore(guild.id);
      });
    }, 180 * 1000);
  }

  public async getDiscordUser(
    token: string,
    res: express.Response,
  ): Promise<void> {
    const tokenRequest = await oAuth.tokenRequest({
      clientId: Config.botClientID,
      clientSecret: Config.botSecret,

      code: token,
      scope: 'identify',
      grantType: 'authorization_code',

      redirectUri: Config.botRedirectURI + 'auth/osu/discordcallback',
    });

    if (!tokenRequest) return;

    const user = await oAuth.getUser(tokenRequest.access_token);
    if (!user) return;

    res.redirect(
      `https://osu.ppy.sh/oauth/authorize?response_type=code&client_id=${Config.osuClientID}&redirect_uri=${Config.osuRedirectURI}&scope=identify%20public&state=${user.id}`,
    );
  }

  public async createOsuPlayerConnection(
    token: string,
    res: express.Response,
  ): Promise<void> {
    // If the response does not have the request inside of it, exit the function.
    if (!res.req) return;

    const discord_id: string = res.req.query.state as string;
    const contentData = {
      client_id: Config.osuClientID,
      client_secret: Config.osuClientSecret,
      code: token,
      grant_type: 'authorization_code',
      redirect_uri: Config.osuRedirectURI,
    };

    const configRequest = new AxiosHeaders();
    configRequest.set('Content-Type', 'application/json');

    const tokenResponse: void | AxiosResponse<osuAccessResponse> =
      await BotUtil.sendAPIRequest(
        'https://osu.ppy.sh/oauth/token',
        '',
        JSON.stringify(contentData),
        configRequest,
      );
    if (!tokenResponse) {
      console.warn(
        'osu! - Something failed when communicating with the osu! API.',
      );

      return;
    }

    const playerConfigRequest = new AxiosHeaders();
    playerConfigRequest.set(
      'Authorization',
      'Bearer ' + tokenResponse.data.access_token,
    );
    playerConfigRequest.set('Content-Type', 'application/json');

    const playerResponse: void | AxiosResponse<osuUser> =
      await BotUtil.getAPIRequest(
        'https://osu.ppy.sh/api/v2/me',
        '',
        playerConfigRequest,
      );
    if (!playerResponse) {
      console.warn(
        'osu! - Something failed when communicating with the osu! API.',
      );

      return;
    }

    const playerDatabase = Bot.db.getRepository(osuPlayerConnection);
    const playerID: string = playerResponse.data.id.toString();
    const player = await playerDatabase.findOne({
      where: {
        discord_id: discord_id,
      },
    });

    if (!player) {
      const osuConnection = new osuPlayerConnection();
      osuConnection.player_id = playerID;
      osuConnection.discord_id = discord_id;
      osuConnection.token = tokenResponse.data.access_token;
      osuConnection.refresh_token = tokenResponse.data.refresh_token;

      await playerDatabase.save(osuConnection);

      this.createOsuPlayer(
        playerID,
        discord_id,
        tokenResponse.data.access_token,
        tokenResponse.data.refresh_token,
      );

      // Redirect the player to a success page.
      if (Config.osuSuccessRedirectPage) {
        res.redirect(Config.osuSuccessRedirectPage);
      }
      return;
    }

    player.player_id = playerID;
    player.discord_id = discord_id;
    player.token = tokenResponse.data.access_token;
    player.refresh_token = tokenResponse.data.refresh_token;

    await playerDatabase.save(player);
    this.updateOsuPlayer(
      playerID,
      discord_id,
      tokenResponse.data.access_token,
      tokenResponse.data.refresh_token,
    );

    // Redirect the player to a success page.
    if (Config.osuSuccessRedirectPage) {
      res.redirect(Config.osuSuccessRedirectPage);
    }
  }

  public async connectOsuAccount(
    interaction: CommandInteraction,
  ): Promise<void> {
    const member: User | undefined = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    const user: User | undefined = Bot.app.users.cache.get(member.id);
    if (!user) return;

    let message = '';
    message +=
      '# Here are the steps to connect your osu! account with SparrowBot.\n\n';
    message += `1. [Click here to connect](${Config.botRedirectURI}auth/osu)\n\n`;
    message += `**After authenticating, you can use all osu! related commands within SparrowBot.**\n\n`;
    message += `*SparrowBot is not affilated with osu! in any way shape or form, if you would like to disconnect your account you can do it through the osu! website or you can type /osu disconnect at any time, in any channel.*\n\n`;
    message += `### By connecting your account to SparrowBot through Discord, you acknowledge & agree to our Privacy Policy.`;

    const isDM = Interactions.isDMInteraction(interaction);
    if (!isDM) {
      try {
        await user.send(message);

        await interaction.reply({
          content:
            'SparrowBot has sent you a DM with instructions on how to connect! :thumbsup:',
          ephemeral: true,
        });
      } catch {
        await interaction.reply({
          content:
            'SparrowBot is unable to send you a message. Please check your privacy settings.',
          ephemeral: true,
        });
      }
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }

  public async disconnectOsuAccount(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    const member: User | undefined = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    const user: User | undefined = Bot.app.users.cache.get(member.id);
    if (!user) return;

    const playerDatabase: Repository<osuPlayerConnection> =
      Bot.db.getRepository(osuPlayerConnection);

    const player = await playerDatabase.findOne({
      where: { discord_id: member.id },
    });
    if (!player)
      return await interaction.reply({
        content:
          'You do not have a osu! account authenticated with SparrowBot!',
        ephemeral: true,
      });

    await playerDatabase.remove(player);
    this.deleteOsuPlayer(member.id);

    const isDM = Interactions.isDMInteraction(interaction);
    if (!isDM) {
      return await interaction.reply({
        content: 'Removed your osu! account from SparrowBot!',
        ephemeral: true,
      });
    } else {
      return await interaction.reply({
        content:
          'Sad to see you go. :wave:, We have removed your osu! account from SparrowBot!',
        ephemeral: true,
      });
    }
  }

  public async displayRecentScore(
    interaction: CommandInteraction,
    player: string,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction.guild?.id || !player) return;

    const member: User | undefined = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    const currentPlayer: osuPlayer | undefined = this.findOsuPlayer(member.id);
    if (!currentPlayer)
      return await interaction.reply({
        content:
          'It looks like you are not authenticated. Try running /osu connect and try again!',
        ephemeral: true,
      });

    const profileResponse: void | AxiosResponse<osuUser> =
      await this.getOsuRequest(
        `https://osu.ppy.sh/api/v2/users/${player}`,
        currentPlayer,
        interaction,
      );
    if (!profileResponse) return;

    const url = `https://osu.ppy.sh/api/v2/users/${profileResponse.data.id}/scores/recent?include_fails=1`;
    const recentResponse: void | AxiosResponse<osuScore[]> =
      await this.getOsuRequest(url, currentPlayer, interaction);
    if (!recentResponse) return;

    // If nothing was returned, then they have not played anything recently.
    if (recentResponse.data.length <= 0)
      return await interaction.reply({
        content:
          'This player does not have any recent plays in the last 24 hours.',
        ephemeral: true,
      });

    // osu! commands can take a decent amount of time for a response due to PP calculation and HTTP downloading of the beatmaps.
    await interaction.deferReply();

    const recentPlayEmbed: EmbedBuilder | undefined = await this.buildPlayEmbed(
      recentResponse.data[0],
      profileResponse.data,
    );
    if (!recentPlayEmbed) return;

    await interaction.editReply({ embeds: [recentPlayEmbed] });
  }

  public async displayTop(
    interaction: CommandInteraction,
    player: string,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!player) return;

    const member: User = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    const currentPlayer: osuPlayer | undefined = this.findOsuPlayer(member.id);
    if (!currentPlayer)
      return await interaction.reply({
        content:
          'It looks like you are not authenticated. Try running /osu connect and try again!',
        ephemeral: true,
      });

    // osu! commands can take a decent amount of time for a response due to PP calculation and HTTP downloading of the beatmaps.
    await interaction.deferReply();

    const profileResponse: void | AxiosResponse<osuUser> =
      await this.getOsuRequest(
        `https://osu.ppy.sh/api/v2/users/${player}`,
        currentPlayer,
        interaction,
      );
    if (!profileResponse) return;

    const url = `https://osu.ppy.sh/api/v2/users/${profileResponse.data.id}/scores/best?limit=10`;
    const topResponse: void | AxiosResponse<osuScore[]> =
      await this.getOsuRequest(url, currentPlayer, interaction);
    if (!topResponse) return;

    const topBeatmaps: PlayList = [];
    const scoreList: osuScore[] = topResponse.data;
    for (const map of scoreList) {
      const response = await fetch(`https://osu.ppy.sh/osu/${map.beatmap.id}`);
      const responseBeatmap = await response.arrayBuffer();
      const beatmapData: string = responseBeatmap.toString();
      const osuParse: parser = new parser().feed(beatmapData);

      const songGrade: GuildEmoji | undefined | string = this.getGradeEmoji(
        map.rank,
      );
      const songMods = map.mods && map.mods.length > 0 ? map.mods : 'No mods';
      const songModsSyntax: string = map.mods ? '+' + map.mods : '';
      let songModBits: modbits = modbits.nomod;
      if (map.mods.length > 0 && songModsSyntax.startsWith('+')) {
        songModBits = modbits.from_string(songModsSyntax.slice(1) || '');
      }

      const songAccuracy: number = map.accuracy * 100;
      const songStars: std_diff = new diff().calc({
        map: osuParse.map,
        mods: songModBits,
      });

      const songBeatMapInfo = {
        stars: songStars,
        combo: map.max_combo,
        nmiss: map.statistics.count_miss,
        acc_percent: songAccuracy,
      };

      const songPPGained: number = map.pp
        ? map.pp
        : ppv2(songBeatMapInfo).total;
      const songPPCalculated: std_ppv2 = ppv2({
        map: osuParse.map,
        mods: songModBits,
      });
      const timeCreated: Date = new Date(Date.parse(map.created_at));
      const timeSince: string = BotUtil.timeSince(timeCreated);

      const beatmap: osuBeatmapResult = {
        name: map.beatmapset.title,
        author: map.beatmapset.artist,
        length: BotUtil.prettyTime(map.beatmap.total_length),
        mods: songMods,
        grade: songGrade,
        stars: songStars.total,
        pp: songPPGained,
        calculated_pp: songPPCalculated.total,
        accuracy: songAccuracy,
        combo: map.max_combo,
        max_combo: osuParse.map.max_combo(),
        count_300: map.statistics.count_300,
        count_100: map.statistics.count_100,
        count_50: map.statistics.count_50,
        count_miss: map.statistics.count_miss,
        timeSince: timeSince,
        url: map.beatmap.url,
      };

      topBeatmaps.push(beatmap);
    }

    const profileData: osuUser = profileResponse.data;
    const profileStats: osuUserStatistics = profileData.statistics;
    const profileFlag: string = profileData.country_code;
    const profileFlagEmoji = this.getFlagEmoji(profileFlag);
    const numberFormat: Intl.NumberFormat = Intl.NumberFormat('en-US');
    const author: EmbedAuthorData = {
      name: `${profileData.username} - #${numberFormat.format(profileStats.global_rank)} (${profileData.country_code} #${numberFormat.format(profileStats.country_rank)}) - ${numberFormat.format(profileStats.pp)}pp`,
      iconURL: profileFlagEmoji,
      url: `https://osu.ppy.sh/users/${profileData.id}`,
    };

    const beatmapEmbed: EmbedBuilder = new EmbedBuilder()
      .setAuthor(author)
      .setThumbnail(profileData.avatar_url)
      .setColor(Colors.LuminousVividPink);

    let descMessage = '';
    for (const index in topBeatmaps) {
      const map: osuBeatmapResult = topBeatmaps[index];
      if (!map) continue;

      const currentMapNumber: number = +index + 1;
      const mapHits: string =
        map.count_300 +
        '/' +
        map.count_100 +
        '/' +
        map.count_50 +
        '/' +
        map.count_miss;
      descMessage += `**${currentMapNumber}.** [${map.name}](${map.url}) **Mods:** ${map.mods}\n`;
      descMessage += `${map.grade} **${Math.round(map.pp)}pp** - ${map.accuracy.toFixed(2)}% - **☆${map.stars.toFixed(2)}**\n`;
      descMessage += `[**${map.combo}x**/${map.max_combo}x] (${mapHits}) - ${map.timeSince} ago\n`;
    }

    beatmapEmbed.setDescription(descMessage);

    await interaction.editReply({ embeds: [beatmapEmbed] });
  }

  public async displayBeatmap(
    interaction: CommandInteraction,
    song: string,
    mods?: string,
  ): Promise<InteractionResponse<boolean> | void> {
    const member: User = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    const currentPlayer: osuPlayer | undefined = this.findOsuPlayer(member.id);
    if (!currentPlayer)
      return await interaction.reply({
        content:
          'It looks like you are not authenticated. Try running /osu connect and try again!',
        ephemeral: true,
      });

    // osu! commands can take a decent amount of time for a response due to PP calculation and HTTP downloading of the beatmaps.
    await interaction.deferReply();

    const url = `https://osu.ppy.sh/api/v2/beatmaps/lookup?id=${song}`;

    const songResponse: void | AxiosResponse<osuBeatmap> =
      await this.getOsuRequest(url, currentPlayer, interaction);
    if (!songResponse) return;

    const response = await fetch(`https://osu.ppy.sh/osu/${song}`);
    const responseBeatmap = await response.arrayBuffer();
    const beatmapData: string = responseBeatmap.toString();
    const beatmapStats: osuBeatmap = songResponse.data;
    const beatmapInfo: osuBeatmapSet = beatmapStats.beatmapset;
    const osuParse: parser = new parser().feed(beatmapData);

    let songModBits: modbits = modbits.nomod;
    let beatMapMods = 'No Mods';
    if (mods) {
      songModBits = modbits.from_string(mods || '');
      if (songModBits != 0) beatMapMods = '+' + modbits.string(songModBits);
    }

    const songStars: std_diff = new diff().calc({
      map: osuParse.map,
      mods: songModBits,
    });
    const beatmapEmbed: EmbedBuilder = new EmbedBuilder()
      .setAuthor({
        name: `${beatmapInfo.title} - ${beatmapInfo.artist}`,
        url: beatmapStats.url,
      })
      .setThumbnail(beatmapInfo.covers.list)
      .setImage(beatmapInfo.covers.cover)
      .setDescription(
        `**☆${songStars.total.toFixed(2)}** | **Length:** ${BotUtil.prettyTime(beatmapStats.total_length)} | [Song Preview](https:${beatmapInfo.preview_url}) | **${beatMapMods}**`,
      )
      .setColor(Colors.LuminousVividPink);

    let beatmapInfoField = '';
    beatmapInfoField += `**Combo:** x${beatmapStats.max_combo} **BPM:**: ${beatmapStats.bpm}\n**AR:** ${beatmapStats.ar} **OD:** ${beatmapStats.accuracy} **CS:** ${beatmapStats.cs} `;
    beatmapInfoField += `**HP:** ${beatmapStats.drain}\n**Objects:** ${beatmapStats.count_circles + beatmapStats.count_sliders + beatmapStats.count_spinners} **Spinners:** ${beatmapStats.count_spinners}`;

    const rankedPP95: string =
      ppv2({
        map: osuParse.map,
        acc_percent: 95,
        mods: songModBits,
      }).total.toFixed(2) + 'pp';
    const rankedPP97: string =
      ppv2({
        map: osuParse.map,
        acc_percent: 97,
        mods: songModBits,
      }).total.toFixed(2) + 'pp';
    const rankedPP99: string =
      ppv2({
        map: osuParse.map,
        acc_percent: 99,
        mods: songModBits,
      }).total.toFixed(2) + 'pp';
    const rankedPPTotal: string =
      ppv2({
        map: osuParse.map,
        mods: songModBits,
      }).total.toFixed(2) + 'pp';
    const rankSSEmoji: GuildEmoji | undefined | string =
      this.getGradeEmoji('X');

    const rankedDate: Date = new Date(beatmapInfo.ranked_date);
    beatmapEmbed.addFields([
      {
        name: `[${beatmapStats.version}]`,
        value: beatmapInfoField,
        inline: true,
      },
      {
        name: `pp statistics - ${rankSSEmoji} ${rankedPPTotal}`,
        value: `**95%** - ${rankedPP95} | **97%** - ${rankedPP97} | **99%** - ${rankedPP99}`,
      },
    ]);
    beatmapEmbed.setFooter({
      text: `❤ ${beatmapInfo.favourite_count} | ${beatmapInfo.status} | Approved ${rankedDate.toLocaleDateString()} | Mapped by ${beatmapInfo.creator}`,
    });

    const osuLink = new ButtonBuilder()
      .setURL('https://osu.ppy.sh/beatmaps/2025940') // TODO: Maybe this should be the actual url of the beatmap?
      .setLabel('Download - osu!')
      .setStyle(ButtonStyle.Link);

    const chimuLink = new ButtonBuilder()
      .setURL('https://chimu.moe/d/968171')
      .setLabel('Download - chimu.moe')
      .setStyle(ButtonStyle.Link);

    const row =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
        osuLink,
        chimuLink,
      ]);

    await interaction.editReply({
      embeds: [beatmapEmbed],
      components: [row],
    });
  }

  public async displayOsuProfile(
    interaction: CommandInteraction,
    player: string,
    mode?: string,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!player) return;

    const member: User = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    const currentPlayer: osuPlayer | undefined = this.findOsuPlayer(member.id);
    if (!currentPlayer)
      return await interaction.reply({
        content:
          'It looks like you are not authenticated. Try running /osu connect and try again!',
        ephemeral: true,
      });

    const url: string = mode
      ? `https://osu.ppy.sh/api/v2/users/${player}/${mode}`
      : `https://osu.ppy.sh/api/v2/users/${player}`;

    const profileResponse: void | AxiosResponse<osuUser> =
      await this.getOsuRequest(url, currentPlayer, interaction);
    if (!profileResponse) return;

    const profileData: osuUser = profileResponse.data;
    const profileStats: osuUserStatistics = profileData.statistics;
    const profilePlayMode = mode ? mode : profileData.playmode;
    const profileFlag: string = profileData.country_code;
    const profileFlagEmoji = this.getFlagEmoji(profileFlag);
    const numberFormat: Intl.NumberFormat = Intl.NumberFormat('en-US');
    const author: EmbedAuthorData = {
      name: `${profileData.username} - #${numberFormat.format(profileStats.global_rank)} (${profileData.country_code} #${numberFormat.format(profileStats.country_rank)}) - ${numberFormat.format(profileStats.pp)}pp`,
      iconURL: profileFlagEmoji,
      url: `https://osu.ppy.sh/users/${profileData.id}`,
    };

    const profileEmbed: EmbedBuilder = new EmbedBuilder()
      .setAuthor(author)
      .setThumbnail(profileData.avatar_url)
      .setDescription(`${profilePlayMode} statistics - ${profileStats.pp}pp`)
      .addFields([
        {
          name: 'Ranked Score',
          value: numberFormat.format(profileStats.ranked_score).toString(),
          inline: true,
        },
        {
          name: 'Accuracy',
          value: profileStats.hit_accuracy.toFixed(2) + '%',
          inline: true,
        },
        {
          name: 'Max Combo',
          value: profileStats.maximum_combo.toString(),
          inline: true,
        },
        {
          name: 'Total Score',
          value: numberFormat.format(profileStats.total_score),
          inline: true,
        },
        {
          name: 'Total Hits',
          value: numberFormat.format(profileStats.total_hits),
          inline: true,
        },
        {
          name: 'Level',
          value: profileStats.level.current.toString(),
          inline: true,
        },
        {
          name: 'Play Time',
          value: Math.floor(profileStats.play_time / 60 / 60) + ' hours',
          inline: true,
        },
        {
          name: 'Play Count',
          value: profileStats.play_count.toString(),
          inline: true,
        },
        {
          name: 'Medals',
          value: profileData.user_achievements.length.toString(),
          inline: true,
        },
      ])
      .setColor(Colors.LuminousVividPink);

    // Grab the player's profile grades, reverse them into the correct order and display them.
    let gradeMessage = '';
    const profileGrades = Object.keys(profileStats.grade_counts)
      .sort()
      .reverse()
      .map((key) => ({
        grade: key,
        value: profileStats.grade_counts[key],
      }));

    profileGrades.forEach((gradesObject) => {
      const gradeEmoji: GuildEmoji | undefined | string = this.getGradeEmoji(
        gradesObject.grade,
      );
      gradeMessage += `${gradeEmoji} ${gradesObject.value}`;
    });

    profileEmbed.addFields([{ name: 'Grades', value: gradeMessage }]);

    let profileFooter = '';
    const playStyleMessage: string[] | string = profileData.playstyle
      ? profileData.playstyle
      : 'No playstyle provided'; // List out how players play the game of osu!

    const hasSupporter: boolean =
      profileData.is_supporter && profileData.is_supporter;
    if (hasSupporter) profileFooter += `\nosu! Supporter`;

    profileFooter += `\nPlaystyles: ` + playStyleMessage;
    profileFooter += `\nMember since ${BotUtil.parseDate(profileData.join_date)}`;
    profileEmbed.setFooter({ text: profileFooter });

    return await interaction.reply({ embeds: [profileEmbed] });
  }

  public findOsuPlayer(discord_id: string): osuPlayer | undefined {
    for (const index in this.arrPlayers) {
      const currentPlayer: osuPlayer = this.arrPlayers[index];
      if (currentPlayer.discord_id !== discord_id) continue;

      return this.arrPlayers[index];
    }
  }

  public async selectOsuPlayerFromArgument(
    argument: string,
    lookup?: boolean,
    interaction?: CommandInteraction,
  ): Promise<string> {
    let playerID = argument;
    if (BotUtil.isURL(playerID)) {
      playerID = playerID.substring(playerID.lastIndexOf('/') + 1);
    }

    if (lookup && interaction) {
      const currentMember: string | undefined = interaction.member?.user?.id;
      if (!currentMember) return '';

      const currentPlayer: osuPlayer | undefined =
        this.findOsuPlayer(currentMember);
      if (!currentPlayer) {
        await interaction.editReply(
          'It looks like you are not authenticated. Try running /osu connect and try again!',
        );

        return '';
      }

      const profileResponse: void | AxiosResponse<osuUser> =
        await this.getOsuRequest(
          `https://osu.ppy.sh/api/v2/users/${playerID}`,
          currentPlayer,
          interaction,
        );
      if (!profileResponse) return '';

      return profileResponse.data.username;
    }

    return playerID;
  }

  public async addTrackedOsuPlayer(
    player: string,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction.guild?.id || !player) return;

    const trackPlayer: string | undefined =
      await this.selectOsuPlayerFromArgument(player, true, interaction);
    if (!trackPlayer)
      return await interaction.reply({
        content: `Could not find the player provided. Please try again! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    let trackedList: string[] = await BotUtil.config.getValue(
      'osu.trackedplayers',
      interaction.guild.id,
    );
    if (!trackedList || !Array.isArray(trackedList)) trackedList = [];

    if (trackedList.length >= 1) {
      if (trackedList.length >= this.trackAmount) {
        return await interaction.reply({
          content: `You have the maximum number of allowed osu! players tracked. Please un-track somebody and try again! ${Bot.getStatusEmoji(true)}`,
          ephemeral: true,
        });
      }

      for (const player of trackedList) {
        if (player.toLowerCase() === trackPlayer.toLowerCase()) {
          return await interaction.reply({
            content: `${trackPlayer} is already being tracked! ${Bot.getStatusEmoji(true)}`,
            ephemeral: true,
          });
        }
      }
    }

    trackedList.push(trackPlayer.toLowerCase());
    await BotUtil.config.setValue(
      'osu.trackedplayers',
      trackedList,
      interaction.guild.id,
      true,
    );

    return await interaction.reply({
      content: `${trackPlayer} is now being tracked! ${Bot.getStatusEmoji()}`,
      ephemeral: true,
    });
  }

  public async removeTrackedOsuPlayer(
    player: string,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    if (!interaction.guild?.id || !player)
      return await interaction.reply({
        content: 'This command can only be used in a server!',
        ephemeral: true,
      });

    const untrackPlayer = await this.selectOsuPlayerFromArgument(player);
    if (!untrackPlayer)
      return await interaction.reply({
        content: `Could not find the player provided. Please try again! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    const currentTrackedList: string[] = await BotUtil.config.getValue(
      'osu.trackedplayers',
      interaction.guild.id,
    );
    if (!currentTrackedList)
      return await interaction.reply({
        content: `Nobody is being tracked in this Discord! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    for (let index = 0; index < currentTrackedList.length; index++) {
      const player: string = currentTrackedList[index];

      if (player.toLowerCase() === untrackPlayer.toLowerCase()) {
        currentTrackedList.splice(index, 1);
        await BotUtil.config.setValue(
          'osu.trackedplayers',
          currentTrackedList,
          interaction.guild.id,
          true,
        );

        return await interaction.reply({
          content: `${untrackPlayer} is no longer being tracked! ${Bot.getStatusEmoji()}`,
          ephemeral: true,
        });
      }
    }

    return await interaction.reply({
      content: `${untrackPlayer} is not being tracked! ${Bot.getStatusEmoji(true)}`,
      ephemeral: true,
    });
  }

  public async displayTrackedOsuPlayers(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    if (!interaction.guild?.id)
      return await interaction.reply({
        content: 'This command can only be used in a server!',
        ephemeral: true,
      });

    const guildTrackedList: string[] = await BotUtil.config.getValue(
      'osu.trackedplayers',
      interaction.guild.id,
    );
    if (!guildTrackedList)
      return await interaction.reply({
        content: `Nobody is being tracked in this Discord! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    let message = '';
    let trackedAmount = 0;
    for (const index in guildTrackedList) {
      const player: string = guildTrackedList[index];
      if (!player) continue;

      message += `${player}\n`;
      trackedAmount++;
    }

    const iconURL: string | undefined = Bot.app.user?.avatarURL() ?? undefined;

    const queueEmbed: EmbedBuilder = new EmbedBuilder()
      .setTitle(
        `Currently tracked osu! players ( ${trackedAmount} out of ${this.trackAmount} )`,
      )
      .setDescription(message)
      .setFooter({ text: 'SparrowBot', iconURL })
      .setColor(resolveColor('Random'));

    return await interaction.reply({ embeds: [queueEmbed] });
  }

  private async displayNewTopScore(guild_id: string) {
    const currentPlayer: osuPlayer | undefined =
      this.findOsuPlayer('673244263479508992');
    if (!currentPlayer) return;

    const trackedPlayers = await BotUtil.config.getValue(
      'osu.trackedplayers',
      guild_id,
    );
    for (const player of trackedPlayers) {
      const profileResponse = await this.getOsuRequest(
        `https://osu.ppy.sh/api/v2/users/${player}`,
        currentPlayer,
      );
      if (!profileResponse) return;

      const url = `https://osu.ppy.sh/api/v2/users/${profileResponse.data.id}/scores/best?limit=50`;
      const topResponse = await this.getOsuRequest(url, currentPlayer);
      if (!topResponse) return;

      const currentTime: Date = new Date();

      const playScores: number[] = [];
      for (const j of topResponse.data) {
        const mapScore = j.pp;
        playScores.push(mapScore);
      }
      playScores.sort((a, b) => b - a);

      for (const index in topResponse.data) {
        const currentPlay = topResponse.data[index];
        const playTimeCreated: Date = new Date(
          Date.parse(currentPlay.created_at),
        );

        if (currentTime.getTime() - playTimeCreated.getTime() < 3 * 60 * 1000) {
          const osuChannelID:
            | TextChannel
            | DMChannel
            | NewsChannel
            | undefined = BotUtil.config.getValue('osu.trackchannel', guild_id);

          const foundChannel = Bot.app.channels.cache.find(
            (channel) => channel.id === `${osuChannelID}`,
          ) as TextChannel;
          if (!foundChannel || (foundChannel && !foundChannel.isTextBased()))
            return;

          if (guild_id !== foundChannel.guild.id) return;

          const pbScore: number = playScores.indexOf(currentPlay.pp) + 1;
          const playEmbed: EmbedBuilder | undefined = await this.buildPlayEmbed(
            currentPlay,
            profileResponse.data,
            pbScore,
          );
          if (!playEmbed) return;

          await foundChannel.send({ embeds: [playEmbed] });
        }
      }

      await BotUtil.wait(3000);
    }
  }

  private createOsuPlayer(
    player_id: string,
    discord_id: string,
    token: string,
    refresh_token: string,
  ) {
    this.arrPlayers.push({
      id: player_id,
      token: token,
      refresh_token: refresh_token,
      discord_id: discord_id,
    });
  }

  private deleteOsuPlayer(discord_id: string) {
    for (const index in this.arrPlayers) {
      const currentPlayer: osuPlayer = this.arrPlayers[index];
      if (currentPlayer.discord_id !== discord_id) continue;

      delete this.arrPlayers[index];
    }
  }

  private updateOsuPlayer(
    player_id: string,
    discord_id: string,
    token: string,
    refresh_token: string,
  ) {
    for (const index in this.arrPlayers) {
      const currentPlayer: osuPlayer = this.arrPlayers[index];
      if (!currentPlayer) return;
      if (currentPlayer.discord_id !== discord_id) continue;

      currentPlayer.id = player_id;
      currentPlayer.token = token;
      currentPlayer.refresh_token = refresh_token;
    }
  }

  private async getOsuRequest(
    url: string,
    currentPlayer: osuPlayer,
    interaction?: CommandInteraction,
  ) {
    if (!currentPlayer) return;

    // Attempt to refresh the players access token if its required.
    if (interaction) await this.checkAccessToken(currentPlayer, interaction);
    else await this.checkAccessToken(currentPlayer);

    const configRequest = {
      Authorization: 'Bearer ' + currentPlayer.token,
      'Content-Type': 'application/json',
    };

    return await axios
      .get(`${url}`, {
        headers: configRequest,
      })
      .catch(function(error) {
        if (!error.isAxiosError) return;
        if (error.response && error.response.status == 401) return;

        if (interaction)
          interaction.editReply(
            'Something unexpected occured when trying to obtain osu! API data, try again later!',
          );

        return;
      });
  }

  private getFlagEmoji(flag: string) {
    return `https://flagcdn.com/128x96/${flag.toLowerCase()}.png`;
  }

  private getGradeEmoji(grade: string) {
    let gradeEmojiText = ':x:';
    let gradeEmoji: GuildEmoji | undefined;

    switch (grade) {
      case 'F':
        gradeEmojiText = ':x:';
        break;
      case 'D':
        gradeEmojiText = 'sprwRankD';
        break;
      case 'C':
        gradeEmojiText = 'sprwRankC';
        break;
      case 'B':
        gradeEmojiText = 'sprwRankB';
        break;
      case 'A':
      case 'a':
        gradeEmojiText = 'sprwRankA';
        break;
      case 'XH':
      case 'ssh':
        gradeEmojiText = 'sprwRankSSHD';
        break;
      case 'X':
      case 'ss':
        gradeEmojiText = 'sprwRankSS';
        break;
      case 'S':
      case 's':
        gradeEmojiText = 'sprwRankS';
        break;
      case 'SH':
      case 'sh':
        gradeEmojiText = 'sprwRankSHD';
        break;
    }

    if (gradeEmojiText != ':x:') {
      gradeEmoji = Bot.app.emojis.cache.find(
        (emoji) => emoji.name === gradeEmojiText,
      );
      if (!gradeEmoji) return ':x:';

      return gradeEmoji.toString();
    }

    return ':x:';
  }

  private async buildPlayEmbed(
    play: osuScore,
    profile: osuUser,
    position?: number,
  ) {
    if (!play || !profile) return;

    const response = await fetch(`https://osu.ppy.sh/osu/${play.beatmap.id}`);
    const responseBeatmap = await response.arrayBuffer();
    const beatmapData: string = responseBeatmap.toString();
    const osuParse: parser = new parser().feed(beatmapData);

    const profileData: osuUser = profile;
    const profileStats: osuUserStatistics = profileData.statistics;
    const profileFlag: string = profileData.country_code;
    const profileFlagEmoji = this.getFlagEmoji(profileFlag);
    const numberFormat: Intl.NumberFormat = Intl.NumberFormat('en-US');
    const author: EmbedAuthorData = {
      name: `${profileData.username} - #${numberFormat.format(profileStats.global_rank)} (${profileData.country_code} #${numberFormat.format(profileStats.country_rank)}) - ${numberFormat.format(profileStats.pp)}pp`,
      iconURL: profileFlagEmoji,
      url: `https://osu.ppy.sh/users/${profileData.id}`,
    };

    const beatmapEmbed: EmbedBuilder = new EmbedBuilder()
      .setAuthor(author)
      .setTitle(`${play.beatmapset.title} - ${play.beatmap.version}`)
      .setURL(play.beatmap.url)
      .setThumbnail(play.beatmapset.covers.list)
      .setColor(Colors.LuminousVividPink);

    let descMessage = '';
    const songGrade: GuildEmoji | undefined | string = this.getGradeEmoji(
      play.rank,
    );
    const songMods = play.mods && play.mods.length > 0 ? play.mods : 'No mods';

    let songLength: number = play.beatmap.total_length;
    for (const mod of songMods) {
      // Shorten the song length if the mod is DT or NC.
      if (mod === 'DT' || mod === 'NC') {
        songLength = Math.trunc(songLength / 1.5);

        break;
      }
    }

    const songModsSyntax: string = play.mods ? '+' + play.mods : '';
    let songModBits: modbits = modbits.nomod;
    if (play.mods.length > 0 && songModsSyntax.startsWith('+')) {
      songModBits = modbits.from_string(songModsSyntax.slice(1) || '');
    }

    const songAccuracy: number = play.accuracy * 100;
    const songStars: std_diff = new diff().calc({
      map: osuParse.map,
      mods: songModBits,
    });
    const songMaxCombo: number = osuParse.map.max_combo();
    const songBeatMapInfo = {
      stars: songStars,
      combo: play.max_combo,
      nmiss: play.statistics.count_miss,
      acc_percent: songAccuracy,
    };

    const songBeatMapInfoFC = {
      stars: songStars,
      combo: osuParse.map.max_combo(),
      n300: play.statistics.count_300 + play.statistics.count_miss,
      n100: play.statistics.count_100,
      n50: play.statistics.count_50,
      nmiss: 0,
    };

    const songFCInfo = ppv2(songBeatMapInfoFC);
    if (!songFCInfo) return;

    const songRank: string | undefined = position
      ? `Personal Best: #${numberFormat.format(position)}`
      : undefined;
    const songPPGained: number = play.pp
      ? play.pp
      : ppv2(songBeatMapInfo).total;
    const songPPFC: number = songFCInfo.total;

    let songFCMessage = `(**Full Combo**)`;
    if (songMaxCombo != play.max_combo) {
      songFCMessage = `(**${songPPFC.toFixed(2)}pp for FC**)`;
    }

    const songPPCalculated: std_ppv2 = ppv2({
      map: osuParse.map,
      mods: songModBits,
    });

    let songPPMessage = `**${songPPGained.toFixed(2)}**/${songPPCalculated.total.toFixed(2)}pp`;
    if (songAccuracy >= 100) {
      songPPMessage = `**${songPPGained.toFixed(2)}pp**`;
    }

    const songHits: string =
      play.statistics.count_300 +
      '/' +
      play.statistics.count_100 +
      '/' +
      play.statistics.count_50 +
      '/' +
      play.statistics.count_miss;
    descMessage += `**☆${songStars.total.toFixed(2)}** | **Length:** ${BotUtil.prettyTime(songLength)} | **Mods:** ${songMods}\n\n`;

    if (songRank) descMessage += `🏁 __**${songRank}**__\n\n`;

    descMessage += `${songGrade} **Score:** ${numberFormat.format(play.score)} **Accuracy:** ${songAccuracy.toFixed(2)}%\n`;
    descMessage += `${songPPMessage} ${songFCMessage}\n`;
    descMessage += `[**${play.max_combo}x**/${osuParse.map.max_combo()}x] (${songHits})`;

    beatmapEmbed.setDescription(descMessage);

    const timeCreated: Date = new Date(Date.parse(play.created_at));
    const timeSince: string = BotUtil.timeSince(timeCreated);

    if (songRank) {
      beatmapEmbed.setTimestamp();
    } else {
      beatmapEmbed.setFooter({ text: `Played ${timeSince} ago` });
    }

    return beatmapEmbed;
  }

  // Refresh the access token, and only do it on the first request. We dont want to keep doing this.
  private async checkAccessToken(
    currentPlayer: osuPlayer,
    interaction?: CommandInteraction,
  ) {
    if (!currentPlayer) return;

    const meResponse = await axios
      .get(`https://osu.ppy.sh/api/v2/users/${currentPlayer.id}`, {
        headers: {
          Authorization: 'Bearer ' + currentPlayer.token,
          'Content-Type': 'application/json',
        },
      })
      .catch(async (error) => {
        if (!error.isAxiosError) return;

        if (error.response && error.response.status == 401) {
          const tokenData = {
            client_id: Config.osuClientID,
            client_secret: Config.osuClientSecret,
            refresh_token: currentPlayer.refresh_token,
            grant_type: 'refresh_token',
          };

          const tokenResponse = await axios
            .post(`https://osu.ppy.sh/oauth/token`, JSON.stringify(tokenData), {
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .catch(async function (error) {
              if (!error.isAxiosError) return;

              if (error.response) {
                if (interaction)
                  await interaction.editReply(
                    'Connection failed, please run /osu connect and try again!',
                  );
              }
            });

          if (!tokenResponse) return;

          const playerDatabase = Bot.db.getRepository(osuPlayerConnection);
          const player = await playerDatabase.findOne({
            where: {
              discord_id: currentPlayer.discord_id,
            },
          });

          if (!player) return;

          player.token = tokenResponse.data.access_token;
          player.refresh_token = tokenResponse.data.refresh_token;
          await playerDatabase.save(player);

          this.updateOsuPlayer(
            currentPlayer.id,
            currentPlayer.discord_id,
            tokenResponse.data.access_token,
            tokenResponse.data.refresh_token,
          );
        }
      });

    if (meResponse) return;
  }
}

export const Osu = new osuAPI();
