import { db, isFirebaseEnabled } from '../firebase/config';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot 
} from 'firebase/firestore';

// Default initial data for Demo mode
const DEFAULT_SETTINGS = {
  departments: ['Commercial', 'Comptabilite Fiscalite', 'Technique Informatique', 'RH', 'Administration', 'Fiscalite', 'Marketing', 'Direction General', 'Direction', 'Technico-commercial'],
  contractTypes: ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage', 'Intérim'],
  standardHours: 173,
  expectedTime: '08:00',
  socialContributionRate: 12, // 12%
  overtimeRate: 1.25, // x1.25
};

const DEFAULT_EMPLOYEES = [
  {
    id: 'ISW01',
    firstName: 'Emilie',
    lastName: 'NANA SIMEDZE',
    role: 'General Manager',
    department: 'Direction General',
    jobType: 'Temps plein',
    baseSalary: 1500000,
    startDate: '2019-01-01',
    contractType: 'CDI',
    gender: 'Femme',
    city: 'Douala',
    phone: '+237 670000001',
    email: 'emilie.nana@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW09',
    firstName: 'Albert',
    lastName: 'BIYIHA MAINA',
    role: 'Territory Manager',
    department: 'Technico-commercial',
    jobType: 'Temps plein',
    baseSalary: 800000,
    startDate: '2022-01-01',
    contractType: 'CDI',
    gender: 'Homme',
    city: 'Douala',
    phone: '+237 670000009',
    email: 'albert.biyiha@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW08',
    firstName: 'Willy',
    lastName: 'DJOPNANG',
    role: 'Technical Team Lead and Integrator',
    department: 'Technique Informatique',
    jobType: 'Temps plein',
    baseSalary: 1000000,
    startDate: '2022-01-01',
    contractType: 'CDI',
    gender: 'Homme',
    city: 'Douala',
    phone: '+237 670000008',
    email: 'willy.djopnang@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW19',
    firstName: 'Diane Heliane',
    lastName: 'NGOUFFO',
    role: 'Corporate Accountant',
    department: 'Comptabilite Fiscalite',
    jobType: 'Temps plein',
    baseSalary: 600000,
    startDate: '2022-11-07',
    contractType: 'CDI',
    gender: 'Femme',
    city: 'Douala',
    phone: '+237 670000019',
    email: 'diane.ngouffo@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW23',
    firstName: 'Martine Letitia',
    lastName: 'TEUKAM',
    role: 'Customer Onboarding & Support Assistant',
    department: 'Technique Informatique',
    jobType: 'Temps plein',
    baseSalary: 450000,
    startDate: '2024-04-30',
    contractType: 'CDI',
    gender: 'Femme',
    city: 'Douala',
    phone: '+237 670000023',
    email: 'martine.teukam@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW25',
    firstName: 'Cedric',
    lastName: 'BOUTCHOUANG NOUMBI',
    role: 'Customer Onboarding & Support Assistant',
    department: 'Technique Informatique',
    jobType: 'Temps plein',
    baseSalary: 450000,
    startDate: '2026-01-02',
    contractType: 'CDD',
    gender: 'Homme',
    city: 'Douala',
    phone: '+237 670000025',
    email: 'cedric.boutchouang@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW27',
    firstName: 'Kevine',
    lastName: 'MASSONKENG',
    role: 'Tax Accountant',
    department: 'Comptabilite Fiscalite',
    jobType: 'Temps plein',
    baseSalary: 500000,
    startDate: '2026-04-01',
    contractType: 'CDD',
    gender: 'Femme',
    city: 'Douala',
    phone: '+237 670000027',
    email: 'kevine.massonkeng@isw.com',
    status: 'Actif'
  },
  {
    id: 'ISW29',
    firstName: 'Roland',
    lastName: 'MONTHE',
    role: 'Technical Support',
    department: 'Technique Informatique',
    jobType: 'Temps plein',
    baseSalary: 400000,
    startDate: '2026-01-06',
    contractType: 'CDD',
    gender: 'Homme',
    city: 'Douala',
    phone: '+237 670000029',
    email: 'roland.monthe@isw.com',
    status: 'Actif'
  }
];

