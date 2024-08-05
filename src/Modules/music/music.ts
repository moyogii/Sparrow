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
import { Connectors, NodeOption } from 'shoukaku';
import {
  Kazagumo,
  KazagumoPlayer,
  KazagumoQueue,
  KazagumoSearchResult,
  KazagumoTrack,
  PlayerState,
  Plugins,
} from 'kazagumo';
import {
  CommandInteraction,
  GuildMember,
  EmbedBuilder,
  TextChannel,
  resolveColor,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  InteractionResponse,
} from 'discord.js';
import { Config } from '../../Classes/core/config';

const Nodes: NodeOption[] = [
  {
    name: 'Sparrow Node',
    url: Config.musicNodeHost + ':' + Config.musicNodePort,
    auth: Config.musicNodePass || '',
  },
];

export class MusicAPI {
  public manager: Kazagumo;
  public online = false;

  constructor() {
    this.manager = new Kazagumo(
      {
        defaultSearchEngine: 'youtube',
        plugins: [new Plugins.PlayerMoved(Bot.app)],
        send: (guildId, payload) => {
          const guild = Bot.app.guilds.cache.get(guildId);
          if (guild) guild.shard.send(payload);
        },
      },
      new Connectors.DiscordJS(Bot.app),
      Nodes,
    );

    this.manager.shoukaku.on('ready', async () => {
      console.log(
        'Music - Connected to node successfully. Music player ready!',
      );
      this.online = true;
    });

    this.manager.shoukaku.on('disconnect', async () => {
      // Disconnect all active players
      for (const player of this.manager.players.values()) {
        player.disconnect();
      }

      this.online = false;
      console.log('Music - Disconnected from node. Music player offline!');
    });

    this.manager.shoukaku.on('error', async (name: string, error) => {
      Bot.catchError(error);
    });

    this.manager.on(
      'playerStart',
      async (player: KazagumoPlayer, track: KazagumoTrack) => {
        if (!player.textId) return;

        if (player.loop === 'track') {
          player.setLoop('none');
        }

        const musicTextChannel = Bot.app.channels.cache.get(
          player.textId,
        ) as TextChannel;
        if (!musicTextChannel) return;

        this.showNowPlaying(track, player, musicTextChannel, undefined);
      },
    );

    this.manager.on('playerEmpty', (player: KazagumoPlayer) => {
      if (!player.textId) return;

      const musicTextchannl = Bot.app.channels.cache.get(
        player.textId,
      ) as TextChannel;
      if (!musicTextchannl) return;

      musicTextchannl
        .send(`Disconnected player due to inactivity. Goodbye! :wave:`)
        .then((msg) => player.data.set('message', msg));

      player.destroy();
    });
  }

  public isOnline(): boolean {
    return this.online;
  }

  public async fetchAndPlayMusic(
    search: string,
    interaction: CommandInteraction,
  ): Promise<void> {
    if (!interaction || !interaction.guild?.id) return;

    const currentMember: string | undefined = interaction.member?.user?.id;
    if (!currentMember) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild.id,
    );
    let currentChannel: string = BotUtil.config.getValue(
      'music.channel',
      interaction.guild.id,
    );

    Bot.app.guilds.cache.forEach(async (guild) => {
      const member: GuildMember | undefined =
        guild.members.cache.get(currentMember);
      if (!member) return;
      if (!member.voice.channelId) return;

      const voiceChannel: string = member.voice.channelId;
      if (voiceChannel !== '') {
        currentChannel = voiceChannel;
      }
    });

    // Make sure we have some type of channel otherwise we will mess up the music player.
    if (currentChannel == '') {
      await interaction.reply({
        content:
          'You are not in a channel or the default music channel has not been configured!',
        ephemeral: true,
      });
      return;
    }

    const isPlaylist: boolean = BotUtil.isMusicPlaylist(search);

    await interaction.deferReply();

    const songs: KazagumoSearchResult = await this.manager.search(search);
    if (!songs.tracks || songs.tracks.length < 1) {
      await interaction.reply({
        content: 'Unable to locate track. Please try again!',
        ephemeral: true,
      });
      return;
    }

