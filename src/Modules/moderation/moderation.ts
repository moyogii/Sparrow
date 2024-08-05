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
import { Repository } from 'typeorm';
import { MemberWarning } from '../../Classes/core/guild/entities';
import {
  CommandInteraction,
  Guild,
  GuildMember,
  GuildMemberRoleManager,
  PermissionsBitField,
} from 'discord.js';
import { DiscordLogger } from '../../Classes/core/discord/logger';
import { Bot } from '../../Classes/core/bot';

const warningDatabase: Repository<MemberWarning> =
  Bot.db.getRepository(MemberWarning);

export class Moderation {
  public hasModPermissions(
    interaction: CommandInteraction,
    admin?: boolean,
  ): boolean {
    if (
      !interaction.member ||
      !interaction.member.permissions ||
      !interaction.guild?.id
    )
      return false;

    const memberPermissions = interaction.member!
      .permissions as Readonly<PermissionsBitField>;
    const memberRoles = interaction.member!.roles as GuildMemberRoleManager;
    if (memberPermissions.has(PermissionsBitField.Flags.Administrator))
      return true;

    if (admin)
      return memberRoles.cache.has(
        BotUtil.config.getValue('discord.adminrole', interaction.guild.id),
      );

    return (
      memberRoles.cache.has(
        BotUtil.config.getValue('discord.adminrole', interaction.guild.id),
      ) ||
      memberRoles.cache.has(
        BotUtil.config.getValue('discord.modrole', interaction.guild.id),
      )
    );
  }

  public async addWarning(
    discord_id: string,
    discord_name: string,
    reason: string,
    inflictor_name: string,
    guild_id: string,
  ): Promise<void> {
    const warningDatabase: Repository<MemberWarning> =
      Bot.db.getRepository(MemberWarning);

    const warning = new MemberWarning();
    warning.member_id = discord_id;
    warning.member = discord_name;
    warning.warning = reason;
    warning.inflictor = inflictor_name;
    warning.guild_id = guild_id;
    warning.punished = 0;

    await warningDatabase.save(warning);
  }

  public async getWarningAmount(discord_id: string): Promise<number> {
    const warningDatabase = Bot.db.getRepository(MemberWarning);
    const warnings = await warningDatabase.find({
      where: {
        member_id: discord_id,
        punished: 0,
      },
    });

    return warnings.length + 1;
  }

  public async muteMemberFromWarnings(
    member: GuildMember,
    guild: Guild,
    interaction: CommandInteraction,
  ): Promise<void> {
    const mutedString = 'for **' + BotUtil.stringTime(1440 * 60) + '**';
    const muteReason = 'Member reached the maximum amount of warnings.';

    await member.timeout(1440 * 60 * 1000, muteReason);
    await interaction.reply(
      `${member.user.tag} has been timed out ${mutedString} for reaching the maximum amount of warnings.`,
    );

    await DiscordLogger.logPunishment(
      interaction.user,
      member.user,
      guild.id,
      'Timed out',
      muteReason,
      1440,
    );
    await this.updateWarnings(member.id);
  }

  private async updateWarnings(discord_id: string) {
    const warnings = await warningDatabase.find({
      where: {
        member_id: discord_id,
      },
    });

    for (const warning of warnings) {
      warning.punished = 1;
      await warningDatabase.save(warning);
    }
  }
}

export const Mod = new Moderation();
