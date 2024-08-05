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

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'guild_config' })
export class GuildConfigData {
  @PrimaryColumn()
  guild_id: string;

  @Column('longtext')
  data: string;

  @Column('tinyint')
  setup: boolean;

  @Column('tinyint')
  premium: boolean;
}

@Entity({ name: 'guilds' })
export class GuildData {
  @PrimaryColumn()
  guild_id: string;

  @Column()
  guild_owner: string;

  @Column()
  name: string;
}

@Entity({ name: 'member_warnings' })
export class MemberWarning {
  @PrimaryColumn()
  id: number;

  @Column()
  member_id: string;

  @Column()
  member: string;

  @Column()
  warning: string;

  @Column()
  inflictor: string;

  @Column()
  guild_id: string;

  @Column()
  punished: number;
}
