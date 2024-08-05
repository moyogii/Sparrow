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

import { GuildEmoji } from 'discord.js';

export interface osuPlayer {
  id: string;
  token: string;
  refresh_token: string;
  discord_id: string;
}

export interface osuAccessResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface osuBeatmapResult {
  name: string;
  author: string;
  length: string;
  mods: string | string[];
  stars: number;
  grade: GuildEmoji | undefined | string;
  pp: number;
  calculated_pp: number;
  accuracy: number;
  combo: unknown;
  max_combo: number;
  count_300: unknown;
  count_100: unknown;
  count_50: unknown;
  count_miss: unknown;
  timeSince: string;
  url: string;
}

export interface osuBeatmapSet {
  artist: string;
  artist_unicode: string;
  covers: {
    cover: string;
    'cover@2x': string;
    card: string;
    'card@2x': string;
    list: string;
    'list@2x': string;
    slimcover: string;
    'slimcover@2x': string;
  };
  creator: string;
  favourite_count: number;
  hype: number;
  id: number;
  nsfw: boolean;
  play_count: number;
  preview_url: string;
  source: string;
  status: string;
  title: string;
  title_unicode: string;
  user_id: number;
  video: boolean;
  ranked_date: string;
  submitted_date: string;
}

export interface osuBeatmap {
  difficulty_rating: number;
  id: number;
  mode: string;
  status: string;
  total_length: number;
  version: string;
  accuracy: number;
  ar: number;
  beatmapset_id: number;
  bpm: number;
  convert: boolean;
  count_circles: number;
  count_sliders: number;
  count_spinners: number;
  cs: number;
  deleted_at: string;
  drain: number;
  hit_length: number;
  is_scoreable: string;
  last_updated: string;
  mode_int: number;
  passcount: number;
  playcount: number;
  ranked: number;
  url: string;
  max_combo: number;
  beatmapset: osuBeatmapSet;
}

export interface osuScore {
  id: number;
  user_id: number;
  accuracy: number;
  mods: string[];
  score: number;
  max_combo: number;
  perfect: boolean;
  statistics: {
    count_50: number;
    count_100: number;
    count_300: number;
    count_geki: number;
    count_katu: number;
    count_miss: number;
  };
  rank: string;
  created_at: string;
  best_id: number;
  pp: number;
  mode: string;
  mode_int: number;
  replay: boolean;
  beatmap: {
    difficulty_rating: number;
    id: number;
    mode: string;
    status: string;
    total_length: number;
    version: string;
    accuracy: number;
    ar: number;
    beatmapset_id: number;
    bpm: number;
    convert: boolean;
    count_circles: number;
    count_sliders: number;
    count_spinners: number;
    cs: number;
    deleted_at: string;
    drain: number;
    hit_length: number;
    is_scoreable: string;
    last_updated: string;
    mode_int: number;
    passcount: number;
    playcount: number;
    ranked: number;
    url: string;
  };
  beatmapset: osuBeatmapSet;
  user: {
    avatar_url: string;
    country_code: string;
    default_group: string;
    id: number;
    is_active: boolean;
    is_bot: boolean;
    is_deleted: boolean;
    is_online: boolean;
    is_supporter: boolean;
    last_visit: string;
    pm_friends_only: boolean;
    username: string;
  };
}

export interface osuUserStatistics {
  level: {
    current: number;
    progress: number;
  };
  pp: number;
  global_rank: number;
  ranked_score: number;
  hit_accuracy: number;
  play_count: number;
  play_time: number;
  total_score: number;
  total_hits: number;
  maximum_combo: number;
  replays_watched_by_others: number;
  country_rank: number;
  is_ranked: boolean;
  grade_counts: {
    ss: number;
    ssh: number;
    s: number;
    sh: number;
    a: number;
  };
}

export interface osuUser {
  avatar_url: string;
  country_code: string;
  id: number;
  is_active: boolean;
  is_bot: boolean;
  is_deleted: boolean;
  is_online: boolean;
  is_supporter: boolean;
  last_visit: string;
  pm_friends_only: boolean;
  username: string;
  comments_count: number;
  cover_url: string;
  discord?: string;
  has_supported: boolean;
  join_date: string;
  max_blocks: number;
  max_friends: number;
  occupation?: string;
  playmode: string;
  post_count: number;
  playstyle: string[];
  title?: string;
  title_url?: string;
  website?: string;
  country: [];
  cover: [];
  account_history: [];
  active_tournament_banner: unknown;
  badge: [];
  statistics: osuUserStatistics;
  support_level: number;
  user_achievements: [];
  follower_count: number;
}
