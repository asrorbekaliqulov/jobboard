
import { Vacancy, Resume, Gender, WorkFormat, WorkType, WorkSchedule, ItemStatus, User, UserRole, Profession, Region } from './types.ts';

export const MOCK_PROFESSIONS: Profession[] = [
  { id: 1, name_uz: 'Dasturchi', name_ru: 'Программист', name_en: 'Software Engineer', is_active: true },
  { id: 2, name_uz: 'Mahsulot menejeri', name_ru: 'Менеджер продукта', name_en: 'Product Manager', is_active: true },
  { id: 3, name_uz: 'Grafik dizayner', name_ru: 'Графический дизайнер', name_en: 'Graphic Designer', is_active: true },
  { id: 4, name_uz: 'Maʼlumotlar olimi', name_ru: 'Data Scientist', name_en: 'Data Scientist', is_active: true },
  { id: 5, name_uz: 'Savdo boʻyicha mutaxassis', name_ru: 'Специалист по продажам', name_en: 'Sales Associate', is_active: true }
];

export const MOCK_REGIONS: Region[] = [
  { id: 1, name_uz: 'Toshkent shahri', name_ru: 'Город Ташкент', name_en: 'Tashkent City', is_active: true },
  { id: 2, name_uz: 'Samarqand', name_ru: 'Самарканд', name_en: 'Samarkand', is_active: true },
  { id: 3, name_uz: 'Buxoro', name_ru: 'Бухара', name_en: 'Bukhara', is_active: true },
  { id: 4, name_uz: 'Fargʻona', name_ru: 'Фергана', name_en: 'Fergana', is_active: true }
];

export const MOCK_USERS: User[] = [
  { id: 1, telegram_id: '123456789', username: 'seeker_dev', first_name: 'John', last_name: 'Doe', photo_url: '', phone: '+998901234567', role: UserRole.JOB_SEEKER, language: 'English', last_login: '2023-10-01T10:00:00Z', is_active: true, is_blocked: false, is_admin: false },
  { id: 2, telegram_id: '987654321', username: 'hr_manager', first_name: 'Jane', last_name: 'Smith', photo_url: '', phone: '+998911112233', role: UserRole.CANDIDATE_HUNTER, language: 'English', last_login: '2023-10-02T12:00:00Z', is_active: true, is_blocked: false, is_admin: true }
];

export const MOCK_VACANCIES: Vacancy[] = [
  {
    id: 1,
    company_name: 'TechWave',
    user_id: 2,
    profession_id: 1,
    profession: MOCK_PROFESSIONS[0],
    region_id: 1,
    region: MOCK_REGIONS[0],
    status: ItemStatus.ACTIVE,
    description: 'Join our growing team to build **amazing** web applications using React and Node.js.',
    work_format: WorkFormat.REMOTE,
    work_type: WorkType.FULLTIME,
    work_hours: 40,
    phone: '+998911112233',
    telegram: '@techwave_hr',
    email: 'hr@techwave.com',
    schedule: WorkSchedule.S_5_2,
    exp_from: 2,
    exp_till: 5,
    salary_from: 1000,
    salary_till: 3000,
    created_at: '2023-10-01T08:00:00Z',
    updated_at: '2023-10-01T08:00:00Z',
    viewed_count: 124
  }
];

export const MOCK_RESUMES: Resume[] = [
  {
    id: 1,
    first_name: 'Alex',
    last_name: 'Johnson',
    age: 28,
    profession_id: 1,
    profession: MOCK_PROFESSIONS[0],
    region_id: 2,
    region: MOCK_REGIONS[1],
    gender: Gender.MALE,
    experience: 4,
    description: 'Senior Frontend Dev with expertise in **Next.js** and UI design systems.',
    phone: '+998901234567',
    telegram: '@alex_dev',
    email: 'alex@johnson.me',
    status: ItemStatus.ACTIVE,
    viewed_count: 56,
    created_at: '2023-09-15T14:30:00Z',
    updated_at: '2023-09-15T14:30:00Z',
    user_id: 1,
    user: MOCK_USERS[0]
  }
];
