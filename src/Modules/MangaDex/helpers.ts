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

export interface mdAccessResponse {
  result: string;
  token: mdTokenResponse;
}

export interface mdMangaResponse {
  data: mdMangaFeedData[] | mdMangaCoverData[] | mdMangaData;
  result: string;
}

export interface mdMangaFeedData {
  result: string;
  data: mdMangaFeed;
}

export interface mdMangaFeed {
  id: string;
  type: string;
  attributes: mdMangaFeedAttributes;
}

export interface mdMangaData {
  id: string;
  type: string;
  attributes: mdMangaAttributes;
}

export interface mdMangaCoverData {
  result: string;
  data: mdMangaCover;
}

export interface mdMangaCover {
  id: string;
  type: string;
  attributes: mdMangaCoverAttributes;
}

interface mdMangaCoverAttributes {
  volume: string;
  fileName: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface mdMangaFeedAttributes {
  title: string;
  volume: string;
  chapter: string;
  translatedLanguage: string;
  hash: string;
  data: string[];
  dataSaver: string[];
  uploader: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishAt: string;
}

interface mdMangaAttributes {
  title: mdTitle;
  desc: mdDesc;
  links: mdLink;
  altTitles: mdAltTitle[];
  originalLanguage: string;
  lastChapter: string;
  lastVolume: string;
  publicationDemographic: string;
  status: string;
  year: string;
  contentRating: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface mdTitle {
  en: string;
}

interface mdAltTitle {
  en: string;
}

interface mdDesc {
  en: string;
  ru: string;
}

interface mdLink {
  al: string;
  ap: string;
  bw: string;
  kt: string;
  mu: string;
  amz: string;
  ebj: string;
  mal: string;
  raw: string;
  engtl: string;
}

interface mdTokenResponse {
  session: string;
  refresh: string;
}

export interface mdFollowList {
  discord_id: string;
  manga: string[];
}
