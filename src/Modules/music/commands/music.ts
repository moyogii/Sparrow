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

const command: InteractionCommand = {
  name: 'music',
  type: ApplicationCommandType.ChatInput,
  description: 'This allows you to play music through the bot.',
  options: [
    {
      name: 'play',
      description: 'Play a song or playlist!',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'song',
          description: 'Specify the song or playlist that you want to play.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'skip',
      description: 'Skip the current song or amount of songs in a queue.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'stop',
      description: 'Stop the music bot, and disconnect from the channel.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'repeat',
      description: 'Replay the current track.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'volume',
      description: 'Volume you want the bot to play at (0-100%).',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'amount',
          description: 'Specify a volume amount (0-100%).',
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    },
    {
      name: 'list',
      description: 'Lists the current songs in the queue if there are any.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'pause',
      description: 'Pause the current song playing.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'resume',
      description: 'Unpause the current song and continue playing.',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const commandArg: string | null = interaction.options.getSubcommand();
      if (!commandArg) return;

      if (!Bot.music.isOnline()) {
        await interaction.reply({
          content: 'Music player is currently offline. Try again later!',
          ephemeral: true,
        });
        return;
      }

      switch (commandArg) {
        case 'play': {
          const songArgument = interaction.options.getString('song');
          if (!songArgument) return;

          await Bot.music.fetchAndPlayMusic(songArgument, interaction);
          break;
        }
        case 'skip': {
          await Bot.music.skipSongInQueue(interaction);
          break;
        }
        case 'stop': {
          await Bot.music.stopMusicPlayer(interaction);
          break;
        }
        case 'repeat': {
          await Bot.music.repeatTrack(interaction);
          break;
        }
        case 'volume': {
          const volumeArgument = interaction.options.getInteger('amount');
          if (!volumeArgument) return;

          await Bot.music.changeVolume(interaction, volumeArgument);
          break;
        }
        case 'list': {
          await Bot.music.listSongQueue(interaction);
          break;
        }
        case 'pause': {
          await Bot.music.pauseMusicPlayer(true, interaction);
          break;
        }
        case 'resume': {
          await Bot.music.pauseMusicPlayer(false, interaction);
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
  disableDM: true,
};
export = command;
