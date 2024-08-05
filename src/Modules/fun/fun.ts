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
import { format } from 'util';
import { CommandInteraction, InteractionResponse, User } from 'discord.js';

export class FunCommands {
  public async coinFlip(
    interaction: CommandInteraction,
    selection?: string,
  ): Promise<InteractionResponse<boolean>> {
    const coinFlipResults: string[] = ['Heads', 'Tails'];
    const result: string =
      coinFlipResults[Math.floor(Math.random() * coinFlipResults.length)];

    let message: string = 'It flipped and landed on ' + result + '!';
    if (selection) {
      message =
        selection === result
          ? 'You won! It was ' + result
          : 'You lost. It was ' + result;
    }

    return await interaction.reply(message);
  }

  public async eightBallFortune(
    question: string,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    const member = interaction.user
      ? interaction.user
      : interaction.member?.user;
    if (!member)
      return await interaction.reply(
        'You need to be in a guild to use this command!',
      );

    if (!question)
      return await interaction.reply(
        '<@' + member.id + '>' + ', You need to specify a question first!',
      );

    const playerFortune = this.getPlayerFortune();
    return await interaction.reply(
      '<@' + member.id + '>' + ', ' + playerFortune,
    );
  }

  public async rollTheDice(
    interaction: CommandInteraction,
    rolls: number,
    sides: number,
  ): Promise<InteractionResponse<boolean>> {
    const member: User = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);

    if (rolls > 1) {
      let rollString = 'You rolled the following';

      for (let i = 0; i < rolls; i++) {
        const rollNumber: number = Math.floor(Math.random() * sides) + 1;
        rollString += ` ${rollNumber}`;

        if (i < rolls - 1) rollString += ',';
      }

      if (rollString.length >= 2000)
        return await interaction.reply(
          '<@' +
            member.id +
            '>, Thats quite the large dice roll, a bit too large. Please try a lower number of dice rolls.',
        );

      return await interaction.reply('<@' + member.id + '>, ' + rollString);
    } else {
      const rollNumber: number = Math.floor(Math.random() * sides) + 1;

      return await interaction.reply(
        '<@' + member.id + '>, You rolled ' + rollNumber,
      );
    }
  }

  public async rockPaperScissors(
    selection: string,
    interaction: CommandInteraction,
  ): Promise<InteractionResponse<boolean>> {
    // Define choices and results for RPS data.
    const choice = ['Paper', 'Rock', 'Scissors'];

    const results = [
      ['tie', 'cpu', 'player'],
      ['player', 'tie', 'cpu'],
      ['cpu', 'player', 'tie'],
    ];

    const member: User = interaction.user
      ? interaction.user
      : (interaction.member?.user as User);
    const player: string = member.id;

    // Calculate the bot choice
    const randomIndex: number = BotUtil.getRandomNumber(0, 2);
    const botChoice: string = choice[randomIndex];

    const playerChoice = selection;
    if (!playerChoice)
      return interaction.reply(
        '<@' +
          player +
          '>' +
          ', You must select between (Rock, Paper, and Scissors)!',
      );

    // Calculate actual player choice and format it correctly.
    const finalPlayerChoice =
      playerChoice.substring(0, 1).toUpperCase() + playerChoice.substring(1);
    const finalPlayerChoiceIndex: number = choice.indexOf(finalPlayerChoice);

    if (!choice.includes(finalPlayerChoice))
      return interaction.reply(
        '<@' +
          player +
          '>' +
          ', You must select between (Rock, Paper, and Scissors)!',
      );

    // Calculate if the player won or not.
    const result: string = results[randomIndex][finalPlayerChoiceIndex];

    if (result === 'tie') {
      const gameTiedString: string = format(
        '<@' + player + '>' + ", We both have chosen %s. It's a tie!",
        botChoice,
      );

      return interaction.reply(gameTiedString);
    }

    let playerWon = false;
    if (result === 'player') {
      playerWon = true;
    }

    const wonText: string = playerWon ? 'You won!' : 'You lost.';
    const choiceText: string = format(
      '<@' + player + '>' + ', You chose %s, I chose %s!',
      finalPlayerChoice,
      botChoice,
    );

    const beat = playerWon ? finalPlayerChoice : botChoice;
    const beaten = playerWon ? botChoice : playerChoice;
    const gameEndString: string = format(
      '%s %s beats %s. %s',
      choiceText,
      beat,
      beaten,
      wonText,
    );

    // Change message colors depending on if you win or lose.
    if (playerWon) {
      return await interaction.reply(gameEndString);
    } else {
      return await interaction.reply(gameEndString);
    }
  }

  private getPlayerFortune() {
    const eightBallResults: string[] = [
      'It is certain',
      'It is decidedly so',
      'Without a doubt',
      'Yes, definitely',
      'You may rely on it',
      'As I see it, yes',
      'Most likely',
      'Outlook good',
      'Yes',
      'Signs point to yes',
      'Ask again later',
      'Better not tell you now',
      'Cannot predict now',
      'Concentrate and ask again',
      "Don't count on it",
      'My reply is no',
      'My sources say no',
      'Outlook not so good',
      'Very doubtful',
    ];

    const randomIndex: number = BotUtil.getRandomNumber(
      0,
      eightBallResults.length - 1,
    );
    const result: string = eightBallResults[randomIndex];

    return result;
  }
}

export const Fun = new FunCommands();
