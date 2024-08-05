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

import { RESTPostAPIChannelInviteJSONBody, RouteBases, Routes } from "discord-api-types/rest/v10";
import { APIInvite, InviteTargetType } from "discord-api-types/payloads/v10";
import { Config } from "../../Classes/core/config";
import fetch from "node-fetch";

export class CoreCommands {
    public async getActivityInvite(channel_id: string, activity_id: string): Promise<string | undefined> {
        return this.ActivityFromDiscord(channel_id, activity_id);
    }

    private async ActivityFromDiscord(channel_id: string, activity_id: string) {
        if (!channel_id)
            return;
        
        if (!activity_id)
            return;
        
        const channelID = channel_id as `${bigint}`;
        const discordResponse = await fetch(`${RouteBases.api}${Routes.channelInvites(channelID)}`, {
            method: 'POST',
            headers: { authorization: `Bot ${Config.botToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({
                max_age: 0,
                target_type: InviteTargetType.EmbeddedApplication,
                target_application_id: activity_id
            } as RESTPostAPIChannelInviteJSONBody)
        });

        const invite = await discordResponse.json() as APIInvite;
        if (invite.code == "0") return;

        return invite.code;
    }
}

export const Core = new CoreCommands();