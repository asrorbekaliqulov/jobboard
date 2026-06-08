# Implementation Plan — Bottom Nav Redesign (v2)

> Supersedes the previous plan. Previous changes (universal tabs, innerTab) are already live.

---

## Current Structure (as-built)

### Layout.tsx
- **Header**: logo + role-toggle button
- **Bookmarks bar**: a dedicated full-width button below the header showing saved count (`onSavedClick`)
- **Main content**: scrollable area (`pb-36`)
- **Bottom nav (4 tabs, global)**: Vacancies | Workers | Daily Workers | More (Profile)

### ClientPanel.tsx
- `activeTab`: `'vacancies' | 'workers' | 'daily-workers' | 'saved' | 'profile'`
- `innerTab`: `'all' | 'mine'` — rendered as two large **top buttons** inside the content area
- `savedTab`: `'main' | 'daily'` — sub-tabs inside the saved view
- Saved accessible via bookmarks bar OR `activeTab === 'saved'`

---

## What Changes (per BUSINESS_LOGIC.md)

| Remove | Replace with |
|--------|-------------|
| Bookmarks bar below header | "Saved" tab in each section's bottom nav |
| Top inner-tab buttons ("All" / "Mine") in content | Bottom nav tabs per section |
| Global 4-tab bottom nav (switches sections) | Context-sensitive 4-tab bottom nav within each section |

### New bottom nav — context-sensitive per section

| Active Section | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|---|---|---|---|---|
| **Vacancies** | Vacancies (all active) | My Vacancies | Saved | More |
| **Workers** | Resumes (all active) | My Resumes | Saved | More |
| **Daily Workers** | Resumes DailyJobSeeker (all) | My Resumes (daily) | Saved | More |

The **More** tab becomes the entry point for switching between the 3 sections + language/role settings (replacing the old profile tab behaviour).

---

## Proposed State Architecture

### Before (ClientPanel.tsx)
```ts
activeTab:  'vacancies' | 'workers' | 'daily-workers' | 'saved' | 'profile'
innerTab:   'all' | 'mine'
savedTab:   'main' | 'daily'
```

### After
```ts
activeSection:  'vacancies' | 'workers' | 'daily-workers'   // which main section
activeSubTab:   'all' | 'mine' | 'saved' | 'more'           // within-section tab
```

`saved` and `more` absorb the old `'saved'` and `'profile'` activeTab values.  
`savedTab` (`'main' | 'daily'`) is no longer needed; "Saved" now always shows items  
relevant to the current section.

---

## Component Breakdown

### 1. `Layout.tsx`

**Remove:**
- The entire bookmarks bar `<button onClick={onSavedClick} …>` block (lines 47–54)
- Props: `onSavedClick`, `savedCount`, `setActiveTab`

**Add props:**
```ts
activeSection: 'vacancies' | 'workers' | 'daily-workers'
activeSubTab:  'all' | 'mine' | 'saved' | 'more'
onSubTabChange: (tab: 'all' | 'mine' | 'saved' | 'more') => void
```

**Rewrite bottom nav:**
Build a section-specific tabs array based on `activeSection`:
```ts
const sectionTabs = {
  vacancies: [
    { id: 'all',   label: t('nav.vacancies'),    icon: 'fa-briefcase'        },
    { id: 'mine',  label: t('nav.my_vacancies'), icon: 'fa-briefcase' },
    { id: 'saved', label: t('nav.saved'),        icon: 'fa-bookmark'         },
    { id: 'more',  label: t('nav.more'),         icon: 'fa-bars-staggered'   },
  ],
  workers: [
    { id: 'all',   label: t('nav.resumes'),      icon: 'fa-users-viewfinder' },
    { id: 'mine',  label: t('nav.my_resumes'),   icon: 'fa-user-check'       },
    { id: 'saved', label: t('nav.saved'),        icon: 'fa-bookmark'         },
    { id: 'more',  label: t('nav.more'),         icon: 'fa-bars-staggered'   },
  ],
  'daily-workers': [
    { id: 'all',   label: t('nav.resumes'),      icon: 'fa-users'            },
    { id: 'mine',  label: t('nav.my_resumes'),   icon: 'fa-user-check'       },
    { id: 'saved', label: t('nav.saved'),        icon: 'fa-bookmark'         },
    { id: 'more',  label: t('nav.more'),         icon: 'fa-bars-staggered'   },
  ],
}
```
Active tab is highlighted by `activeSubTab === tab.id`.

---

### 2. `ClientPanel.tsx`

