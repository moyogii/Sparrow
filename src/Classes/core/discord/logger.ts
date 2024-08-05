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

import {
  EmbedBuilder,
  Message,
  GuildMember,
  Role,
  Channel,
  TextChannel,
  DMChannel,
  NewsChannel,
  PartialGuildMember,
  PartialMessage,
  VoiceChannel,
  CategoryChannel,
  User,
  Collection,
  ChannelType,
  ForumChannel,
  ThreadChannel,
  ReactionEmoji,
  GuildEmoji,
} from 'discord.js';
import { BotUtil } from '../../util';
import { Bot } from '../bot';

class Logger {
  public async checkPendingMember(
    oldGuildUser: GuildMember | PartialGuildMember,
    newGuildUser: GuildMember | PartialGuildMember,
  ): Promise<void> {
    const membershipRole: Role | undefined =
      newGuildUser.guild.roles.cache.find(
        (role) =>
          role.id ==
          BotUtil.config.getValue(
            'discord.membergaterole',
            newGuildUser.guild.id,
          ),
      );
    if (!membershipRole) return;

    if (oldGuildUser.pending == true && newGuildUser.pending == false) {
      await newGuildUser.roles.add(membershipRole).catch((err) => {
        if (err) {
          // TODO: Change this to DM the owner of the server about a permission problem
        }
      });
    }
  }

