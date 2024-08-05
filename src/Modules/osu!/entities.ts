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

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'osu_connections' })
export class osuPlayerConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  player_id: string;

  @Column()
  token: string;

  @Column()
  refresh_token: string;

  @Column()
  discord_id: string;

  @Column('timestamp')
  last_access: string;
}