const DEFAULT_ATTENDANCE = [
  // Week 1 of June 2026: 2026-06-01 to 2026-06-05
  { id: 'att_1_1', employeeId: 'ISW01', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_1_2', employeeId: 'ISW01', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_1_3', employeeId: 'ISW01', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_1_4', employeeId: 'ISW01', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_1_5', employeeId: 'ISW01', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_2_1', employeeId: 'ISW09', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_2_2', employeeId: 'ISW09', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_2_3', employeeId: 'ISW09', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_2_4', employeeId: 'ISW09', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_2_5', employeeId: 'ISW09', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_3_1', employeeId: 'ISW08', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_3_2', employeeId: 'ISW08', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_3_3', employeeId: 'ISW08', date: '2026-06-03', status: 'Absence justifiée', reason: 'Maladie', presentDays: 0, workableDays: 1 },
  { id: 'att_3_4', employeeId: 'ISW08', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_3_5', employeeId: 'ISW08', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_4_1', employeeId: 'ISW19', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_4_2', employeeId: 'ISW19', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_4_3', employeeId: 'ISW19', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_4_4', employeeId: 'ISW19', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_4_5', employeeId: 'ISW19', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_5_1', employeeId: 'ISW23', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_5_2', employeeId: 'ISW23', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_5_3', employeeId: 'ISW23', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_5_4', employeeId: 'ISW23', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_5_5', employeeId: 'ISW23', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_6_1', employeeId: 'ISW25', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_6_2', employeeId: 'ISW25', date: '2026-06-02', status: 'Absence injustifiée', reason: 'Sans motif', presentDays: 0, workableDays: 1 },
  { id: 'att_6_3', employeeId: 'ISW25', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_6_4', employeeId: 'ISW25', date: '2026-06-04', status: 'Absence injustifiée', reason: 'Sans motif', presentDays: 0, workableDays: 1 },
  { id: 'att_6_5', employeeId: 'ISW25', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_7_1', employeeId: 'ISW27', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_7_2', employeeId: 'ISW27', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_7_3', employeeId: 'ISW27', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_7_4', employeeId: 'ISW27', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_7_5', employeeId: 'ISW27', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_8_1', employeeId: 'ISW29', date: '2026-06-01', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_8_2', employeeId: 'ISW29', date: '2026-06-02', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_8_3', employeeId: 'ISW29', date: '2026-06-03', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_8_4', employeeId: 'ISW29', date: '2026-06-04', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_8_5', employeeId: 'ISW29', date: '2026-06-05', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  // Week 2 of June 2026: 2026-06-08 to 2026-06-12
  { id: 'att_9_1', employeeId: 'ISW01', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_9_2', employeeId: 'ISW01', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_9_3', employeeId: 'ISW01', date: '2026-06-10', status: 'Absence justifiée', reason: 'Transport', presentDays: 0, workableDays: 1 },
  { id: 'att_9_4', employeeId: 'ISW01', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_9_5', employeeId: 'ISW01', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_10_1', employeeId: 'ISW09', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_10_2', employeeId: 'ISW09', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_10_3', employeeId: 'ISW09', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_10_4', employeeId: 'ISW09', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_10_5', employeeId: 'ISW09', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_11_1', employeeId: 'ISW08', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_11_2', employeeId: 'ISW08', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_11_3', employeeId: 'ISW08', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_11_4', employeeId: 'ISW08', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_11_5', employeeId: 'ISW08', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_12_1', employeeId: 'ISW19', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_12_2', employeeId: 'ISW19', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_12_3', employeeId: 'ISW19', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_12_4', employeeId: 'ISW19', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_12_5', employeeId: 'ISW19', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_13_1', employeeId: 'ISW23', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_13_2', employeeId: 'ISW23', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_13_3', employeeId: 'ISW23', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_13_4', employeeId: 'ISW23', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_13_5', employeeId: 'ISW23', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_14_1', employeeId: 'ISW25', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_14_2', employeeId: 'ISW25', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_14_3', employeeId: 'ISW25', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_14_4', employeeId: 'ISW25', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_14_5', employeeId: 'ISW25', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_15_1', employeeId: 'ISW27', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_15_2', employeeId: 'ISW27', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_15_3', employeeId: 'ISW27', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_15_4', employeeId: 'ISW27', date: '2026-06-11', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_15_5', employeeId: 'ISW27', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_16_1', employeeId: 'ISW29', date: '2026-06-08', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_16_2', employeeId: 'ISW29', date: '2026-06-09', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_16_3', employeeId: 'ISW29', date: '2026-06-10', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_16_4', employeeId: 'ISW29', date: '2026-06-11', status: 'Absence injustifiée', reason: 'Non justifié', presentDays: 0, workableDays: 1 },
  { id: 'att_16_5', employeeId: 'ISW29', date: '2026-06-12', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  // Week 3 of June 2026: 2026-06-15 to 2026-06-19
  { id: 'att_17_1', employeeId: 'ISW01', date: '2026-06-15', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_17_2', employeeId: 'ISW01', date: '2026-06-16', status: 'Absence injustifiée', reason: 'Non justifié', presentDays: 0, workableDays: 1 },
  { id: 'att_17_3', employeeId: 'ISW01', date: '2026-06-17', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_17_4', employeeId: 'ISW01', date: '2026-06-18', status: 'Absence injustifiée', reason: 'Non justifié', presentDays: 0, workableDays: 1 },
  { id: 'att_17_5', employeeId: 'ISW01', date: '2026-06-19', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },

  { id: 'att_18_1', employeeId: 'ISW09', date: '2026-06-15', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_18_2', employeeId: 'ISW09', date: '2026-06-16', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_18_3', employeeId: 'ISW09', date: '2026-06-17', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_18_4', employeeId: 'ISW09', date: '2026-06-18', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
  { id: 'att_18_5', employeeId: 'ISW09', date: '2026-06-19', status: 'Présent', reason: '', presentDays: 1, workableDays: 1 },
];

const DEFAULT_DELAYS = [
  { id: 'del_1', employeeId: 'ISW29', date: '2026-06-11', expectedTime: '08:00', arrivalTime: '08:45', delayMinutes: 45, status: 'Non justifié', reason: 'Panne de moto' },
  { id: 'del_2', employeeId: 'ISW25', date: '2026-06-02', expectedTime: '08:00', arrivalTime: '08:30', delayMinutes: 30, status: 'Non justifié', reason: 'Embouteillage' },
  { id: 'del_3', employeeId: 'ISW08', date: '2026-06-03', expectedTime: '08:00', arrivalTime: '08:15', delayMinutes: 15, status: 'Justifié', reason: 'Pluie abondante' }
];

const DEFAULT_LEAVES = [
  { id: 'lv_1', employeeId: 'ISW08', leaveType: 'Maladie', startDate: '2026-06-05', endDate: '2026-06-06', days: 2, status: 'Approuvé', notes: 'Repos médical prescrit' },
  { id: 'lv_2', employeeId: 'ISW27', leaveType: 'Congé annuel', startDate: '2026-06-15', endDate: '2026-06-19', days: 5, status: 'Approuvé', notes: 'Repos annuel' },
  { id: 'lv_3', employeeId: 'ISW23', leaveType: 'Congé annuel', startDate: '2026-07-06', endDate: '2026-07-17', days: 10, status: 'En attente', notes: 'Voyage familial' }
];

const DEFAULT_OVERTIME = [
  { id: 'ot_1', employeeId: 'ISW29', monthYear: '2026-06', contractualHours: 173, actualHours: 185, overtimeHours: 12, hourlyRate: 2312, overtimePay: 34682 },
  { id: 'ot_2', employeeId: 'ISW08', monthYear: '2026-06', contractualHours: 173, actualHours: 180, overtimeHours: 7, hourlyRate: 5780, overtimePay: 50578 }
];

const DEFAULT_PAYROLLS = [
  {
    id: 'pay_ISW01_2026-06',
    employeeId: 'ISW01',
    monthYear: '2026-06',
    baseSalary: 1500000,
    bonus: 100000,
    delayDeduction: 0,
    socialContribution: 192000, // 12% of (1500000 + 100000)
    overtimePay: 0,
    netSalary: 1408000, // (1500000 + 100000) - 192000
    paymentStatus: 'Payé',
    paymentDate: '2026-06-28'
  },
  {
    id: 'pay_ISW09_2026-06',
    employeeId: 'ISW09',
    monthYear: '2026-06',
    baseSalary: 800000,
    bonus: 0,
    delayDeduction: 0,
    socialContribution: 96000, // 12% of 800000
    overtimePay: 0,
    netSalary: 704000, // 800000 - 96000
    paymentStatus: 'Payé',
    paymentDate: '2026-06-28'
  },
  {
    id: 'pay_ISW08_2026-06',
    employeeId: 'ISW08',
    monthYear: '2026-06',
    baseSalary: 1000000,
    bonus: 0,
    delayDeduction: 0,
    socialContribution: 126069, // 12% of (1000000 + 50578)
    overtimePay: 50578,
    netSalary: 924509, // (1000000 + 50578) - 126069
    paymentStatus: 'Payé',
    paymentDate: '2026-06-28'
  },
  {
    id: 'pay_ISW29_2026-06',
    employeeId: 'ISW29',
    monthYear: '2026-06',
    baseSalary: 400000,
    bonus: 0,
    delayDeduction: 1734, // delay penalty
    socialContribution: 52162, // 12% of (400000 + 34682)
    overtimePay: 34682,
    netSalary: 380786, // (400000 + 34682) - (52162 + 1734)
    paymentStatus: 'En attente',
    paymentDate: null
  }
];

// Helper to initialize localStorage
const initLocalStorage = () => {
  // Reset cache if it contains the old mock data (Jean Dupont)
  const cachedEmployees = localStorage.getItem('sirh_employees');
  if (cachedEmployees && cachedEmployees.includes('Dupont')) {
    console.log('🔄 Ancien cache de démonstration détecté. Purge et rechargement des données ISW Technosys...');
    localStorage.removeItem('sirh_settings');
    localStorage.removeItem('sirh_employees');
    localStorage.removeItem('sirh_attendance');
    localStorage.removeItem('sirh_delays');
    localStorage.removeItem('sirh_leaves');
    localStorage.removeItem('sirh_overtime');
    localStorage.removeItem('sirh_payrolls');
    localStorage.removeItem('sirh_users');
    localStorage.removeItem('sirh_user');
  }

  if (!localStorage.getItem('sirh_settings')) {
    localStorage.setItem('sirh_settings', JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem('sirh_employees')) {
    localStorage.setItem('sirh_employees', JSON.stringify(DEFAULT_EMPLOYEES));
  }
  if (!localStorage.getItem('sirh_attendance')) {
    localStorage.setItem('sirh_attendance', JSON.stringify(DEFAULT_ATTENDANCE));
  }
  if (!localStorage.getItem('sirh_delays')) {
    localStorage.setItem('sirh_delays', JSON.stringify(DEFAULT_DELAYS));
  }
  if (!localStorage.getItem('sirh_leaves')) {
    localStorage.setItem('sirh_leaves', JSON.stringify(DEFAULT_LEAVES));
  }
  if (!localStorage.getItem('sirh_overtime')) {
    localStorage.setItem('sirh_overtime', JSON.stringify(DEFAULT_OVERTIME));
  }
  if (!localStorage.getItem('sirh_payrolls')) {
    localStorage.setItem('sirh_payrolls', JSON.stringify(DEFAULT_PAYROLLS));
  }
};

// Initialize right away for mock mode
initLocalStorage();

// Simple Publish-Subscribe for Mock Real-Time Listeners
const listeners = {};
const subscribeMock = (collectionName, callback) => {
  if (!listeners[collectionName]) {
    listeners[collectionName] = [];
  }
  listeners[collectionName].push(callback);
  
  // Call immediately with current data
  const data = JSON.parse(localStorage.getItem(`sirh_${collectionName}`));
  callback(data);

  // Return unsubscribe function
  return () => {
    listeners[collectionName] = listeners[collectionName].filter(cb => cb !== callback);
  };
};

const notifyMockListeners = (collectionName) => {
  if (listeners[collectionName]) {
    const data = JSON.parse(localStorage.getItem(`sirh_${collectionName}`));
    listeners[collectionName].forEach(callback => callback(data));
  }
};

export const dbService = {
  // Settings operations
  getSettings: async () => {
    if (isFirebaseEnabled) {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // Create settings doc if it doesn't exist
        await setDoc(docRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
    } else {
      return JSON.parse(localStorage.getItem('sirh_settings'));
    }
  },

  saveSettings: async (settings) => {
    if (isFirebaseEnabled) {
      await setDoc(doc(db, 'settings', 'company'), settings);
    } else {
      localStorage.setItem('sirh_settings', JSON.stringify(settings));
      notifyMockListeners('settings');
    }
    return settings;
  },

  // Employees operations
  getEmployees: async () => {
    if (isFirebaseEnabled) {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const employees = [];
      querySnapshot.forEach((doc) => {
        employees.push({ ...doc.data(), firestoreId: doc.id });
      });
      return employees;
    } else {
      return JSON.parse(localStorage.getItem('sirh_employees'));
    }
  },

  saveEmployee: async (employee) => {
    if (isFirebaseEnabled) {
      // Use employee.id (like ISW01) as document name in Firestore
      await setDoc(doc(db, 'employees', employee.id), employee);
    } else {
      const employees = JSON.parse(localStorage.getItem('sirh_employees'));
      const index = employees.findIndex(emp => emp.id === employee.id);
      if (index > -1) {
        employees[index] = employee;
      } else {
        employees.push(employee);
      }
      localStorage.setItem('sirh_employees', JSON.stringify(employees));
      notifyMockListeners('employees');
    }
    return employee;
  },

  deleteEmployee: async (employeeId) => {
    if (isFirebaseEnabled) {
      await deleteDoc(doc(db, 'employees', employeeId));
    } else {
      const employees = JSON.parse(localStorage.getItem('sirh_employees'));
      const updated = employees.filter(emp => emp.id !== employeeId);
      localStorage.setItem('sirh_employees', JSON.stringify(updated));
      notifyMockListeners('employees');
    }
    return employeeId;
  },

  subscribeEmployees: (callback) => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'employees'), (snapshot) => {
        const employees = [];
        snapshot.forEach((doc) => {
          employees.push({ ...doc.data(), firestoreId: doc.id });
        });
        callback(employees);
      });
    } else {
      return subscribeMock('employees', callback);
    }
  },

  // Attendance operations
  getAttendance: async () => {
    if (isFirebaseEnabled) {
      const querySnapshot = await getDocs(collection(db, 'attendance'));
      const attendances = [];
      querySnapshot.forEach((doc) => {
        attendances.push({ ...doc.data(), id: doc.id });
      });
      return attendances;
    } else {
      return JSON.parse(localStorage.getItem('sirh_attendance'));
    }
  },

  saveAttendance: async (attendance) => {
    if (isFirebaseEnabled) {
      if (attendance.id && !attendance.id.startsWith('att_')) {
        await setDoc(doc(db, 'attendance', attendance.id), attendance);
      } else {
        const docRef = await addDoc(collection(db, 'attendance'), attendance);
        attendance.id = docRef.id;
      }
    } else {
      const attendances = JSON.parse(localStorage.getItem('sirh_attendance'));
      if (!attendance.id) {
        attendance.id = 'att_' + Date.now();
      }
      const index = attendances.findIndex(att => att.id === attendance.id || (att.employeeId === attendance.employeeId && att.date === attendance.date));
      if (index > -1) {
        attendances[index] = { ...attendances[index], ...attendance };
      } else {
        attendances.push(attendance);
      }
      localStorage.setItem('sirh_attendance', JSON.stringify(attendances));
      notifyMockListeners('attendance');
    }
    return attendance;
  },

  deleteAttendance: async (attendanceId) => {
    if (isFirebaseEnabled) {
      await deleteDoc(doc(db, 'attendance', attendanceId));
    } else {
      const attendances = JSON.parse(localStorage.getItem('sirh_attendance')) || [];
      const updated = attendances.filter(att => att.id !== attendanceId);
      localStorage.setItem('sirh_attendance', JSON.stringify(updated));
      notifyMockListeners('attendance');
    }
    return attendanceId;
  },

  subscribeAttendance: (callback) => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const attendances = [];
        snapshot.forEach((doc) => {
          attendances.push({ ...doc.data(), id: doc.id });
        });
        callback(attendances);
      });
    } else {
      return subscribeMock('attendance', callback);
    }
  },

  // Delays operations
  getDelays: async () => {
    if (isFirebaseEnabled) {
      const querySnapshot = await getDocs(collection(db, 'delays'));
      const delays = [];
      querySnapshot.forEach((doc) => {
        delays.push({ ...doc.data(), id: doc.id });
      });
      return delays;
    } else {
      return JSON.parse(localStorage.getItem('sirh_delays'));
    }
  },

  saveDelay: async (delay) => {
    if (isFirebaseEnabled) {
      if (delay.id && !delay.id.startsWith('del_')) {
        await setDoc(doc(db, 'delays', delay.id), delay);
      } else {
        const docRef = await addDoc(collection(db, 'delays'), delay);
        delay.id = docRef.id;
      }
    } else {
      const delays = JSON.parse(localStorage.getItem('sirh_delays'));
      if (!delay.id) {
        delay.id = 'del_' + Date.now();
      }
      const index = delays.findIndex(del => del.id === delay.id);
      if (index > -1) {
        delays[index] = delay;
      } else {
        delays.push(delay);
      }
      localStorage.setItem('sirh_delays', JSON.stringify(delays));
      notifyMockListeners('delays');
    }
    return delay;
  },

  deleteDelay: async (delayId) => {
    if (isFirebaseEnabled) {
      await deleteDoc(doc(db, 'delays', delayId));
    } else {
      const delays = JSON.parse(localStorage.getItem('sirh_delays'));
      const updated = delays.filter(del => del.id !== delayId);
      localStorage.setItem('sirh_delays', JSON.stringify(updated));
      notifyMockListeners('delays');
    }
    return delayId;
  },

  subscribeDelays: (callback) => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'delays'), (snapshot) => {
        const delays = [];
        snapshot.forEach((doc) => {
          delays.push({ ...doc.data(), id: doc.id });
        });
        callback(delays);
      });
    } else {
      return subscribeMock('delays', callback);
    }
  },

  // Leaves operations
  getLeaves: async () => {
    if (isFirebaseEnabled) {
      const querySnapshot = await getDocs(collection(db, 'leaves'));
      const leaves = [];
      querySnapshot.forEach((doc) => {
        leaves.push({ ...doc.data(), id: doc.id });
      });
      return leaves;
    } else {
      return JSON.parse(localStorage.getItem('sirh_leaves'));
    }
  },

  saveLeave: async (leave) => {
    if (isFirebaseEnabled) {
      if (leave.id && !leave.id.startsWith('lv_')) {
        await setDoc(doc(db, 'leaves', leave.id), leave);
      } else {
        const docRef = await addDoc(collection(db, 'leaves'), leave);
        leave.id = docRef.id;
      }
    } else {
      const leaves = JSON.parse(localStorage.getItem('sirh_leaves'));
      if (!leave.id) {
        leave.id = 'lv_' + Date.now();
      }
      const index = leaves.findIndex(lv => lv.id === leave.id);
      if (index > -1) {
        leaves[index] = leave;
      } else {
        leaves.push(leave);
      }
      localStorage.setItem('sirh_leaves', JSON.stringify(leaves));
      notifyMockListeners('leaves');
    }
    return leave;
  },

  deleteLeave: async (leaveId) => {
    if (isFirebaseEnabled) {
      await deleteDoc(doc(db, 'leaves', leaveId));
    } else {
      const leaves = JSON.parse(localStorage.getItem('sirh_leaves'));
      const updated = leaves.filter(lv => lv.id !== leaveId);
      localStorage.setItem('sirh_leaves', JSON.stringify(updated));
      notifyMockListeners('leaves');
    }
    return leaveId;
  },

  subscribeLeaves: (callback) => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'leaves'), (snapshot) => {
        const leaves = [];
        snapshot.forEach((doc) => {
          leaves.push({ ...doc.data(), id: doc.id });
        });
        callback(leaves);
      });
    } else {
      return subscribeMock('leaves', callback);
    }
  },

  // Overtime operations
  getOvertime: async () => {
    if (isFirebaseEnabled) {
      const querySnapshot = await getDocs(collection(db, 'overtime'));
      const overtimes = [];
      querySnapshot.forEach((doc) => {
        overtimes.push({ ...doc.data(), id: doc.id });
      });
      return overtimes;
    } else {
      return JSON.parse(localStorage.getItem('sirh_overtime'));
    }
  },

  saveOvertime: async (overtime) => {
    const id = overtime.id || `${overtime.employeeId}_${overtime.monthYear}`;
    const overtimeWithId = { ...overtime, id };
    if (isFirebaseEnabled) {
      await setDoc(doc(db, 'overtime', id), overtimeWithId);
    } else {
      const overtimes = JSON.parse(localStorage.getItem('sirh_overtime'));
      const index = overtimes.findIndex(ot => ot.id === id);
      if (index > -1) {
        overtimes[index] = overtimeWithId;
      } else {
        overtimes.push(overtimeWithId);
      }
      localStorage.setItem('sirh_overtime', JSON.stringify(overtimes));
      notifyMockListeners('overtime');
    }
    return overtimeWithId;
  },

  subscribeOvertime: (callback) => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'overtime'), (snapshot) => {
        const overtimes = [];
        snapshot.forEach((doc) => {
          overtimes.push({ ...doc.data(), id: doc.id });
        });
        callback(overtimes);
      });
    } else {
      return subscribeMock('overtime', callback);
    }
  },

  // Payrolls operations
  getPayrolls: async () => {
    if (isFirebaseEnabled) {
      const querySnapshot = await getDocs(collection(db, 'payrolls'));
      const payrolls = [];
      querySnapshot.forEach((doc) => {
        payrolls.push({ ...doc.data(), id: doc.id });
      });
      return payrolls;
    } else {
      return JSON.parse(localStorage.getItem('sirh_payrolls'));
    }
  },

  savePayroll: async (payroll) => {
    const id = payroll.id || `${payroll.employeeId}_${payroll.monthYear}`;
    const payrollWithId = { ...payroll, id };
    if (isFirebaseEnabled) {
      await setDoc(doc(db, 'payrolls', id), payrollWithId);
    } else {
      const payrolls = JSON.parse(localStorage.getItem('sirh_payrolls'));
      const index = payrolls.findIndex(p => p.id === id);
      if (index > -1) {
        payrolls[index] = payrollWithId;
      } else {
        payrolls.push(payrollWithId);
      }
      localStorage.setItem('sirh_payrolls', JSON.stringify(payrolls));
      notifyMockListeners('payrolls');
    }
    return payrollWithId;
  },

  subscribePayrolls: (callback) => {
    if (isFirebaseEnabled) {
      return onSnapshot(collection(db, 'payrolls'), (snapshot) => {
        const payrolls = [];
        snapshot.forEach((doc) => {
          payrolls.push({ ...doc.data(), id: doc.id });
        });
        callback(payrolls);
      });
    } else {
      return subscribeMock('payrolls', callback);
    }
  },

  resetDatabase: async () => {
    // Purge localStorage
    localStorage.removeItem('sirh_settings');
    localStorage.removeItem('sirh_employees');
    localStorage.removeItem('sirh_attendance');
    localStorage.removeItem('sirh_delays');
    localStorage.removeItem('sirh_leaves');
    localStorage.removeItem('sirh_overtime');
    localStorage.removeItem('sirh_payrolls');
    localStorage.removeItem('sirh_users');
    
    // Repopulate localStorage
    initLocalStorage();

    // If Firebase is enabled, force-seed Firestore documents
    if (isFirebaseEnabled) {
      try {
        console.log('🌱 Forçage de l\'initialisation des données Firestore ISW Technosys...');
        await setDoc(doc(db, 'settings', 'company'), DEFAULT_SETTINGS);
        
        for (const emp of DEFAULT_EMPLOYEES) {
          await setDoc(doc(db, 'employees', emp.id), emp);
        }
        for (const att of DEFAULT_ATTENDANCE) {
          const { id, ...data } = att;
          await setDoc(doc(db, 'attendance', id), data);
        }
        for (const del of DEFAULT_DELAYS) {
          const { id, ...data } = del;
          await setDoc(doc(db, 'delays', id), data);
        }
        for (const lv of DEFAULT_LEAVES) {
          const { id, ...data } = lv;
          await setDoc(doc(db, 'leaves', id), data);
        }
        for (const ot of DEFAULT_OVERTIME) {
          await setDoc(doc(db, 'overtime', ot.id), ot);
        }
        for (const pay of DEFAULT_PAYROLLS) {
          await setDoc(doc(db, 'payrolls', pay.id), pay);
        }
        console.log('✅ Firestore réinitialisé avec succès !');
      } catch (err) {
        console.error('❌ Erreur de réinitialisation Firestore :', err);
        if (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission'))) {
          throw new Error(
            "Permissions Firestore insuffisantes.\n\n" +
            "Pour corriger cela :\n" +
            "1. Allez dans Firebase Console -> Firestore Database -> Règles.\n" +
            "2. Remplacez la règle par :\n" +
            "   allow read, write: if request.auth != null;\n" +
            "3. Cliquez sur 'Publier'.\n\n" +
            "Note : Les données locales (LocalStorage) ont bien été configurées !"
          );
        }
        throw err;
      }
    }
  }
};

