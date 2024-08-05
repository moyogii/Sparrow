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

import { InteractionComponent } from '../../../Classes/core/discord/helpers';
import { Bot } from '../../../Classes/core/bot';
import { ModalSubmitInteraction } from 'discord.js';
import { Embeds } from '../embeds';

const command: InteractionComponent = {
  id: 'createSayModal',
  runAction: async function (interaction: ModalSubmitInteraction) {
    try {
      await Embeds.createSay(interaction);
    } catch (error) {
      Bot.catchError(error);
    }
  },
};
export = command;
