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

import { Bot } from './bot';
import { BotUtil } from '../util';
import {
  ChannelType,
  CommandInteraction,
  ApplicationCommandType,
  Interaction,
  EmbedBuilder,
  InteractionResponse,
  InteractionType,
} from 'discord.js';
import { Config } from './config';
import {
  InteractionCommand,
  InteractionCommandPayload,
  InteractionComponent,
  InteractionOptions,
} from './discord/helpers';
import axios from 'axios';
import { glob } from 'glob';

type InteractionCommandList = InteractionCommand[];
type InteractionComponentList = InteractionComponent[];

class InteractionsAPI {
  private arrCommands: InteractionCommandList;
  private arrComponents: InteractionComponentList;

  constructor() {
    this.arrCommands = [];
    this.arrComponents = [];
  }

  // Call this when its time to register all the commands with Discord.
  public async setup() {
    // Register all the commands with Discord.
    await this.registerCommands();

    // Register all the components we plan on interacting with from Discord.
    await this.registerComponents();
  }

  public async sendOptionDisabled(
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    return await interaction.reply({
      content: `This option is currently disabled. ${Bot.getStatusEmoji(true)}`,
      ephemeral: true,
    });
  }

  public async deleteAllCommands(): Promise<void> {
    try {
      const rGetResponse = await axios.get(
        `https://discord.com/api/v8/applications/${Config.botClientID}/commands`,
        {
          headers: {
            Authorization: `Bot ${Config.botToken}`,
          },
        },
      );

      if (!rGetResponse) return;

      for (const command of rGetResponse.data) {
        await BotUtil.wait(5000); // New Discord rate Limits make us delay each command by about 5 seconds to avoid the rate limit.

        const rPostResponse = await axios.delete(
          `https://discord.com/api/v8/applications/${Config.botClientID}/commands/${command.id}`,
          {
            headers: {
              Authorization: `Bot ${Config.botToken}`,
            },
          },
        );

        if (rPostResponse)
          console.warn(
            `Discord - Command deleted. ID ${command.id} - Name ${command.name}`,
          );
      }
    } catch (error) {
      Bot.catchError(error);
    }
  }

  public async deleteAllGuildCommands(guild_id: string): Promise<void> {
    try {
      const rGetResponse = await axios.get(
        `https://discord.com/api/v8/applications/${Config.botClientID}/guilds/${guild_id}/commands`,
        {
          headers: {
            Authorization: `Bot ${Config.botToken}`,
          },
        },
      );

      if (!rGetResponse) return;

      for (const command of rGetResponse.data) {
        await BotUtil.wait(5000); // New Discord rate Limits make us delay each command by about 5 seconds to avoid the rate limit.

        const rPostResponse = await axios.delete(
          `https://discord.com/api/v8/applications/${Config.botClientID}/guilds/${guild_id}/commands/${command.id}`,
          {
            headers: {
              Authorization: `Bot ${Config.botToken}`,
            },
          },
        );

        if (rPostResponse)
          console.warn(
            `Discord - Guild command deleted. ID ${command.id} - Name ${command.name}`,
          );
      }
    } catch (error) {
      Bot.catchError(error);
    }
  }

  public async deleteCommand(name: string, guild?: string): Promise<void> {
    try {
      const url = guild
        ? `https://discord.com/api/v8/applications/${Config.botClientID}/guilds/${guild}/commands`
        : `https://discord.com/api/v8/applications/${Config.botClientID}/commands`;

      const rGetResponse = await axios.get(url, {
        headers: {
          Authorization: `Bot ${Config.botToken}`,
        },
      });

      if (!rGetResponse) return;

      for (const command of rGetResponse.data) {
        if (command.name !== name) continue;

        const rPostResponse = await axios.delete(url + `/${command.id}`, {
          headers: {
            Authorization: `Bot ${Config.botToken}`,
          },
        });

        if (rPostResponse)
          console.warn(
            `Discord - Deleted Discord slash command with ID ${command.id}`,
          );
      }
    } catch (error) {
      Bot.catchError(error);
    }
  }

