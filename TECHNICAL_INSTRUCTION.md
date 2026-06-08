The Telegram WebApp for seeking vacancy/candidate.

 We already selected some tools to build telegram miniapp using python(FastAPI+aiogram+SQLAlchemy) and React. The miniapp is built for candidate hunters and job seekers.

How flow goes?

1. User /start the telegram bot.

2. Telegram bot sends welcome text and asks to select a language.

3. User selects language.

4. Bot asks to share contact number, it's required.

5. After sharing contact. it's required for authentification.


What is the next steps and functionalities?

User is asked to select the purpose (Who does the user act as? A job seeker or a candidate hunter).

If user is a job hunter, then

- Vacancies: All active vacancies list with filter (by gender, region, profession)

- Portfolios/resumes: User can create their resumes/portfolios.

- My resumes: All of their resumes. User can update/activate/deactivate/delete the resume/portfolio

- Saved Vacancies: All saved active/inactive vacancies by the user


If user is a candidate hunter then

- Resumes: Job seekers list with filter (by region, profession, gender), Can save liked resume

- Saved resumes: All of saved resumes by the user.

- Create vacancy: Vacancy form with necessary form fields

- My vacancies: All of user created vacancies, Can delete, deactivate, activate.


Nobody can apply vacancies. They only can get contacts.

User can change the purpose if they want. So it's the main case.

What about database design?
1. Tables:
    - users:
        id: int
        telegram_id: int (Unique)
        username: str Telegram account username
        phone: str Phone number
        language: str Enum(uz, ru, en)
        role: str Enum(job_seeker, candidate_hunter)
        created_at: datetime
        last_login: datetime
        is_active: bool Default True
        is_blocked: bool Default False (If user blocks the bot, then set this to True)

    - professions:
        id: int
        name_uz: str
        name_ru: str
        name_en: str

    - regions:
        id: int
        name_uz: str
        name_ru: str
        name_en: str

    - districts:
        id: int
        name_uz: str
        name_ru: str
        name_en: str
        region_id: int FK(regions.id)

    - vacancies:
       - company_name: str
       - user_id: int FK(users.id)
       - profession_id: int FK(professions.id)
       - region_id: int FK(regions.id)
       - status: str Enum(active, draft, deleted)
       - description: str (varchar 2000)
       - work_format: str Enum(onsite, remote)
       - work_type: str Enum(fulltime, part-time)
       - work_hours: int
       - phone: str
       - telegram: str Telegram Account Username
       - email: str Email account
       - schedule: str Enum(6/1, 5/2, 7/0)
       - exp_from: int Experience from
       - exp_till: int Experience till
       - salary_from: int Optional
       - salary_till: int Optional
       - created_at: datetime
       - viewed_count: integer How many times viewed?

    - favourite_vacancies:
       - vacancy_id: int FK(vacancies.id)
       - user_id: int FK(users.id)
       - created_at: datetime

    - resumes:
       - id: int
       - user_id: int FK(users.id)
       - first_name: str
       - last_name: str
       - middle_name: str
       - age: int
       - profession_id: int FK(professions.id)
       - region_id: int FK(regions.id)
       - gender: str Enum(male, female, any)
       - experience: int
       - description: str varchar 2000
       - phone: str
       - telegram: str
       - email: str
       - portfolio: str Optional File path
       - created_at: datetime
       - status: str Enum(active, draft, deleted)

    - favourite_resumes:
       - id: int
       - user_id: int FK(users.id)
       - resume_id: int FK(resumes.id)
       - created_at: datetime