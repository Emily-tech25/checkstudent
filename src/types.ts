/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudentLog {
  id: string;
  score: number;
  note: string;
  date: string;
  timestamp: number;
}

export interface Student {
  id: string;
  name: string;
  avatar?: string;
  lastScore?: number | string;
  lastUpdate?: string;
  lastNote?: string;
  createdAt: number;
}

export interface QAItem {
  id: string;
  question: string;
  answer: string | null;
  author: string;
  date: string;
  createdAt: number;
}

export type TabType = 'home' | 'dashboard' | 'qa' | 'docs';
