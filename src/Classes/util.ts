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

import { GuildConfig } from './core/guild/guild';
import { SparrowAPI } from './core/api';
import { Bot } from './core/bot';
import { Snowflake } from 'discord-api-types/v10';
import assert from 'assert';
import wordFilter from 'bad-words';
import axios, { AxiosHeaders } from 'axios';
class Util {
  public api: SparrowAPI = new SparrowAPI();
  public config: GuildConfig = new GuildConfig();
  public baseDir = '';
  public wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  private wordfilter: wordFilter = new wordFilter();
  private allowedWords: string[] = ['balls', 'ball', 'hell', 'death'];

  constructor() {
    this.wordfilter.removeWords(...this.allowedWords);
  }

  public getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public isBoolean(val: string | boolean | number): boolean {
    return val === 'true' || val === 'false' || val === true || val === false;
  }

  public isNumber(str: string): boolean {
    return !isNaN(Number(str));
  }

  public isRoleOrChannel(str: string): boolean {
    return str.includes('<@') || str.includes('<#');
  }

  public parseDate(date: string): Date {
    return new Date(Date.parse(date));
  }

  public isURL(str: string): boolean {
    const urlRegex =
      '^(?!mailto:)(?:(?:http|https)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
    const url = new RegExp(urlRegex, 'i');
    return str.length < 2083 && url.test(str);
  }

  public isMusicPlaylist(str: string): boolean {
    return (
      (str.includes('youtube.com') && str.includes('&list=')) ||
      (str.includes('soundcloud.com') && str.includes('playlist/')) ||
      (str.includes('open.spotify.com') && str.includes('playlist/')) ||
      str.includes('album/')
    );
  }

  public isSpotifyLink(str: string): boolean {
    return str.includes('open.spotify.com');
  }

  public containsProfanity(message: string): boolean {
    return this.wordfilter.isProfane(message);
  }

  public stringToSnowflake(argument: string): Snowflake {
    assert(/^[0-9]+$/.test(argument));

    const snowflakeString: Snowflake = argument as Snowflake;
    return snowflakeString;
  }

  public snowflakeToString(argument: Snowflake): string {
    assert(/^[0-9]+$/.test(argument));

    const snowflakeString = argument as string;
    return snowflakeString;
  }

  public prettyTime(time: number): string {
    const minutes: number = Math.floor(((time % 86400) % 3600) / 60);
    const seconds: number = ((time % 86400) % 3600) % 60;

    return (
      '' +
      minutes +
      ':' +
      seconds.toLocaleString('en-US', { minimumIntegerDigits: 2 })
    );
  }

  // Credits to Stack overflow for this one, simple but effective.
  public timeSince(date: Date): string {
    const currentDate: Date = new Date();
    const seconds: number = Math.floor(
      (currentDate.getTime() - date.getTime()) / 1000,
    );

    return this.numberToTime(seconds);
  }

  public stringTime(time: number): string {
    return this.numberToTime(time);
  }

  public numberToTime(seconds: number): string {
    let interval: number = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + ' years';
    }

    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + ' months';
    }

    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + ' days';
    }

    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + ' hours';
    }

    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + ' minutes';
    }

    return Math.floor(seconds) + ' seconds';
  }

  public numberToDays(time: number): string {
    const days: number = Math.floor(time / 86400);
    const hours: number = Math.floor((time % 86400) / 3600);
    const minutes: number = Math.floor(((time % 86400) % 3600) / 60);
    const seconds: number = ((time % 86400) % 3600) % 60;

    return days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's';
  }

  public numberToMonth(month: number): string {
    const months: string[] = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return months[month];
  }

  public cleanText(text: string): string {
    return text.replace(/<[^>]*>/gm, '');
  }

  public shortText(text: string, length: number): string {
    if (text.length <= length) {
      return text;
    }

    return text.substring(0, length) + '\u2026';
  }

  public isHexColor(hex: string) {
    return (
      typeof hex === 'string' && hex.length === 6 && !isNaN(Number('0x' + hex))
    );
  }

  public async getAPIRequest(
    url: string,
    endpoint: string,
    config: AxiosHeaders,
  ) {
    return await axios
      .get(`${url}${endpoint}`, {
        headers: config,
        responseType: 'json',
      })
      .catch(function (error) {
        Bot.catchError(error);
      });
  }

  public async sendAPIRequest(
    url: string,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
    config: AxiosHeaders,
  ) {
    if (!payload) return;

    return await axios
      .post(`${url}${endpoint}`, payload, {
        headers: config,
      })
      .catch(function (error) {
        Bot.catchError(error);
      });
  }

  public async deleteAPIRequest(
    url: string,
    endpoint: string,
    config: AxiosHeaders,
  ) {
    return await axios
      .delete(`${url}${endpoint}`, {
        headers: config,
      })
      .catch(function (error) {
        Bot.catchError(error);
      });
  }
}

export const BotUtil = new Util();
