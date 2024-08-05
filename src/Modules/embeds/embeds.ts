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
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ColorResolvable,
  TextBasedChannel,
  MessageActionRowComponentBuilder,
  TextInputStyle,
  TextInputBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotUtil } from '../../Classes/util';
import { EmbedModalField } from './helpers';

const modalFields: EmbedModalField[] = [
  {
    id: 'embedTitle',
    name: 'Title',
    description: 'The title of the embed.',
    style: TextInputStyle.Short,
    required: true,
  },
  {
    id: 'embedBody',
    name: 'Body',
    description: 'The body message of the embed.',
    style: TextInputStyle.Paragraph,
    required: true,
  },
  {
    id: 'embedColor',
    name: 'Color',
    description: 'The hex code color of the embed.',
    style: TextInputStyle.Short,
    maxLength: 6,
  },
  {
    id: 'embedImage',
    name: 'Image',
    description: 'The image of the embed.',
    style: TextInputStyle.Short,
  },
  {
    id: 'embedThumbnail',
    name: 'Thumbnail',
    description: 'The thumbnail of the embed.',
    style: TextInputStyle.Short,
  },
];

const sayFields: EmbedModalField[] = [
  {
    id: 'messageToSend',
    name: 'Message',
    description: 'The message you would like to send.',
    style: TextInputStyle.Paragraph,
    required: true,
  },
];

export class BotEmbeds {
  public async createSayModal(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder();
    modal.setCustomId('createSayModal');
    modal.setTitle('Create a say message');

    const components: ActionRowBuilder<ModalActionRowComponentBuilder>[] = [];

    for (const field of sayFields) {
      const fieldInput = new TextInputBuilder()
        .setCustomId(field.id)
        .setLabel(
          (field.required ?? false) ? field.name : `${field.name} (OPTIONAL)`,
        )
        .setRequired(field.required ? true : false)
        .setPlaceholder(field.description)
        .setStyle(field.style);

      if (field.minLength) {
        fieldInput.setMinLength(field.minLength);
      }

      if (field.maxLength) {
        fieldInput.setMaxLength(field.maxLength);
      }

      const fieldRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      fieldRow.addComponents([fieldInput]);

      components.push(fieldRow);
    }

    const type = interaction.options.getString('type');
    if (type) {
      modal.setCustomId('createSayModal' + type);
    }

    modal.setComponents(components);

    await interaction.showModal(modal);
  }

  public async createSay(interaction: ModalSubmitInteraction) {
    const channel: TextBasedChannel | null = interaction.channel;
    if (!channel) return;

    channel.send(interaction.fields.getTextInputValue('messageToSend'));

    await interaction.reply({
      content: 'Message successfully sent.',
      ephemeral: true,
    });
  }

  public async createModal(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder();
    modal.setCustomId('createEmbedModal');
    modal.setTitle('Create an Embed');

    const components: ActionRowBuilder<ModalActionRowComponentBuilder>[] = [];

    for (const field of modalFields) {
      const fieldInput = new TextInputBuilder()
        .setCustomId(field.id)
        .setLabel(
          (field.required ?? false) ? field.name : `${field.name} (OPTIONAL)`,
        )
        .setRequired(field.required ? true : false)
        .setPlaceholder(field.description)
        .setStyle(field.style);

      if (field.minLength) {
        fieldInput.setMinLength(field.minLength);
      }

      if (field.maxLength) {
        fieldInput.setMaxLength(field.maxLength);
      }

      const fieldRow = new ActionRowBuilder<ModalActionRowComponentBuilder>();
      fieldRow.addComponents([fieldInput]);

      components.push(fieldRow);
    }

    const type = interaction.options.getString('type');
    if (type) {
      modal.setCustomId('createEmbedModal' + type);
    }

    modal.setComponents(components);

    await interaction.showModal(modal);
  }

  public async createEmbed(interaction: ModalSubmitInteraction) {
    const embed: EmbedBuilder = new EmbedBuilder();

    embed.setTitle(interaction.fields.getTextInputValue('embedTitle'));
    embed.setDescription(interaction.fields.getTextInputValue('embedBody'));

    let selectedColor: ColorResolvable = '#FF862C';

    const currentColor: string | null =
      interaction.fields.getTextInputValue('embedColor');
    if (currentColor) {
      if (!BotUtil.isHexColor(currentColor)) {
        interaction.reply({ content: 'Invalid hex color.', ephemeral: true });
        return;
      }

      selectedColor = `#${currentColor}`;
    }

    embed.setColor(selectedColor);

    const imageURL: string | null =
      interaction.fields.getTextInputValue('embedImage');
    if (imageURL && BotUtil.isURL(imageURL)) {
      embed.setImage(imageURL);
    }

    const thumbnailURL: string | null =
      interaction.fields.getTextInputValue('embedThumbnail');
    if (thumbnailURL && BotUtil.isURL(thumbnailURL)) {
      embed.setThumbnail(thumbnailURL);
    }

    const buttonRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();

    const channel: TextBasedChannel | null = interaction.channel;
    if (!channel) return;

    const payload =
      buttonRow.components.length >= 1
        ? {
            embeds: [embed],
            components: [buttonRow],
          }
        : { embeds: [embed] };

    channel.send(payload);

    await interaction.reply({
      content: 'Embed successfully created.',
      ephemeral: true,
    });
  }
}

export const Embeds = new BotEmbeds();
