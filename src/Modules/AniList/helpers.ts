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

export interface alUserResponse {
  data: alUserResponseData;
}

interface alUserResponseData {
  User: alUser;
}

export interface alMediaResponse {
  data: alMediaResponseData;
}

interface alMediaResponseData {
  MangaSearch: SearchData;
  AnimeSearch: SearchData;
}

interface SearchData {
  media: alMedia[];
}

export interface alMedia {
  id: number;
  idMal: number;
  title: MediaTitle;
  type: string;
  format: string;
  status: string;
  description: string;
  startDate: MediaDate;
  endDate: MediaDate;
  season: string;
  seasonYear: number;
  seasonInt: number;
  episodes: number;
  duration: number;
  chapters: number;
  volumes: number;
  averageScore: number;
  meanScore: number;
  studios: StudioConnection;
  isAdult: boolean;
  siteUrl: string;
  updatedAt: number;
  coverImage: MediaCoverImage;
  bannerImage: string;
  nextAiringEpisode: MediaAiringSchedule;
  trailer: MediaTrailer;
}

interface MediaTrailer {
  id: string;
  site: string;
}

interface MediaAiringSchedule {
  timeUntilAiring: number;
  episode: number;
}

interface MediaTitle {
  english: string;
  romaji: string;
  native: string;
  userPreferred: string;
}

interface MediaDate {
  year: number;
  month: number;
  day: number;
}

interface MediaCoverImage {
  extraLarge: string;
  large: string;
  medium: string;
  color: string;
}

interface StudioConnection {
  nodes: Studio[];
}

interface Studio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
  siteUrl: string;
}

export interface alUser {
  id: number;
  name: string;
  about: string;
  avatar: alAvatar;
  bannerImage: string;
  isFollowing: boolean;
  isFollower: boolean;
  isBlocked: boolean;
  bans: unknown;
  statistics: alUserStatistics;
  siteUrl: string;
  donatorTier: number;
  donatorBadge: string;
  createdAt: number;
  updatedAt: number;
}

interface alAvatar {
  large: string;
  medium: string;
}

export interface alUserStatistics {
  anime: UserStatistics;
  manga: UserStatistics;
}

interface UserStatistics {
  count: number;
  meanScore: number;
  standardDeviation: number;
  minutesWatched: number;
  episodesWatched: number;
  chaptersRead: number;
  volumesRead: number;
}
