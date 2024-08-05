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

import { Repository } from 'typeorm';
import { GuildConfigData, GuildData } from './entities';
import { BotUtil } from '../../util';
import { CommandInteraction, Role, User } from 'discord.js';
import { Bot } from '../bot';
import { InteractionCommand } from '../discord/helpers';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import {
  GuildConfigurable,
  GuildConfigurableOptions,
  GuildConfigurableOptionsList,
} from './helpers';

type GuildList = GuildConfigurable[];

const configOptionList: GuildConfigurableOptionsList = {
  'discord.logchannel': {
    name: 'Log channel',
    value: '',
    desc: 'Set the text channel that you want logs to be stored in. (This enables Discord logging)',
    type: ApplicationCommandOptionType.Role,
  },
  'discord.adminrole': {
    name: 'Admin role',
    value: '',
    desc: 'This is the admin role that controls all Admin related bot functions.',
    type: ApplicationCommandOptionType.Role,
  },
  'discord.modrole': {
    name: 'Mod role',
    value: '',
    desc: 'This is the mod role that controls all Moderator related bot functions.',
    type: ApplicationCommandOptionType.Role,
  },
  'discord.membergaterole': {
    name: 'Membergate role',
    value: '',
    desc: 'This will enable role giving when a user accepts the Rules to the Discord. (Requires Membership Gating)',
    type: ApplicationCommandOptionType.Role,
  },
  'discord.punishchannel': {
    name: 'Punishment channel',
    value: '',
    desc: 'Set the text channel that you want all punishments to be logged in. (This enable punishment logging)',
    type: ApplicationCommandOptionType.Channel,
  },
  'discord.maxwarnings': {
    name: 'Maximum warning amount',
    value: '0',
    desc: 'This allows you to set the maximum number of warnings a member can obtain before being muted. Off is 0',
    type: ApplicationCommandOptionType.Integer,
  },
  'discord.linkfiltering': {
    name: 'Link filtering',
    value: 'false',
    desc: 'This will enable/disable link filtering. (Provide true/false)',
    type: ApplicationCommandOptionType.Boolean,
  },
  'discord.linkfiltering.channelwl': {
    name: 'Link filtering channel whitelist',
    value: '',
    desc: 'Channels that are immune to Link Filtering. Requires Link filtering to be enabled.',
    type: ApplicationCommandOptionType.Channel,
  },
  'discord.linkfiltering.rolewl': {
    name: 'Link filtering role whitelist',
    value: '',
    desc: 'Roles that are immune to Link Filtering. Requires Link filtering to be enabled.',
    type: ApplicationCommandOptionType.Role,
  },
  'discord.suggestion.channel': {
    name: 'Suggestion forum channel',
    value: '',
    desc: 'Enables suggestion like reactions on messages sent in the provided forum channel. ( Approve, Deny, Repeat )',
    type: ApplicationCommandOptionType.Channel,
  },
  'music.channel': {
    name: 'Music channel',
    value: '',
    desc: 'Set the voice channel that you want the MusicBot to join if the member is not in a voice channel.',
    type: ApplicationCommandOptionType.Channel,
  },
  'osu.trackchannel': {
    name: 'Track channel',
    value: '',
    desc: "Set the channel to display a player's new Top 50 play every 2 minutes.",
    type: ApplicationCommandOptionType.Channel,
  },
  'osu.trackedplayers': {
    name: 'Tracked players',
    value: '{}',
    desc: 'Set tracked users for osu! integration.',
    type: ApplicationCommandOptionType.String,
    disabled: true,
  },
  'mangadex.followlist': {
    name: 'Follow list',
    value: '{}',
    desc: "This contains the current follow list of the entire Discord and the manga's they are following.",
    type: ApplicationCommandOptionType.String,
    disabled: true,
  },
};

export class GuildConfig {
  private arrGuilds: GuildList = [];
  private blacklistedOptions = ['osu.trackedplayers', 'mangadex.followlist'];

