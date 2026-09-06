export interface OccupationProfile { name: string; workplace: string[]; start: number; end: number; wage: number; }

export const OCCUPATIONS: OccupationProfile[] = [
  { name: 'Office worker', workplace: ['office'], start: 9, end: 18, wage: 950 },
  { name: 'Shopkeeper', workplace: ['kirana', 'clothing', 'electronics'], start: 8, end: 21, wage: 850 },
  { name: 'Student', workplace: ['school'], start: 8, end: 15, wage: 80 },
  { name: 'Doctor', workplace: ['hospital'], start: 8, end: 18, wage: 1800 },
  { name: 'Police officer', workplace: ['police'], start: 7, end: 19, wage: 1000 },
  { name: 'Chai vendor', workplace: ['chai'], start: 6, end: 20, wage: 550 },
  { name: 'Restaurant cook', workplace: ['restaurant'], start: 11, end: 23, wage: 700 },
  { name: 'Teacher', workplace: ['school'], start: 7.5, end: 16, wage: 900 },
  { name: 'Delivery rider', workplace: ['station', 'kirana'], start: 8, end: 20, wage: 650 },
  { name: 'Mechanic', workplace: ['mechanic'], start: 9, end: 19, wage: 750 },
  { name: 'Retired resident', workplace: ['park', 'temple'], start: 7, end: 10, wage: 300 },
  { name: 'Nurse', workplace: ['hospital'], start: 15, end: 23, wage: 850 },
  { name: 'Construction worker', workplace: ['office', 'mechanic'], start: 7, end: 17, wage: 650 },
  { name: 'Bus driver', workplace: ['station'], start: 6, end: 16, wage: 750 },
  { name: 'Fruit seller', workplace: ['kirana'], start: 7, end: 20, wage: 500 },
  { name: 'Resident', workplace: ['park', 'kirana'], start: 10, end: 14, wage: 200 },
];
export const FIRST_NAMES = ['Aarav', 'Aditi', 'Imran', 'Meera', 'Rohan', 'Fatima', 'Kavya', 'Arjun', 'Divya', 'Kabir', 'Ananya', 'Dev', 'Zoya', 'Neha', 'Sanjay', 'Lakshmi', 'Rahul', 'Priya', 'Vikram', 'Nisha', 'Joseph', 'Anita', 'Harpreet', 'Simran', 'Rehan', 'Sana', 'Manoj', 'Usha', 'Kiran', 'Isha'];
export const LAST_NAMES = ['Sharma', 'Khan', 'Iyer', 'Patel', 'Das', 'Rao', 'Singh', 'Fernandes', 'Menon', 'Joshi', 'Sethi', 'Ali', 'Kapoor', 'Nair', 'Verma', 'Banerjee'];
export const CLOTHING = ['#a95936', '#557a6b', '#ccb889', '#3e5b73', '#a17483', '#d2c7a6', '#5b7776', '#af8e52', '#765d7c', '#bf806b', '#807863', '#e0d3b9'];
