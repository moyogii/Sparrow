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

import { Embed } from 'discord.js';
export interface Connection {
  verified: boolean;
  name: string;
  show_activity: boolean;
  friend_sync: boolean;
  type: string;
  id: string;
  visibility: number;
}

export interface DiscordMember {
  user?: DiscordUser;
  nick?: string;
  roles: string[];
  joined_at: string;
  premium_since: string;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: unknown;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: string;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface InteractionOptions {
  name: string;
  description: string;
  type: number;
  default?: boolean;
  required?: boolean;
  autocomplete?: boolean;
  choices?: InteractionChoices[];
  options?: InteractionOptions[];
}

export interface InteractionChoices {
  name: string;
  value: string | number;
}

export interface InteractionApplicationCommandCallbackData {
  tts?: boolean;
  content: string;
  embeds?: Embed[];
  allowed_mentions?: [];
}

export interface InteractionCommand {
  name: string;
  type: number;
  description: string;
  options?: InteractionOptions[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runCommand: (...args: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hasPermission: (...args: any) => boolean | Promise<boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction?: (...args: any) => void;
  guild?: string;
  disableDM?: boolean;
  disabled?: boolean;
}

export interface InteractionComponent {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction: (...args: any) => void;
}

export interface InteractionCommandPayload {
  name: string;
  type: number;
  description: string;
  options?: InteractionOptions[];
}