  public async printAll(interaction: CommandInteraction): Promise<void> {
    let message = '```yaml\n';

    message += '[SparrowBot Config Values]\n\n';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, data] of Object.entries(configOptionList)) {
      if (data.disabled) continue;

      message += `Name: ${data.name}\nDescription: ${data.desc}\n\n`;
    }
    message += '```';

    await interaction.reply(message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getValue(option: string, guild_id: string): any {
    const validOption = this.isOption(option);
    if (!validOption) return false;

    let guildOption;
    for (const guild of this.arrGuilds) {
      if (guild && guild.guild_id && guild.guild_id === guild_id) {
        guildOption = guild.options[option];
        break;
      }
    }

    return guildOption;
  }

  public async setValue(
    option: string,
    value: unknown,
    guild_id: string,
    manual?: boolean,
    interaction?: CommandInteraction,
  ): Promise<void> {
    // eslint-disable-line
    const validOption = this.isOption(option);
    if (!validOption) return;

    for (const guild of this.arrGuilds) {
      if (guild.guild_id !== guild_id) continue;
      if (!manual && option == this.blacklistedOptions[option]) continue;

      if (value === '""') {
        this.updateGuildOption(option, '', guild, guild_id, interaction);

        return;
      }

      const newValue: string | number | boolean = await this.convertValue(
        option,
        value,
      );
      if (!newValue && !BotUtil.isBoolean(newValue) && value != '') {
        if (interaction) {
          await interaction.reply({
            content: 'You have specified an invalid input type.',
            ephemeral: true,
          });
        }

        return;
      }

      this.updateGuildOption(option, newValue, guild, guild_id, interaction);
    }
  }

  public async addGuild(
    guild_id: string,
    setup: boolean,
    premium: boolean,
  ): Promise<void> {
    this.arrGuilds.push({
      guild_id: guild_id,
      options: JSON.parse('{}'),
      setup: setup,
      premium: premium,
    });

    const configDatabase = Bot.db.getRepository(GuildConfigData);
    const config = new GuildConfigData();
    config.guild_id = guild_id;
    config.data = '{}';
    config.setup = setup;
    config.premium = premium;

    await configDatabase.save(config);
  }

  public removeGuild(guild_id: string): void {
    this.arrGuilds.forEach((guild: GuildConfigurable, index: number) => {
      if (guild.guild_id !== guild_id) return;

      this.arrGuilds.splice(index, 1);
    });
  }

  public setupGuild(guild_id: string, modRole: Role, adminRole: Role): void {
    for (const guild of this.arrGuilds) {
      if (guild.guild_id !== guild_id) continue;

      guild.setup = true;
      this.saveGuildSetup(guild_id, modRole, adminRole);
    }
  }

  public isGuildSetup(guild_id: string): boolean {
    let isSetup = false;
    for (const guild of this.arrGuilds) {
      if (guild.guild_id !== guild_id) continue;

      isSetup = guild.setup;
      break;
    }
    return isSetup;
  }

  public loadConfig(data: GuildConfigData[]): void {
    for (const element of data) {
      this.arrGuilds.push({
        guild_id: element.guild_id,
        options: JSON.parse(element.data),
        setup: element.setup,
        premium: element.premium,
      });
    }
  }

  public async isUpgraded(guild_id: string): Promise<boolean> {
    return this.getBotSubscription(guild_id);
  }

  public createDefaultConfig(
    guild_id: string,
    modRole: Role,
    adminRole: Role,
  ): void {
    for (const key of Object.keys(configOptionList)) {
      for (const guild of this.arrGuilds) {
        if (guild.guild_id !== guild_id) continue;

        if (key === 'discord.modrole') {
          guild.options[key] = modRole.id;

          continue;
        }

        if (key === 'discord.adminrole') {
          guild.options[key] = adminRole.id;

          continue;
        }

        guild.options[key] = configOptionList[key].value;
      }
    }

    const updatedGuild = this.arrGuilds.find(
      (guild) => guild.guild_id === guild_id,
    );
    if (!updatedGuild) return;

    this.saveConfig(guild_id, updatedGuild.options);
  }

  public isOption(option: string): GuildConfigurableOptions | undefined {
    for (const key of Object.keys(configOptionList)) {
      const keyOption: GuildConfigurableOptions = configOptionList[key];
      if (!keyOption) continue;

      if (key === option) return keyOption;
    }

    return undefined;
  }

  public async loadGuildConfigs(): Promise<void> {
    const configDatabase: Repository<GuildConfigData> =
      Bot.db.getRepository(GuildConfigData);

    const configs: GuildConfigData[] = await configDatabase.find();
    if (!configs) return;

    this.loadConfig(configs);
  }

  public async createGuild(
    guild_id: string,
    guild_owner: string,
    name: string,
  ): Promise<void> {
    const guildDatabase = Bot.db.getRepository(GuildData);

    const guild = new GuildData();
    guild.guild_id = guild_id;
    guild.guild_owner = guild_owner;
    guild.name = name;

    await guildDatabase.save(guild);

    const ownerUser: User | undefined = Bot.app.users.cache.get(guild_owner);
    if (!ownerUser) return;

    let welcomeMessage = `Hey! :wave: Thank you for inviting SparrowBot to this Discord server! You can setup SparrowBot by running /setup and providing a moderator role and admin role.\n\n`;
    welcomeMessage +=
      'Setting up SparrowBot will allow you access to all commands within it and provides you access to all config options. ';
    welcomeMessage +=
      'You can find all of the config options by typing /config help and you can set options by typing /config set selecting an option then providing a value.';

    ownerUser.send(welcomeMessage);
    await BotUtil.config.addGuild(guild_id, false, false); // Make sure we add the guild to the guild list.
  }

  public async deleteGuild(guild_id: string): Promise<void> {
    const guildDatabase = Bot.db.getRepository(GuildData);
    const configDatabase = Bot.db.getRepository(GuildConfigData);

    const guild = await guildDatabase.findOne({
      where: { guild_id: guild_id },
    });
    const config = await configDatabase.findOne({
      where: { guild_id: guild_id },
    });
    if (!guild || !config) return;

    await guildDatabase.remove(guild);
    await configDatabase.remove(config);
    BotUtil.config.removeGuild(guild_id); // Remove the guild from the active guild list
  }

  public async getGuildCreated(guild_id: string): Promise<boolean> {
    const guildDatabase = Bot.db.getRepository(GuildData);
    const guild = await guildDatabase.findOne({
      where: { guild_id: guild_id },
    });

    if (guild) return true;
    else return false;
  }

  public async setupConfigCommand(
    command: InteractionCommand,
  ): Promise<InteractionCommand> {
    if (!command.options) return command;

    for (const option of command.options) {
      if (option.name == 'set' || option.name == 'get') {
        if (!option.options) continue;

        for (const nestedOption of option.options) {
          if (nestedOption.name !== 'setting') continue;

          nestedOption.choices = [];
          for (const [key, data] of Object.entries(configOptionList)) {
            if (data.disabled) continue;

            nestedOption.choices.push({ name: data.name, value: key });
          }
        }
      }
    }

    return command;
  }

  private async updateGuildOption(
    option: string,
    value: string | number | boolean,
    guild: GuildConfigurable,
    guild_id: string,
    interaction: CommandInteraction | undefined,
  ) {
    if (!guild) return;

    guild.options[option] = value;
    this.saveConfig(guild_id, guild.options);

    if (interaction) {
      await interaction.reply({
        content:
          'Successfully set the value of **' +
          option +
          '** to **' +
          value +
          '**.',
        ephemeral: true,
      });
    }
  }

  private async saveConfig(guild_id: string, data: unknown) {
    // eslint-disable-line
    const configDatabase = Bot.db.getRepository(GuildConfigData);

    const config = await configDatabase.findOne({
      where: { guild_id: guild_id },
    });
    if (!config) return;

    config.data = JSON.stringify(data);
    await configDatabase.save(config);
  }

  private async saveGuildSetup(
    guild_id: string,
    modRole: Role,
    adminRole: Role,
  ) {
    const configDatabase = Bot.db.getRepository(GuildConfigData);

    const config = await configDatabase.findOne({
      where: { guild_id: guild_id },
    });
    if (!config) return;

    BotUtil.config.createDefaultConfig(guild_id, modRole, adminRole);
    config.setup = true;
    await configDatabase.save(config);
  }

  private async getBotSubscription(guild_id: string) {
    const configDatabase = Bot.db.getRepository(GuildConfigData);

    const config = await configDatabase.findOne({
      where: { guild_id: guild_id },
    });
    if (!config) return false;

    return config.premium;
  }

  private async convertValue(
    option: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
  ) {
    for (const [key, data] of Object.entries(configOptionList)) {
      if (option !== key) continue;

      if (
        data.type === ApplicationCommandOptionType.Role ||
        data.type === ApplicationCommandOptionType.Channel
      ) {
        if (!BotUtil.isRoleOrChannel(value)) return;

        const filteredValue: string = value.replace(/<|@|#|&|!|&/g, '');
        const values = filteredValue.split('>');
        if (values.length > 2) {
          const list: string[] = [];
          for (const value of values) {
            if (value === '') continue;

            list.push(value);
          }

          value = list;
        } else {
          value = values[0];
        }

        break;
      }

      if (data.type === ApplicationCommandOptionType.Integer) {
        if (!BotUtil.isNumber(value)) return;

        value = Number(value);
        break;
      }

      if (data.type === ApplicationCommandOptionType.Boolean) {
        if (!BotUtil.isBoolean(value)) return;

        value = JSON.parse(value);
        break;
      }
    }

    return value;
  }
}
