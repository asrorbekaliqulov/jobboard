You are a senior full-stack engineer. I have a mini application for connecting employers and job seekers.

Before making any changes, you MUST:
1. Analyze the current structure
2. Create an `implementation_plan.md` file
3. Wait for approval before implementing anything

-----------------------------------
APPLICATION OVERVIEW
-----------------------------------

The application has 3 main sections:

1. Vacancies
2. Workers
3. Daily Workers

When a user enters the app:
- They select their preferred language
- Then choose one of the sections above
- Inside of application the sections menu should be located on bottom of the application, however, it mustn't be very close to bottom corner as uncomfortable to see or click.

-----------------------------------
FEATURE DETAILS
-----------------------------------

We decided to change the bottom menu and remove top tabs and move bookmarks to bottom menu. All written in this document. 

1. VACANCIES SECTION

- Displays all active vacancies (paginated)
- Users can create new vacancies
- The bottom menu includes:
  - Vacancies
  - My Vacancies
  - Saved
  - More
- Remove the top tabs.

-----------------------------------

2. WORKERS SECTION

- Displays all active resumes (paginated)
- Users can upload their resumes
- The bottom menu includes:
  - Resumes
  - My Resumes
  - Saved
  - More
- Remove the top tabs and Bookmarks 

-----------------------------------

3. DAILY WORKERS SECTION

- Same structure as Workers
- Displays daily workers' resumes
- The bottom menu includes:
  - Resumes (DailyJobSeeker)
  - My Resumes (DailyJobSeeker)
  - Saved
  - More

IMPORTANT:
- Workers and Daily Workers use separate database tables

-----------------------------------
BACKEND
-----------------------------------

- Backend is already implemented using FastAPI
- You should integrate with existing APIs (do not rewrite backend)

-----------------------------------
TECHNICAL REQUIREMENTS
-----------------------------------

Code must follow these principles:

1. Clean and minimal
   - Keep functions small and focused
   - Avoid unnecessary abstractions

2. Frontend architecture
   - Split UI into small reusable components
   - Each component should have a single responsibility

3. Documentation
   - Add short docs/comments for each component
   - Explain purpose, props, and usage

4. Scalability
   - Structure code so new sections/features can be added easily

-----------------------------------
DELIVERABLES
-----------------------------------

Step 1:
- Analyze current codebase
- Create `implementation_plan.md` including:
  - Current structure overview
  - Identified issues (if any)
  - Proposed architecture
  - Component breakdown
  - API integration plan

Step 2:
- WAIT for approval

Step 3 (after approval):
- Implement changes step-by-step
- Keep commits logical and isolated

-----------------------------------

If anything is unclear, ask clarifying questions BEFORE starting implementation_plan.