**State changes:**
```ts
// Replace:
const [activeTab, setActiveTab] = useState<'vacancies'|'workers'|'daily-workers'|'saved'|'profile'>('vacancies')
const [innerTab, setInnerTab] = useState<'all'|'mine'>('all')
const [savedTab, setSavedTab] = useState<'main'|'daily'>('main')

// With:
const [activeSection, setActiveSection] = useState<'vacancies'|'workers'|'daily-workers'>('vacancies')
const [activeSubTab, setActiveSubTab] = useState<'all'|'mine'|'saved'|'more'>('all')
```

**Remove from JSX:**
- The `grid grid-cols-2 gap-2` top inner-tab buttons block (approx lines 344–365)
- The bookmarks-bar-related `onSavedClick` handler passed to `<Layout>`
- `savedCount` prop passed to `<Layout>`

**Update `filteredItems` memo:**
```
activeSection='vacancies',      activeSubTab='all'   → active vacancies
activeSection='vacancies',      activeSubTab='mine'  → own vacancies
activeSection='vacancies',      activeSubTab='saved' → saved vacancies (isCandidate/isDailyJobSeeker)
                                                       OR saved resumes (candidate_hunter)
activeSection='workers',        activeSubTab='all'   → active resumes
activeSection='workers',        activeSubTab='mine'  → own resumes
activeSection='workers',        activeSubTab='saved' → saved resumes
activeSection='daily-workers',  activeSubTab='all'   → active dailyJobSeekers
activeSection='daily-workers',  activeSubTab='mine'  → own dailyJobSeekers
activeSection='daily-workers',  activeSubTab='saved' → saved dailyJobSeekers
```

**Update fetch `useEffect`:**
- Replace `activeTab` checks with `activeSection` checks
- Replace `innerTab !== 'all'` guard with `activeSubTab !== 'all'`

**Update filter bar visibility:**
- Show only when `activeSubTab === 'all'`

**Update add-button visibility:**
- Show only when `activeSubTab === 'mine'`

**Update "More" tab content:**
The old `activeTab === 'profile'` JSX block becomes `activeSubTab === 'more'`.
Add a **Section Switcher** at the top of the More panel:
```tsx
<div className="grid grid-cols-3 gap-2 mb-6">
  <button onClick={() => { setActiveSection('vacancies'); setActiveSubTab('all'); }}>
    Vacancies
  </button>
  <button onClick={() => { setActiveSection('workers'); setActiveSubTab('all'); }}>
    Workers
  </button>
  <button onClick={() => { setActiveSection('daily-workers'); setActiveSubTab('all'); }}>
    Daily Workers
  </button>
</div>
```
Keep language selector, role switcher, and logout below it.

**Pass new props to `<Layout>`:**
```tsx
<Layout
  activeSection={activeSection}
  activeSubTab={activeSubTab}
  onSubTabChange={(tab) => {
    setActiveSubTab(tab);
    setPage(1);
  }}
  role={initialRole}
>
```

**Update `getTabLabel`:** replace with `activeSection`-based logic.

---

### 3. Translation keys (all 3 locale files)

New keys needed:

| Key | EN | RU | UZ |
|---|---|---|---|
| `nav.my_vacancies` | My Vacancies | Мои вакансии | Mening vakansiyalarim |
| `nav.resumes` | Resumes | Резюме | Rezyumalar |
| `nav.my_resumes` | My Resumes | Мои резюме | Mening rezyumelarim |
| `nav.saved` | Saved | Сохранённые | Saqlangan |

Existing keys reused: `nav.vacancies`, `nav.workers`, `nav.daily_workers`, `nav.more`.

---

## Files to Touch

| File | Change |
|------|--------|
| `frontend/src/components/Layout.tsx` | Remove bookmarks bar; rewrite bottom nav props + rendering |
| `frontend/src/views/client/ClientPanel.tsx` | Rename state; remove inner top tabs; update filteredItems, fetch effect, More panel |
| `frontend/src/locales/en/translation.json` | Add nav keys |
| `frontend/src/locales/ru/translation.json` | Add nav keys |
| `frontend/src/locales/uz/translation.json` | Add nav keys |

No backend changes required.

---

## Implementation Steps (after approval)

1. Add translation keys to all 3 locale files
2. Rewrite `Layout.tsx` — remove bookmarks bar, new context-sensitive bottom nav
3. Refactor `ClientPanel.tsx`:
   a. Replace state (`activeTab`+`innerTab`+`savedTab` → `activeSection`+`activeSubTab`)
   b. Remove top inner-tab buttons JSX
   c. Update `filteredItems` memo
   d. Update fetch `useEffect`
   e. Update filter bar + add button visibility
   f. Update More panel — add section switcher, keep profile/settings
4. Test all 3 sections × all 4 sub-tabs (all, mine, saved, more)
