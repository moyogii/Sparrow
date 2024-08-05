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

import { Interactions } from '../../../Classes/core/interactions';
import { InteractionCommand } from '../../../Classes/core/discord/helpers';
import { BotUtil } from '../../../Classes/util';
import { Osu } from '../osu';
import { Bot } from '../../../Classes/core/bot';
import { Mod } from '../../moderation/moderation';
import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  CommandInteraction,
  GuildMember,
  User,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'osu',
  type: ApplicationCommandType.ChatInput,
  description: 'Interact with osu! with these commands!',
  options: [
    {
      name: 'connect',
      description: 'Connect your osu! account to your Discord account.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'disconnect',
      description: 'Disconnect your osu! account from your Discord account.',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'profile',
      description: 'Display information about a osu! player.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description:
            'Enter the player username or id. ( No input will display your own profile )',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: 'mode',
          description: 'Enter the mode that you want to view.',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'beatmap',
      description: 'Display information about any osu! beatmap.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'link',
          description: 'Enter a link to a osu! beatmap.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'mods',
          description:
            'Enter the mods you would like to use with the beatmap. (hd, hr, hdhr, dt)',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'recent',
      description: 'Display recent scores for a osu! player.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description:
            'Enter the player username or id. ( No input will display your own )',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'rs',
      description: 'Display recent scores for a osu! player.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description:
            'Enter the player username or id. ( No input will display your own )',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'top',
      description: 'Display the top scores of a osu! player.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description:
            'Enter the player username or id. ( No input will display your own )',
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: 'track',
      description: "Track a osu! player's newest top plays. (Top 50)",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description:
            'Enter the player username or id that you want to track.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'untrack',
      description: 'Stop tracking a osu! players newest plays.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'player',
          description:
            'Enter the player username or id that you want to stop tracking.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'tracklist',
      description: 'List all osu! players being tracked in this Discord.',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const commandArg: string | undefined =
        interaction.options.getSubcommand();
      const member: User | undefined = interaction.user
        ? interaction.user
        : (interaction.member?.user as User);
      if (!(member instanceof User)) return;

      const dmInteraction = Interactions.isDMInteraction(interaction);

      // If a osu! player already exists within the bot, lets grab that as the temporary player instead.
      let playerArgument = '';
      const currentPlayer = Osu.findOsuPlayer(member.id);
      if (currentPlayer) playerArgument = currentPlayer.id;

      let player = '';
      if (interaction.options.getString('player')) {
        const playerFromCommand: string | null =
          interaction.options.getString('player');
        if (!playerFromCommand) return;

        player = await Osu.selectOsuPlayerFromArgument(playerFromCommand);
      }

      const playerToTarget: string = player != '' ? player : playerArgument;
      switch (commandArg) {
        case 'connect': {
          await Osu.connectOsuAccount(interaction);
          break;
        }
        case 'disconnect': {
          await Osu.disconnectOsuAccount(interaction);
          break;
        }
        case 'beatmap': {
          const linkArgument: string | null =
            interaction.options.getString('link');
          if (!linkArgument) return;

          if (
            !BotUtil.isURL(linkArgument) ||
            !linkArgument.includes('https://osu.ppy.sh/beatmapsets/')
          )
            return interaction.reply({
              content: `No beatmap found, please try another osu! beatmap link! ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          const beatmapID: string = linkArgument.substring(
            linkArgument.lastIndexOf('/') + 1,
          );
          const mods: string | null = interaction.options.getString('mods');
          if (mods) {
            await Osu.displayBeatmap(interaction, beatmapID, mods);
            return;
          }

          await Osu.displayBeatmap(interaction, beatmapID);
          break;
        }
        case 'profile': {
          const playMode: string | null = interaction.options.getString('mode');
          if (playMode) {
            await Osu.displayOsuProfile(interaction, playerToTarget, playMode);
            return;
          }

          await Osu.displayOsuProfile(interaction, playerToTarget);
          return;
        }
        case 'recent':
        case 'rs': {
          await Osu.displayRecentScore(interaction, playerToTarget);
          return;
        }
        case 'top': {
          await Osu.displayTop(interaction, playerToTarget);
          break;
        }
        case 'track': {
          if (dmInteraction)
            return interaction.reply({
              content: `This command is not supported in DMs. ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          if (!Mod.hasModPermissions(interaction))
            return interaction.reply({
              content: `You do not have access to this command. ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          const playerToTrack: string | null =
            interaction.options.getString('player');
          if (!playerToTrack) return;

          await Osu.addTrackedOsuPlayer(playerToTrack, interaction);
          break;
        }
        case 'untrack': {
          if (dmInteraction)
            return interaction.reply({
              content: `This command is not supported in DMs. ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          if (!Mod.hasModPermissions(interaction))
            return interaction.reply({
              content: `You do not have access to this command. ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          const playerToUnTrack: string | null =
            interaction.options.getString('player');
          if (!playerToUnTrack) return;

          await Osu.removeTrackedOsuPlayer(playerToUnTrack, interaction);
          break;
        }
        case 'tracklist': {
          if (dmInteraction)
            return interaction.reply({
              content: `This command is not supported in DMs. ${Bot.getStatusEmoji(true)}`,
              ephemeral: true,
            });

          await Osu.displayTrackedOsuPlayers(interaction);
          break;
        }
      }
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: CommandInteraction) {
    const member: User | GuildMember = interaction.user
      ? interaction.user
      : (interaction.member as GuildMember);

    return !!(interaction && member);
  },
};
export = command;
