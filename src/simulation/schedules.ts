import type { Resident } from '../core/types';
import { OCCUPATIONS } from '../data/residents';

export interface ScheduleTask { activity: string; goal: string; destination: 'home' | 'work' | 'food' | 'shop' | 'park'; }
/** A resident's small personal offset prevents a city-wide synchronised commute. */
export function scheduleFor(resident: Resident, minutes: number): ScheduleTask {
  const profile = OCCUPATIONS.find(p => p.name === resident.occupation) ?? OCCUPATIONS[0];
  const index = Number(resident.id.split('-').at(-1)) || 0;
  const offset = (index % 7 - 3) * 6;
  const t = ((minutes - offset) % 1440 + 1440) % 1440;
  if (t < 6 * 60 || t >= 23 * 60 + 10) return { activity: 'Sleeping', goal: 'Rest at home', destination: 'home' };
  if (t < 7 * 60) return { activity: 'Having breakfast', goal: 'Breakfast at home', destination: 'home' };
  if (t >= 12 * 60 + (index % 3) * 20 && t < 13 * 60 + (index % 3) * 20) return { activity: 'Eating lunch', goal: 'Find lunch', destination: 'food' };
  if (t >= profile.start * 60 - 45 && t < profile.start * 60) return { activity: 'Commuting', goal: `Travel to ${resident.occupation === 'Student' ? 'school' : 'work'}`, destination: 'work' };
  if (t >= profile.start * 60 && t < profile.end * 60) return { activity: resident.occupation === 'Student' ? 'Studying' : resident.occupation === 'Retired resident' ? 'Exercising' : 'Working', goal: resident.occupation === 'Student' ? 'Attend classes' : 'Complete work shift', destination: 'work' };
  if (t >= 20 * 60 && t < 21 * 60) return { activity: 'Having dinner', goal: 'Evening meal', destination: 'food' };
  if (t >= 21 * 60) return { activity: 'Resting at home', goal: 'Return home', destination: 'home' };
  if (index % 3 === 0) return { activity: 'Shopping', goal: 'Buy groceries', destination: 'shop' };
  return { activity: resident.occupation === 'Retired resident' ? 'Meeting neighbours' : 'Relaxing', goal: 'Visit the park', destination: 'park' };
}