  public async logChannelCreated(
    channel: Channel,
    guild_id: string,
  ): Promise<void> {
    if (channel.type === ChannelType.DM) return;

    const auditChannel = this.findAuditChannel(guild_id);
    if (!auditChannel) return;

    let channelType = '';
    switch (channel.type) {
      case ChannelType.GuildText:
        channelType = 'Text channel';
        break;
      case ChannelType.GuildVoice:
        channelType = 'Voice channel';
        break;
      case ChannelType.GuildCategory:
        channelType = 'Category';
        break;
    }

    const embed = new EmbedBuilder()
      .setTitle(`**${channelType} created**`)
      .setDescription(`${channel}`)
      .setFooter({ text: 'SparrowBot', iconURL: Bot.getIconURL() })
      .setTimestamp()
      .setColor(0x00d166);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logChannelDeleted(
    channel: Channel,
    guild_id: string,
  ): Promise<void> {
    if (channel.type === ChannelType.DM) return;

    const auditChannel = this.findAuditChannel(guild_id);
    if (!auditChannel) return;
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildVoice &&
      channel.type !== ChannelType.GuildCategory
    )
      return;

    let channelType = '';
    switch (channel.type) {
      case ChannelType.GuildText:
        channelType = 'Text channel';
        break;
      case ChannelType.GuildVoice:
        channelType = 'Voice channel';
        break;
      case ChannelType.GuildCategory:
        channelType = 'Category';
        break;
    }

    let channelName: string | undefined = 'N/A';
    if (
      channel instanceof TextChannel ||
      channel instanceof VoiceChannel ||
      channel instanceof CategoryChannel
    ) {
      channelName = channel.name;
    }

    const embed = new EmbedBuilder()
      .setTitle(`**${channelType} deleted**`)
      .setDescription(`${channelName}`)
      .setFooter({ text: 'SparrowBot', iconURL: Bot.getIconURL() })
      .setTimestamp()
      .setColor(0xdd6053);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logRoleUpdated(oldRole: Role, newRole: Role): Promise<void> {
    const auditChannel = this.findAuditChannel(newRole.guild.id);

    if (!auditChannel) return;
    if (oldRole.name == newRole.name) return;

    const embed = new EmbedBuilder()
      .setTitle(`**Role name updated**`)
      .setDescription(`${oldRole.name} → ${newRole.name}`)
      .setFooter({ text: 'SparrowBot', iconURL: Bot.getIconURL() })
      .setTimestamp()
      .setColor(0xf8c300);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logRoleDeleted(role: Role): Promise<void> {
    const auditChannel = this.findAuditChannel(role.guild.id);
    if (!auditChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(`**Role removed**`)
      .setDescription(`${role.name}`)
      .setFooter({ text: 'SparrowBot', iconURL: Bot.getIconURL() })
      .setTimestamp()
      .setColor(0xdd6053);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logRoleCreated(role: Role): Promise<void> {
    const auditChannel = this.findAuditChannel(role.guild.id);
    if (!auditChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(`**Role created**`)
      .setDescription(`A new role has been created.`)
      .setFooter({ text: 'SparrowBot', iconURL: Bot.getIconURL() })
      .setTimestamp()
      .setColor(0x00d166);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logMessageUpdate(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
  ): Promise<void> {
    const auditChannel = this.findAuditChannel(newMessage.guild!.id);
    if (!auditChannel) return;
    if (
      oldMessage.content == newMessage.content ||
      (oldMessage.author &&
        oldMessage.author.bot &&
        newMessage.author &&
        newMessage.author.bot)
    )
      return;

    const messageChannel: TextChannel = newMessage.channel as TextChannel;
    if (!oldMessage.author) return;

    const embed = new EmbedBuilder()
      .setTitle(`**Message edited in #${messageChannel.name}**`)
      .setDescription(`${oldMessage} → ${newMessage}`)
      .setFooter({
        text: oldMessage.author?.tag,
        iconURL: oldMessage.author?.avatarURL() || undefined,
      })
      .setTimestamp()
      .setColor(0xf8c300);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logMessageDeleted(
    message: Message | PartialMessage,
  ): Promise<void> {
    const auditChannel = this.findAuditChannel(message.guild!.id);
    if (!auditChannel) return;
    if (
      message.content == '' ||
      (message.author && message.author.bot) ||
      !message.guild
    )
      return;

    const messageChannel: TextChannel = message.channel as TextChannel;
    const embed = new EmbedBuilder()
      .setTitle(`**Message deleted in #${messageChannel.name}**`)
      .setDescription(`${message}`)
      .setFooter({
        text: 'Wrote by ' + message.author!.tag,
        iconURL: message.author!.avatarURL() || undefined,
      })
      .setTimestamp()
      .setColor(0xdd6053);

    await this.sendEmbed(embed, auditChannel);
  }

  public async logMemberUpdate(
    oldGuildUser: GuildMember | PartialGuildMember,
    newGuildUser: GuildMember | PartialGuildMember,
  ): Promise<void> {
    const auditChannel = this.findAuditChannel(newGuildUser.guild.id);
    if (!auditChannel) return;

    // Make sure that we are actually getting the guild users if we want to log anything.
    if (
      !oldGuildUser ||
      !oldGuildUser.user ||
      !newGuildUser ||
      !newGuildUser.user
    )
      return;

    if (oldGuildUser.nickname != newGuildUser.nickname) {
      const embed = new EmbedBuilder()
        .setTitle(`**Nickname changed**`)
        .setDescription(
          `${(oldGuildUser.nickname && oldGuildUser.nickname) || oldGuildUser.user.username} → ${(newGuildUser.nickname && newGuildUser.nickname) || newGuildUser.user.username}`,
        )
        .setFooter({
          text: newGuildUser.user.tag,
          iconURL: newGuildUser.user?.avatarURL() || undefined,
        })
        .setTimestamp()
        .setColor(0xf8c300);

      await this.sendEmbed(embed, auditChannel);
    } else if (oldGuildUser.roles != newGuildUser.roles) {
      const newRoles = Array.from(newGuildUser.roles.cache.values());
      const oldRoles = Array.from(oldGuildUser.roles.cache.values());

      const isNew = newRoles.length > oldRoles.length;
      const arr = (isNew && newRoles) || oldRoles;
      const arrSec = (isNew && oldRoles) || newRoles;
      const color = (isNew && 0x00d166) || 0xdd6053;
      const txt = (isNew && 'added') || 'removed';

      for (const role of arr) {
        if (arrSec.includes(role)) continue;

        const embed = new EmbedBuilder()
          .setTitle(`**Role ${txt}**`)
          .setDescription(`${role}`)
          .setFooter({
            text: newGuildUser.user.tag,
            iconURL: newGuildUser.user?.avatarURL() || undefined,
          })
          .setTimestamp()
          .setColor(color);

        await this.sendEmbed(embed, auditChannel);
      }
    }
  }

  public async deleteLinkMessage(
    message: Message | PartialMessage,
  ): Promise<void> {
    if (!message.guild) return;

    const isFilteringEnabled = BotUtil.config.getValue(
      'discord.linkfiltering',
      message.guild.id,
    );
    if (!isFilteringEnabled) return;

    const messageContent: string | null = message.content;

    if (!messageContent || !message.member) return;
    if (!BotUtil.isURL(messageContent)) return;
    if (message.author!.bot) return;

    const wlRoles: string[] = await BotUtil.config.getValue(
      'discord.linkfiltering.rolewl',
      message.guild!.id,
    );
    if (wlRoles) {
      const memberRoles: Collection<string, Role> = message.member.roles.cache;

      if (Array.isArray(wlRoles)) {
        for (const role of wlRoles) {
          if (memberRoles.has(role)) return;
        }
      } else {
        if (memberRoles.has(wlRoles)) return;
      }
    }

    const whitelistChannels: string[] = await BotUtil.config.getValue(
      'discord.linkfiltering.channelwl',
      message.guild!.id,
    );
    if (whitelistChannels) {
      for (const channel of whitelistChannels) {
        if (channel === message.channel.id) return;
      }
    }

    message.member
      .send("Hey there! :wave: Link's are disabled in this channel.")
      .catch((error) => {
        if (error.message == 'Cannot send messages to this user') return;

        Bot.catchError(error);
      });

    await message.delete();
  }

  public async logPunishment(
    inflictor: User,
    target: User,
    guild_id: string,
    punishment: string,
    reason?: string,
    time?: number,
  ): Promise<void> {
    const punishChannel: TextChannel | DMChannel | NewsChannel | undefined =
      this.getTextChannel(guild_id);
    if (!punishChannel) return;

    const inflictorName: string =
      inflictor.username + '#' + inflictor.discriminator;
    const inflictorID: string | undefined = inflictor.id;
    const inflictorAvatarHash: string | null | undefined = inflictor.avatar;
    const targetName: string = target.username + '#' + target.discriminator;

    let embedDescription = `**${punishment}** ${targetName} - (ID ${target.id})\n`;
    if (reason) embedDescription += `**Reason**: ${reason}\n`;

    if (time && time > 0)
      embedDescription += `**Length:** ${BotUtil.stringTime(time * 60)}`;

    const embed: EmbedBuilder = new EmbedBuilder()
      .setDescription(embedDescription)
      .setFooter({
        text: 'SparrowBot',
        iconURL: Bot.app.user!.avatarURL() || undefined,
      })
      .setAuthor({
        name: `${inflictorName} - (ID ${inflictorID})`,
        iconURL: `https://cdn.discordapp.com/avatars/${inflictorID}/${inflictorAvatarHash}`,
      })
      .setTimestamp()
      .setColor(0xf8c300);

    await this.sendEmbed(embed, punishChannel);
  }

  public async respondToSuggestionThread(
    thread: ThreadChannel,
    channel: ForumChannel,
  ): Promise<void> {
    if (!channel) return;

    const channelID: string = BotUtil.config.getValue(
      'discord.suggestion.channel',
      channel.guild.id,
    );
    if (!channelID) return;

    if (channel.id !== channelID) return; // If the forum channel is not the suggestion channel, get out.

    const suggestion: Message<true> | null = await thread.fetchStarterMessage();
    if (!suggestion) return;

    const agreeEmoji: GuildEmoji | ReactionEmoji | string =
      Bot.app.emojis.cache.find((emoji) => emoji.name === 'VoteAgree') || '👍';
    const disagreeEmoji: GuildEmoji | ReactionEmoji | string =
      Bot.app.emojis.cache.find((emoji) => emoji.name === 'VoteDisagree') ||
      '👎';
    const duplicateEmoji: GuildEmoji | ReactionEmoji | string =
      Bot.app.emojis.cache.find((emoji) => emoji.name === 'VoteDuplicate') ||
      '📓';

    suggestion.react(agreeEmoji);
    suggestion.react(disagreeEmoji);
    suggestion.react(duplicateEmoji); // If something has already been suggested, let someone react stating that.
  }

  public getTextChannel(guild_id: string): TextChannel | undefined {
    const punishChannelID: TextChannel | DMChannel | NewsChannel | undefined =
      BotUtil.config.getValue('discord.punishchannel', guild_id);
    if (!punishChannelID) return;

    const foundChannel = Bot.app.channels.cache.find(
      (channel) => channel.id === `${punishChannelID}`,
    );

    if (!foundChannel) return;
    if (!foundChannel.isTextBased()) return;

    return foundChannel as TextChannel;
  }

  private async sendEmbed(
    embed: EmbedBuilder,
    channel: TextChannel | DMChannel | NewsChannel,
  ) {
    await channel.send({ embeds: [embed] }).catch((err) => {
      if (err) {
        // TODO: Change this to DM the owner of the server about a permission problem
      }
    });
  }

  private findAuditChannel(guild_id: string) {
    const auditChannelID: TextChannel | DMChannel | NewsChannel | undefined =
      BotUtil.config.getValue('discord.logchannel', guild_id);
    const foundChannel = Bot.app.channels.cache.find(
      (channel) => channel.id === `${auditChannelID}`,
    );

    if (!foundChannel) return;
    if (!foundChannel.isTextBased()) return;

    return foundChannel as TextChannel;
  }
}

export const DiscordLogger = new Logger();