// ─── Firestore Seeding (First Launch) ──────────────────────────────────────
// Seeds all Firestore collections with demo data if they are empty.
// Called once after the user logs in successfully.
export const seedFirestoreIfEmpty = async () => {
  if (!isFirebaseEnabled) return;

  try {
    // Check employees collection — if it has docs, DB is already seeded
    const empSnap = await getDocs(collection(db, 'employees'));
    if (!empSnap.empty) {
      console.log('✅ Firestore déjà initialisé — aucun seeding nécessaire.');
      return;
    }

    console.log('🌱 Première connexion — initialisation de Firestore avec les données de démonstration…');

    // Seed settings
    await setDoc(doc(db, 'settings', 'company'), DEFAULT_SETTINGS);

    // Seed employees (use employee.id as document ID for easy lookups)
    for (const emp of DEFAULT_EMPLOYEES) {
      await setDoc(doc(db, 'employees', emp.id), emp);
    }

    // Seed attendance (auto-generated IDs)
    for (const att of DEFAULT_ATTENDANCE) {
      const { id, ...data } = att;
      await setDoc(doc(db, 'attendance', id), data);
    }

    // Seed delays
    for (const del of DEFAULT_DELAYS) {
      const { id, ...data } = del;
      await setDoc(doc(db, 'delays', id), data);
    }

    // Seed leaves
    for (const lv of DEFAULT_LEAVES) {
      const { id, ...data } = lv;
      await setDoc(doc(db, 'leaves', id), data);
    }

    // Seed overtime
    for (const ot of DEFAULT_OVERTIME) {
      await setDoc(doc(db, 'overtime', ot.id), ot);
    }

    // Seed payrolls
    for (const pay of DEFAULT_PAYROLLS) {
      await setDoc(doc(db, 'payrolls', pay.id), pay);
    }

    console.log('✅ Firestore initialisé avec succès avec les données de démonstration !');
  } catch (err) {
    console.error('❌ Erreur lors du seeding Firestore :', err);
    // Non-blocking — app continues even if seeding partially fails
  }
};