  public async createCommand(
    name: string,
    type: number,
    desc: string,
    options: InteractionOptions[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runCommand: (...args: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hasPermission: (...args: any[]) => boolean | Promise<boolean>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runAction: ((...args: any) => void) | undefined,
    dmDisabled: boolean,
  ) {
    this.arrCommands.push({
      name: name,
      type: type,
      description: desc,
      options: options,
      runCommand: runCommand,
      hasPermission: hasPermission,
      runAction: runAction,
      disableDM: dmDisabled,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async createComponent(id: string, runAction: (...args: any) => void) {
    this.arrComponents.push({ id: id, runAction: runAction });
  }

  public async commandHandler(interaction: Interaction): Promise<void> {
    const isCommand = interaction.type == InteractionType.ApplicationCommand;
    const isAutoComplete =
      interaction.type == InteractionType.ApplicationCommandAutocomplete;

    // If Discord gave us a component, make sure we handle it by it's own customId.
    if (
      interaction.isButton() ||
      interaction.type == InteractionType.ModalSubmit ||
      interaction.isStringSelectMenu()
    ) {
      for (const component of this.arrComponents) {
        if (component.id !== interaction.customId) continue;

        component.runAction(interaction);
        return;
      }
    }

    if (!isCommand && !interaction.isContextMenuCommand() && !isAutoComplete)
      return;

    for (const command of this.arrCommands) {
      if (interaction.commandName !== command.name) continue;

      if (isAutoComplete) {
        if (!command.runAction) return;

        command.runAction(interaction);
        return;
      }

      const dmInteraction = this.isDMInteraction(interaction);
      const currentGuild: string | undefined = interaction.guild?.id;

      if (dmInteraction && command.disableDM) {
        interaction.reply('Hey :wave:, This command is not supported in DMs.');

        return;
      }

      if (
        currentGuild &&
        !BotUtil.config.isGuildSetup(currentGuild) &&
        interaction.commandName !== 'setup' &&
        !dmInteraction
      ) {
        const embed = new EmbedBuilder()
          .setDescription(
            `SparrowBot has not been setup yet. You cannot use any of the bot commands until it has been setup. If you are the server owner, please run /setup`,
          )
          .setFooter({
            text: 'SparrowBot',
            iconURL: Bot.app.user!.avatarURL() || undefined,
          })
          .setTimestamp()
          .setColor(0xa62019);

        await interaction.reply({ embeds: [embed] });
        continue;
      }

      if (!command.hasPermission(interaction)) {
        await interaction.reply({
          content:
            'You do not have the permission to use the /' +
            command.name +
            ' command',
          ephemeral: true,
        });
        continue;
      }

      command.runCommand(interaction);
    }
  }

  public isDMInteraction(interaction: CommandInteraction): boolean {
    const channel = Bot.app.channels.cache.find(
      (channel) => channel.id === `${interaction.channelId}`,
    );

    // If the channel has not come back, then assume we are inside of a DM.
    if (!channel) return true;

    return channel.type === ChannelType.DM;
  }

  private async registerCommands() {
    const commandDir = `${BotUtil.baseDir}/Modules/**/commands/*.**`;
    const commandFile: string[] = await glob(commandDir);

    const rCommandList = await Bot.app.application?.commands.fetch();
    if (!rCommandList) return;

    const commandArray: InteractionCommandPayload[] = [];
    const guildMap = new Map<string, InteractionCommandPayload[]>();

    let count = 0;
    for (const file of commandFile) {
      if (file.endsWith('.d.ts')) continue;
      if (file.endsWith('.map')) continue;

      try {
        let command = (await import(file)) as InteractionCommand;
        if (command.disabled) continue;

        // Setup config command options via selects so we can make the end-user experience better.
        if (command.name == 'config') {
          command = await BotUtil.config.setupConfigCommand(command);
        }

        if (!command.options) {
          command.options = [];
        }

        const disableDM = command.disableDM ? command.disableDM : false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runAction: ((...args: any) => void) | undefined =
          command.runAction ? command.runAction : undefined;

        let commandData: InteractionCommandPayload = {
          name: command.name,
          type: command.type,
          description: command.description,
          options: command.options,
        };

        if (command.type == ApplicationCommandType.ChatInput) {
          await this.createCommand(
            command.name,
            command.type,
            command.description,
            command.options,
            command.runCommand,
            command.hasPermission,
            runAction,
            disableDM,
          );
        } else if (
          command.type == ApplicationCommandType.User ||
          command.type == ApplicationCommandType.Message
        ) {
          await this.createCommand(
            command.name,
            command.type,
            command.description,
            command.options,
            command.runCommand,
            command.hasPermission,
            runAction,
            disableDM,
          );

          commandData = {
            name: command.name,
            type: command.type,
            description: '',
          };
        }

        count = count + 1;

        if (command.guild) {
          if (!guildMap.has(command.guild)) {
            guildMap.set(command.guild, []);
          }

          const guildCommandArray:
            | {
                name: string;
                type: number;
                description?: string;
                options?: InteractionOptions[];
              }[]
            | undefined = guildMap.get(command.guild);
          if (!guildCommandArray) continue;

          guildCommandArray.push(commandData);
        } else {
          commandArray.push(commandData);
        }
      } catch (error) {
        Bot.catchError(error);
      }
    }

    for (const [key, data] of guildMap.entries()) {
      try {
        const batchUpd = await Bot.app.guilds.cache
          .get(BotUtil.stringToSnowflake(key))
          ?.commands.set(data);
        if (!batchUpd) continue;

        console.log(
          `Discord - Registered Guild ${BotUtil.stringToSnowflake(key)} Application Commands.`,
        );
      } catch (error) {
        console.warn(
          `Discord - Failed to batch edit guild application commands. Check sentry for details.`,
        );

        Bot.catchError(error);
      }
    }

    try {
      const batchUpd = await Bot.app.application?.commands.set(commandArray);
      if (!batchUpd)
        throw new Error(
          'Failed to update global application commands. No response from Discord received.',
        );

      console.log(`Discord - Registered ${count} Application Commands`);
    } catch (error) {
      console.warn(
        `Discord - Failed to batch edit global commands. Check sentry for details.`,
      );

      Bot.catchError(error);
    }
  }

  private async registerComponents() {
    const componentDir = `${BotUtil.baseDir}/Modules/**/components/*.**`;
    const componentFile: string[] = await glob(componentDir);

    let count = 0;
    for (const file of componentFile) {
      if (file.endsWith('.d.ts')) continue;
      if (file.endsWith('.map')) continue;

      try {
        const component = (await import(file)) as InteractionComponent;
        const componentID: string = component.id;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const componentAction: ((...args: any) => void) | undefined =
          component.runAction;

        if (!componentAction || componentID == '') {
          console.error(`Discord - Malformed component file: ${file}`);
          continue;
        }

        this.arrComponents.push({
          id: componentID,
          runAction: componentAction,
        });
        count++;
      } catch (error) {
        Bot.catchError(error);
      }
    }

    console.log(`Discord - Registered ${count} Interaction Components`);
  }
}

export const Interactions = new InteractionsAPI();