    await this.addPlayerToChannel(
      currentChannel,
      currentPlayer,
      isPlaylist,
      songs,
      interaction,
    );
  }

  public async listSongQueue(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction || !interaction.guild?.id) return;

    const currentMember: string | undefined = interaction.member?.user?.id;
    if (!currentMember) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild?.id,
    );
    if (!currentPlayer)
      return await interaction.reply({
        content: `The music bot is not currently connected! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    const currentQueue: KazagumoQueue = currentPlayer.queue;
    if (currentQueue.length >= 1) {
      let message = '';
      for (let index = 0; index < currentQueue.length; index++) {
        const song = currentQueue[index];
        if (!song) continue;

        const currentSongNumber: number = +index + 1;
        message += `${currentSongNumber}. ${song.title}\n`;
      }

      if (message.length >= 2000)
        return await interaction.reply({
          content: `The queue is too large to display..\n\nYou have ${currentQueue.length} songs waiting to be played! ${Bot.getStatusEmoji()}`,
          ephemeral: true,
        });

      const queueEmbed: EmbedBuilder = new EmbedBuilder()
        .setTitle(`Current Song Queue`)
        .setDescription(message)
        .setFooter({
          text: 'Sparrow Music Bot',
          iconURL: Bot.app.user!.avatarURL() || undefined,
        })
        .setColor(resolveColor('Random'));

      return await interaction.reply({ embeds: [queueEmbed] });
    }
  }

  public async skipSongInQueue(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction || !interaction.guild?.id) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild.id,
    );
    if (!currentPlayer) return;

    const message = `Skipped the current song! ${Bot.getStatusEmoji()}`;

    if (currentPlayer.queue.length < 1) {
      currentPlayer.disconnect();

      return await interaction.reply(
        'There are no songs remaining in the queue! Goodbye! :wave:',
      );
    }

    currentPlayer.skip();

    return await interaction.reply({ content: message, ephemeral: true });
  }

  public async pauseMusicPlayer(
    pause: boolean,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction || !interaction.guild?.id) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild?.id,
    );
    if (!currentPlayer) return;

    currentPlayer.pause(pause);
    if (pause) {
      return await interaction.reply({
        content: `Music player has been paused! ${Bot.getStatusEmoji()}`,
        ephemeral: true,
      });
    } else {
      return await interaction.reply({
        content: `Music player has been resumed! ${Bot.getStatusEmoji()}`,
        ephemeral: true,
      });
    }
  }

  public async stopMusicPlayer(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction || !interaction.guild?.id) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild.id,
    );
    if (!currentPlayer)
      return await interaction.reply({
        content: `The music bot is not currently connected! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    if (currentPlayer.state == PlayerState.CONNECTED) {
      currentPlayer.disconnect();
    }

    currentPlayer.destroy();

    return await interaction.reply('Goodbye! :wave:');
  }

  public async repeatTrack(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction || !interaction.guild?.id) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild.id,
    );
    if (!currentPlayer)
      return await interaction.reply({
        content: `The music bot is not currently connected! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    currentPlayer.setLoop('track');
    return await interaction.reply({
      content: `The current song will replay! ${Bot.getStatusEmoji()}`,
      ephemeral: true,
    });
  }

  public async changeVolume(
    interaction: CommandInteraction,
    volume: number,
  ): Promise<InteractionResponse<boolean> | void> {
    if (!interaction || !interaction.guild?.id) return;
    if (!volume) return;
    if (volume < 0 || volume > 100) return;

    const currentPlayer: KazagumoPlayer | undefined = this.manager.players.get(
      interaction.guild.id,
    );
    if (!currentPlayer)
      return await interaction.reply({
        content: `The music bot is not currently connected! ${Bot.getStatusEmoji(true)}`,
        ephemeral: true,
      });

    currentPlayer.setVolume(volume);
    return await interaction.reply(
      `Music player volume has been changed to ` +
        volume +
        `%! ${Bot.getStatusEmoji()}`,
    );
  }

  private async playSong(
    player: KazagumoPlayer | undefined,
    interaction: CommandInteraction,
  ) {
    if (!interaction) return;
    if (!player) return;

    await player.play();
  }

  private async showNowPlaying(
    song: KazagumoTrack,
    player: KazagumoPlayer,
    channel?: TextChannel,
    interaction?: CommandInteraction,
  ) {
    const buttonLabel: string = BotUtil.shortText(`${song.title}`, 60);

    const musicLink = new ButtonBuilder()
      .setLabel(buttonLabel)
      .setStyle(ButtonStyle.Link);

    if (song.realUri) {
      musicLink.setURL(song.realUri);
    }

    const row =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
        musicLink,
      ]);

    if (channel) {
      if (player.data.get('message')) {
        await player.data.get('message')?.edit({
          content: `Now playing: ${buttonLabel}! ${Bot.getStatusEmoji()}⠀`,
          components: [row],
        });
      } else {
        await channel
          .send({
            content: `Now playing: ${buttonLabel}! ${Bot.getStatusEmoji()}⠀`,
            components: [row],
          })
          .then((msg) => player.data.set('message', msg));
      }
    } else if (interaction) {
      await interaction.editReply({ components: [row] });
    }
  }

  private async addPlayerToChannel(
    currentChannel: string,
    currentPlayer: KazagumoPlayer | undefined,
    playlist: boolean,
    songs: KazagumoSearchResult,
    interaction: CommandInteraction,
  ) {
    const interactionGuild: string | undefined = interaction.guild?.id;
    if (!interactionGuild) return;

    const interactionTextChannel: string | undefined = interaction.channel?.id;
    if (!interactionTextChannel) return;

    try {
      currentPlayer = currentPlayer
        ? currentPlayer
        : await this.manager.createPlayer({
            guildId: interactionGuild,
            voiceId: currentChannel,
            textId: interactionTextChannel,
            deaf: true,
          });

      if (playlist && songs.tracks.length > 1) {
        for (const song of songs.tracks) {
          currentPlayer.queue.add(song);
        }

        await interaction.editReply(
          `Added ${songs.tracks.length} songs to the queue! ${Bot.getStatusEmoji()}`,
        );
      } else {
        if (!songs.tracks[0]) return;

        currentPlayer.queue.add(songs.tracks[0]);
        await interaction.editReply(
          `Added ${songs.tracks[0].title} to the queue! ${Bot.getStatusEmoji()}`,
        );
      }

      if (currentPlayer && !currentPlayer.playing) {
        await BotUtil.wait(250);

        await this.playSong(currentPlayer, interaction);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message !== 'Player is already connected'
      ) {
        Bot.catchError(error);
        await interaction.editReply(
          `Something went wrong when trying to connect to the channel! Please try again. ${Bot.getStatusEmoji(true)}`,
        );
        return;
      }
    }
  }
}
