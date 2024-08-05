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
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Message,
  TextChannel,
  User,
} from 'discord.js';
import { Bot } from '../../../Classes/core/bot';
import { InteractionCommand } from '../../../Classes/core/discord/helpers';
import { Mod } from '../../moderation/moderation';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

const command: InteractionCommand = {
  name: 'clean',
  type: ApplicationCommandType.ChatInput,
  description: 'Delete a certain amount of messages in the current channel.',
  options: [
    {
      name: 'amount',
      description: 'The amount of messages you want to delete. (Max 100)',
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
    {
      name: 'user',
      description: 'Specific user you want to delete the messages of.',
      type: ApplicationCommandOptionType.User,
    },
  ],
  runCommand: async function (interaction: ChatInputCommandInteraction) {
    try {
      const messageAmount: number | null =
        interaction.options.getInteger('amount');
      if (!messageAmount)
        return interaction.reply({
          content: 'Please select a number and try again!',
          ephemeral: true,
        });

      if (messageAmount > 100 || messageAmount < 1)
        return interaction.reply({
          content:
            'Please enter a valid number that is not greater than 100 or less than 1!',
          ephemeral: true,
        });

      const interactionChannel: string | undefined = interaction.channel?.id;
      if (!interactionChannel) return;

      const channel = Bot.app.channels.cache.get(interactionChannel);
      if (!(channel instanceof TextChannel)) return;

      const user: User | null = interaction.options.getUser('user');

      // Delete the messages
      await channel.messages
        .fetch({ limit: messageAmount })
        .then((messages) => {
          if (!user) {
            channel.bulkDelete(messages);
          } else {
            const filter = user;
            const userMessageArray: Message[] = Array.from(
              messages.filter((m) => m.author.id === filter.id).values(),
            );
            const userMessages: Message[] = userMessageArray.slice(
              0,
              messageAmount,
            );

            if (userMessages.length == 0) {
              interaction.reply({
                content: 'No messages have been found for that member.',
                ephemeral: true,
              });

              return;
            }

            channel.bulkDelete(userMessages);
          }

          interaction.reply({
            content: `${messageAmount} messages have been deleted!`,
            ephemeral: true,
          });
        })
        .catch((err) => {
          if (err)
            interaction.reply({
              content:
                'You can only bulk delete messages that are under 14 days old.',
              ephemeral: true,
            });
        });
    } catch (error) {
      Bot.catchError(error);
    }
  },
  hasPermission: function (interaction: ChatInputCommandInteraction) {
    return Mod.hasModPermissions(interaction, true);
  },
  disableDM: true,
};
export = command;
