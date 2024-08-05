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
} from 'discord.js';
import { Mod } from '../../moderation/moderation';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { GuildConfigurableOptions } from '../../../Classes/core/guild/helpers';

const command: InteractionCommand = {
  name: 'config',
  type: ApplicationCommandType.ChatInput,
  description: 'This allows you to modify bot config settings.',
  options: [
    {
      name: 'set',
      description: 'Modify a config value.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'setting',
          description: 'The config setting you want to modify.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: 'value',
          description: 'New value for config setting (channel/role/user)',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'get',
      description: 'Get the current config value',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'setting',
          description: 'The config setting you want the value of.',
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: 'help',
      description: 'List all config options provided by SparrowBot',
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const commandArg: string = interaction.options.getSubcommand();
      let settingArg: string | null = '';
      let isOption: GuildConfigurableOptions | undefined = undefined;

      const interactionGuild: string | undefined = interaction.guild?.id;
      if (!interactionGuild) return;

      if (interaction.options.getString('setting')) {
        settingArg = interaction.options.getString('setting');
        if (!settingArg) return;

        isOption = BotUtil.config.isOption(settingArg);
        if (!isOption && settingArg !== 'list')
          return interaction.reply({
            content: 'You have not provided a valid config setting.',
            ephemeral: true,
          });
      }

      switch (commandArg) {
        case 'get': {
          let settingValue = BotUtil.config.getValue(
            settingArg,
            interactionGuild,
          );

          if (!settingValue) settingValue = 'Not set';

          let message = '```yaml\n';
          message += `${settingArg} = ${settingValue}`;
          message += '```';

          await interaction.reply(message);
          break;
        }
        case 'help': {
          await BotUtil.config.printAll(interaction);
          break;
        }
        case 'set': {
          const valueArg: string | null =
            interaction.options.getString('value');
          if (!valueArg) return;

          await BotUtil.config.setValue(
            settingArg,
            valueArg,
            interactionGuild,
            undefined,
            interaction,
          );
          break;
        }
      }
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    return Mod.hasModPermissions(interaction, true);
  },
  disableDM: true,
};
export = command;
