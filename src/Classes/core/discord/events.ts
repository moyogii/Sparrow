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
  Message,
  GuildMember,
  Role,
  PartialGuildMember,
  PartialMessage,
  MessageReaction,
  User,
  Guild,
  PartialMessageReaction,
  GuildBan,
  GuildAuditLogs,
  ChannelType,
  AuditLogEvent,
  Channel,
  ThreadChannel,
  ForumChannel,
} from 'discord.js';
import { BotUtil } from '../../util';
import { Bot } from '../bot';
import { DiscordLogger } from './logger';
import { Interactions } from '../interactions';

class Events {
  public setup() {
    Bot.app.on('interactionCreate', (interaction) => {
      Interactions.commandHandler(interaction);
    });

    Bot.app.on('guildBanAdd', async (ban: GuildBan) => {
      const fetchedLogs: GuildAuditLogs<AuditLogEvent.MemberBanAdd> =
        await ban.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberBanAdd,
        });

      const banLog = fetchedLogs.entries.first();
      if (!banLog) return;

      const executor: User | null = banLog.executor;
      const target: User | null = banLog.target as User;
      if (!executor || !target) return;

      if (!executor && !target) return;
      if (target.id !== ban.user.id) return;

      const banReason: string = banLog.reason || 'No reason provided';

      await DiscordLogger.logPunishment(
        executor,
        target,
        ban.guild.id,
        'Banned',
        banReason,
      );
    });

    Bot.app.on('guildBanRemove', async (ban: GuildBan) => {
      const fetchedLogs: GuildAuditLogs<AuditLogEvent.MemberBanRemove> =
        await ban.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberBanRemove,
        });

      const banLog = fetchedLogs.entries.first();
      if (!banLog) return;

      const executor: User | null = banLog.executor;
      const target: User | null = banLog.target as User;
      if (!executor || !target) return;
      if (target.id !== ban.user.id) return;

      const banReason: string = banLog.reason || 'No reason provided';

      await DiscordLogger.logPunishment(
        executor,
        target,
        ban.guild.id,
        'Unbanned',
        banReason,
      );
    });

    Bot.app.on('channelCreate', (channel: Channel) => {
      if (channel.isDMBased()) return; // We dont want to log DM channels.
      if (!channel.guild) return;

      Bot.app.guilds.cache.forEach((guild) => {
        if (!BotUtil.config.getValue('discord.logchannel', guild.id)) return;
        if (guild.id !== channel.guild.id) return;

        DiscordLogger.logChannelCreated(channel, guild.id);
      });
    });

    Bot.app.on('channelDelete', (channel: Channel) => {
      if (channel.isDMBased()) return; // We dont want to log DM channels.
      if (!channel.guild) return;

      Bot.app.guilds.cache.forEach((guild) => {
        if (!BotUtil.config.getValue('discord.logchannel', guild.id)) return;
        if (guild.id !== channel.guild.id) return;

        DiscordLogger.logChannelDeleted(channel, guild.id);
      });
    });

    Bot.app.on(
      'guildMemberUpdate',
      (
        oldGuildUser: GuildMember | PartialGuildMember,
        newGuildUser: GuildMember,
      ) => {
        DiscordLogger.checkPendingMember(oldGuildUser, newGuildUser);

        if (
          !BotUtil.config.getValue('discord.logchannel', newGuildUser.guild.id)
        )
          return;

        DiscordLogger.logMemberUpdate(oldGuildUser, newGuildUser);
      },
    );

    Bot.app.on('messageDelete', (message: Message | PartialMessage) => {
      if (!message.guild?.id) return;
      if (message.channel.type === ChannelType.DM) return;
      if (!BotUtil.config.getValue('discord.logchannel', message.guild.id))
        return;

      DiscordLogger.logMessageDeleted(message);
    });

    Bot.app.on(
      'messageUpdate',
      (
        oldMessage: Message | PartialMessage,
        newMessage: Message | PartialMessage,
      ) => {
        if (!newMessage.guild?.id) return;
        if (newMessage.channel.type === ChannelType.DM) return;
        if (!BotUtil.config.getValue('discord.logchannel', newMessage.guild.id))
          return;

        DiscordLogger.logMessageUpdate(oldMessage, newMessage);
      },
    );

    Bot.app.on('roleCreate', (role: Role) => {
      if (!BotUtil.config.getValue('discord.logchannel', role.guild.id)) return;

      DiscordLogger.logRoleCreated(role);
    });

    Bot.app.on('roleDelete', (role: Role) => {
      if (!BotUtil.config.getValue('discord.logchannel', role.guild.id)) return;

      DiscordLogger.logRoleDeleted(role);
    });

    Bot.app.on('roleUpdate', (oldRole: Role, newRole: Role) => {
      if (!BotUtil.config.getValue('discord.logchannel', newRole.guild.id))
        return;

      DiscordLogger.logRoleUpdated(oldRole, newRole);
    });

    Bot.app.on('messageCreate', async (message: Message) => {
      if (!message || !message.guild) return;

      DiscordLogger.deleteLinkMessage(message);

      // We do not care about interactions from DMs right now. So we will address this later.
      if (message.channel.type === ChannelType.DM) return;
    });

    Bot.app.on(
      'threadCreate',
      async (thread: ThreadChannel, newlyCreated: boolean) => {
        const parent = thread.parent;
        if (!parent) return;

        // If the thread is apart of a forum channel, we want to run all of that logic here.
        if (parent instanceof ForumChannel && newlyCreated) {
          DiscordLogger.respondToSuggestionThread(thread, parent);
        }
      },
    );

    Bot.app.on(
      'messageReactionAdd',
      (reaction: MessageReaction | PartialMessageReaction) => {
        if (!reaction || !reaction.message.guild) return;

        // We do not care about interactions from DMs right now. So we will address this later.
        if (reaction.message.channel.type === ChannelType.DM) return;
      },
    );

    Bot.app.on(
      'messageReactionRemove',
      (reaction: MessageReaction | PartialMessageReaction) => {
        if (!reaction || !reaction.message.guild) return;

        // We do not care about interactions from DMs right now. So we will address this later.
        if (reaction.message.channel.type === ChannelType.DM) return;
      },
    );

    Bot.app.on('guildCreate', (guild: Guild) => {
      BotUtil.config.createGuild(guild.id, guild.ownerId, guild.name);
    });

    Bot.app.on('guildDelete', (guild: Guild) => {
      BotUtil.config.deleteGuild(guild.id);
    });
  }
}

export const DiscordEvents = new Events();
