import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  UserRole,
  Vacancy,
  Resume,
  DailyJobSeeker,
  ItemStatus,
  User,
  Profession,
  Region,
  District,
  Work,
  ResumeStatus,
} from "./types.ts";
import { MOCK_VACANCIES, MOCK_RESUMES, MOCK_USERS } from "./constants.ts";
import Onboarding from "./views/Onboarding.tsx";
import ClientPanel from "./views/client/ClientPanel.tsx";
import AdminPanel from "./views/admin/AdminPanel.tsx";
import AdminLoginPage from "./views/admin/AdminLoginPage.tsx";
import { ClientItemForm } from "./views/client/ClientForms.tsx";
import {
  AdminUserForm,
  AdminVacancyForm,
  AdminResumeForm,
  AdminProfessionForm,
  AdminRegionForm,
  AdminDistrictForm,
  AdminWorkForm,
} from "./views/admin/AdminForms.tsx";

import { authService } from "./services/auth.ts";
import { adminApi } from "./services/adminApi.ts";
import { vacancyService } from "./services/vacancyService.ts";
import { resumeService } from "./services/resumeService.ts";
import { favouriteService } from "./services/favouriteService.ts";
import { dailyJobSeekerService } from "./services/dailyJobSeekerService.ts";
import i18n from "./i18n.ts";
import { useTheme } from "./hooks/useTheme.ts";

const App: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme(); // Theme hook qo'shamiz
  
  const [view, setView] = useState<"onboarding" | "client" | "admin">(
    "onboarding",
  );
  const [userRole, setUserRole] = useState<UserRole>(UserRole.JOB_SEEKER);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Data State
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [dailyJobSeekers, setDailyJobSeekers] = useState<DailyJobSeeker[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [savedDailyJobSeekerIds, setSavedDailyJobSeekerIds] = useState<
    number[]
  >([]);

  const [regions, setRegions] = useState<Region[]>([]);
  const [adminRefreshSignal, setAdminRefreshSignal] = useState(0);

  // UI States
  const [clientModal, setClientModal] = useState<{
    type: "vacancy" | "resume";
    data?: any;
  } | null>(null);
  const [adminUserModal, setAdminUserModal] = useState<User | null>(null);
  const [adminVacancyModal, setAdminVacancyModal] = useState<Vacancy | null>(
    null,
  );
  const [adminResumeModal, setAdminResumeModal] = useState<Resume | null>(null);

  const [adminProfessionModal, setAdminProfessionModal] =
    useState<Profession | null>(null);
  const [adminRegionModal, setAdminRegionModal] = useState<Region | null>(null);
  const [adminDistrictModal, setAdminDistrictModal] = useState<District | null>(
    null,
  );
  const [adminWorkModal, setAdminWorkModal] = useState<Work | null>(null);

  useEffect(() => {
    const login = async () => {
      if (window.location.pathname.startsWith("/administration")) {
        setIsAuthenticating(false);
        return;
      }

      try {
        const result = await authService.login();
        if (!result) {
          setAuthError("Failed to authenticate with Telegram");
        } else {
          // Always set the current user from backend
          setCurrentUser(result.user as any);

          // Set i18n language from user's backend preference
          const userLang = result.user.language?.toLowerCase();
          if (userLang && ["en", "ru", "uz"].includes(userLang)) {
            i18n.changeLanguage(userLang);
          }

          // Always show onboarding to let user select their role
          // Pre-fill the user's previous role if available (for UI feedback)
          if (result.user.role) {
            setUserRole(result.user.role as any);
          }
          // Stay on onboarding view - user must select role every time
        }
      } catch (err) {
        setAuthError("An error occurred during authentication");
      } finally {
        setIsAuthenticating(false);
      }
    };

    login();
  }, []);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      // Prefetch regions
      adminApi.regions
        .list("", true, 1, 1000)
        .then((res) => setRegions(res.items))
        .catch(console.error);

      // Fetch vacancies
      vacancyService
        .getVacancies({ limit: 1000 })
        .then((res) => setVacancies(Array.isArray(res?.items) ? res.items : []))
        .catch((err) => {
          console.error("Failed to fetch vacancies", err);
          setVacancies([]);
        });

      // Fetch resumes - needed for my-resumes section
      resumeService
        .getResumes({ limit: 1000 })
        .then((res) => setResumes(Array.isArray(res?.items) ? res.items : []))
        .catch((err) => {
          console.error("Failed to fetch resumes", err);
          setResumes([]);
        });

      dailyJobSeekerService
        .getDailyJobSeekers({ limit: 1000 })
        .then((res) =>
          setDailyJobSeekers(Array.isArray(res?.items) ? res.items : []),
        )
        .catch((err) => {
          console.error("Failed to fetch daily job seekers", err);
          setDailyJobSeekers([]);
        });
    } else {
      // Not authenticated - skip API calls, data remains empty
      // API calls will fail without proper backend connection
    }
  }, [view, adminRefreshSignal]);

  useEffect(() => {
    if (authService.isAuthenticated() && view === "client") {
      if (userRole === UserRole.CANDIDATE_HUNTER) {
        favouriteService
          .getFavouriteVacancies()
          .then((res) => {
            setSavedIds(res.vacancies.map((v: any) => v.vacancy_id));
          })
          .catch(console.error);
      } else if (userRole === UserRole.JOB_SEEKER) {
        favouriteService
          .getFavouriteResumes()
          .then((res) => {
            setSavedIds(res.resumes.map((r: any) => r.resume_id));
          })
          .catch(console.error);
      } else {
        // DAILY_JOB_SEEKER — saved items go into savedDailyJobSeekerIds only
        setSavedIds([]);
      }

      favouriteService
        .getFavouriteDailyJobSeekers()
        .then((res) => {
          setSavedDailyJobSeekerIds(
            res.daily_job_seekers.map((r: any) => r.daily_job_seeker_id),
          );
        })
        .catch(console.error);
    }
  }, [view, userRole]);

  const handleToggleVacancySave = async (id: number) => {
    try {
      const numericId = Number(id);
      if (savedIds.includes(numericId)) {
        await favouriteService.removeFavouriteVacancy(numericId);
        setSavedIds((prev) => prev.filter((i) => i !== numericId));
      } else {
        await favouriteService.addFavouriteVacancy(numericId);
        setSavedIds((prev) => [...prev, numericId]);
      }
    } catch (err) {
      console.error("Failed to toggle vacancy bookmark", err);
    }
  };

  const handleToggleResumeSave = async (id: number) => {
    try {
      const numericId = Number(id);
      if (savedIds.includes(numericId)) {
        await favouriteService.removeFavouriteResume(numericId);
        setSavedIds((prev) => prev.filter((i) => i !== numericId));
      } else {
        await favouriteService.addFavouriteResume(numericId);
        setSavedIds((prev) => [...prev, numericId]);
      }
    } catch (err) {
      console.error("Failed to toggle resume bookmark", err);
    }
  };

  const handleToggleDailyJobSeekerSave = async (id: number) => {
    try {
      const numericId = Number(id);
      if (savedDailyJobSeekerIds.includes(numericId)) {
        await favouriteService.removeFavouriteDailyJobSeeker(numericId);
        setSavedDailyJobSeekerIds((prev) =>
          prev.filter((i) => i !== numericId),
        );
      } else {
        await favouriteService.addFavouriteDailyJobSeeker(numericId);
        setSavedDailyJobSeekerIds((prev) => [...prev, numericId]);
      }
    } catch (err) {
      console.error("Failed to toggle daily job seeker bookmark", err);
    }
  };

  const handleSaveClientItem = async (data: any) => {
    try {
      if (clientModal?.type === "vacancy") {
        let savedVacancy: Vacancy;
        if (data.id && typeof data.id === "number") {
          savedVacancy = await vacancyService.updateVacancy(data.id, data);
        } else {
          savedVacancy = await vacancyService.createVacancy(data);
        }
        setVacancies((prev) => {
          const idx = prev.findIndex((v) => v.id === savedVacancy.id);
          if (idx > -1) {
            const arr = [...prev];
            arr[idx] = savedVacancy;
            return arr;
          }
          return [savedVacancy, ...prev];
        });
      } else {
        if (userRole === UserRole.DAILY_JOB_SEEKER) {
          let savedDaily: DailyJobSeeker;
          if (data.id && typeof data.id === "number") {
            savedDaily = await dailyJobSeekerService.updateDailyJobSeeker(
              data.id,
              data,
            );
          } else {
            savedDaily = await dailyJobSeekerService.createDailyJobSeeker(data);
          }
          setDailyJobSeekers((prev) => {
            const idx = prev.findIndex((r) => r.id === savedDaily.id);
            if (idx > -1) {
              const arr = [...prev];
              arr[idx] = savedDaily;
              return arr;
            }
            return [savedDaily, ...prev];
          });
        } else {
          let savedResume: Resume;
          if (data.id && typeof data.id === "number") {
            savedResume = await resumeService.updateResume(data.id, data);
          } else {
            savedResume = await resumeService.createResume(data);
          }
          setResumes((prev) => {
            const idx = prev.findIndex((r) => r.id === savedResume.id);
            if (idx > -1) {
              const arr = [...prev];
              arr[idx] = savedResume;
              return arr;
            }
            return [savedResume, ...prev];
          });
        }
      }
      setClientModal(null);
    } catch (error: any) {
      alert(error.message || "Save failed");
    }
  };

  const handleFetchResumes = useCallback(async (filters: any) => {
    try {
      const res = await resumeService.getResumes(filters);
      setResumes(res.items);
    } catch (err) {
      console.error("Failed to fetch filtered resumes", err);
    }
  }, []);

  const handleFetchVacancies = useCallback(async (filters: any) => {
    try {
      const res = await vacancyService.getVacancies(filters);
      setVacancies(res.items);
    } catch (err) {
      console.error("Failed to fetch filtered vacancies", err);
    }
  }, []);

  const handleFetchDailyJobSeekers = useCallback(async (filters: any) => {
    try {
      const res = await dailyJobSeekerService.getDailyJobSeekers(filters);
      setDailyJobSeekers(res.items);
    } catch (err) {
      console.error("Failed to fetch filtered daily job seekers", err);
    }
  }, []);

  const handleSaveAdminVacancy = async (v: Vacancy) => {
    try {
      let savedVacancy: Vacancy;
      if (v.id && typeof v.id === "number" && v.id > 0) {
        savedVacancy = await vacancyService.updateVacancy(v.id, v);
      } else {
        // v.id = 0 means new vacancy
        const { id, ...data } = v;
        savedVacancy = await vacancyService.createVacancy(data);
      }
      setVacancies((prev) => {
        const idx = prev.findIndex((item) => item.id === savedVacancy.id);
        if (idx > -1) {
          const arr = [...prev];
          arr[idx] = savedVacancy;
          return arr;
        }
        return [savedVacancy, ...prev];
      });
      setAdminVacancyModal(null);
    } catch (error: any) {
      alert(error.message || "Save failed");
    }
  };

  const handleSaveAdminResume = async (r: Resume) => {
    try {
      let savedResume: Resume;
      if (r.id && typeof r.id === "number" && r.id > 0) {
        savedResume = await resumeService.updateResume(r.id, r);
      } else {
        const { id, ...data } = r;
        savedResume = await resumeService.createResume(data as any);
      }
      setResumes((prev) => {
        const idx = prev.findIndex((item) => item.id === savedResume.id);
        if (idx > -1) {
          const arr = [...prev];
          arr[idx] = savedResume;
          return arr;
        }
        return [savedResume, ...prev];
      });
      setAdminResumeModal(null);
    } catch (error: any) {
      alert(error.message || "Save failed");
    }
  };

  const handleSaveAdminProfession = async (p: any) => {
    try {
      if (p.__isCategory) {
        // Handle category save
        const { __isCategory, id, children, professions_count, ...catData } = p;
        if (id) {
          await adminApi.professionCategories.update(id, catData);
        } else {
          await adminApi.professionCategories.create(catData);
        }
      } else {
        if (p.id) {
          await adminApi.professions.update(p.id, p);
        } else {
          await adminApi.professions.create(p);
        }
      }
      setAdminProfessionModal(null);
      setAdminRefreshSignal((s) => s + 1);
    } catch (e) {
      alert("Save failed");
    }
  };

  const handleSaveAdminRegion = async (r: Region) => {
    try {
      if (r.id) {
        await adminApi.regions.update(r.id, r);
      } else {
        await adminApi.regions.create(r);
      }
      setAdminRegionModal(null);
      setAdminRefreshSignal((s) => s + 1);
    } catch (e) {
      alert("Save failed");
    }
  };

  const handleSaveAdminDistrict = async (d: District) => {
    try {
      if (d.id) {
        await adminApi.districts.update(d.id, d);
      } else {
        await adminApi.districts.create(d);
      }
      setAdminDistrictModal(null);
      setAdminRefreshSignal((s) => s + 1);
    } catch (e) {
      alert("Save failed");
    }
  };

  const handleSaveAdminWork = async (w: Work) => {
    try {
      if (w.id) {
        await adminApi.works.update(w.id, w);
      } else {
        await adminApi.works.create(w);
      }
      setAdminWorkModal(null);
      setAdminRefreshSignal((s) => s + 1);
    } catch (e) {
      alert("Save failed");
    }
  };

  const handleSaveAdminUser = async (u: User) => {
    try {
      if (u.id) {
        await adminApi.users.update(u.id, u);
      } else {
        await adminApi.users.create(u);
      }
      setAdminUserModal(null);
      setAdminRefreshSignal((s) => s + 1);
    } catch (e) {
      alert("Save failed");
    }
  };

  const handleDelete = async (type: string, id: string | number) => {
    try {
      if (type === "vacancies" || type === "v") {
        await vacancyService.deleteVacancy(id as number);
        setVacancies((prev) => prev.filter((v) => v.id !== id));
      } else if (type === "resumes" || type === "r") {
        if (userRole === UserRole.DAILY_JOB_SEEKER) {
          await dailyJobSeekerService.deleteDailyJobSeeker(id as number);
          setDailyJobSeekers((prev) => prev.filter((r) => r.id !== id));
        } else {
          await resumeService.deleteResume(id as number);
          setResumes((prev) => prev.filter((r) => r.id !== id));
        }
      } else if (type === "daily-job-seekers" || type === "d") {
        await dailyJobSeekerService.deleteDailyJobSeeker(id as number);
        setDailyJobSeekers((prev) => prev.filter((r) => r.id !== id));
      } else if (type === "users") {
        await adminApi.users.delete(id);
        setAdminRefreshSignal((s) => s + 1);
      } else if (type === "professions") await adminApi.professions.delete(id);
      else if (type === "categories") await adminApi.professionCategories.delete(id);
      else if (type === "regions") await adminApi.regions.delete(id);
      else if (type === "districts") await adminApi.districts.delete(id);
      else if (type === "works") await adminApi.works.delete(id);

      if (
        ["users", "professions", "categories", "regions", "districts", "works"].includes(type)
      ) {
        setAdminRefreshSignal((s) => s + 1);
      }
    } catch (e) {
      alert("Delete failed");
    }
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          view === "onboarding" ? (
            <Onboarding
              onComplete={(role) => {
                setUserRole(role);
                setView("client");
              }}
              onAdmin={() => navigate("/administration")}
            />
          ) : view === "admin" ? (
            <Navigate to="/administration/panel" />
          ) : (
            <>
              <ClientPanel
                initialRole={userRole}
                vacancies={vacancies}
                resumes={resumes}
                dailyJobSeekers={dailyJobSeekers}
                savedIds={savedIds}
                savedDailyJobSeekerIds={savedDailyJobSeekerIds}
                onToggleVacancySave={handleToggleVacancySave}
                onToggleResumeSave={handleToggleResumeSave}
                onToggleDailyJobSeekerSave={handleToggleDailyJobSeekerSave}
                onAddVacancy={() => setClientModal({ type: "vacancy" })}
                onAddResume={() => setClientModal({ type: "resume" })}
                onEditVacancy={(v) =>
                  setClientModal({ type: "vacancy", data: v })
                }
                onEditResume={(r) =>
                  setClientModal({ type: "resume", data: r })
                }
                onEditDailyJobSeeker={(r) =>
                  setClientModal({ type: "resume", data: r })
                }
                onDeleteVacancy={(id) => handleDelete("v", id)}
                onDeleteResume={(id) => handleDelete("r", id)}
                onDeleteDailyJobSeeker={(id) => handleDelete("d", id)}
                onRoleChange={setUserRole}
                onLogout={() => {
                  setView("onboarding");
                  navigate("/");
                }}
                currentUser={currentUser}
                onFetchResumes={handleFetchResumes}
                onFetchVacancies={handleFetchVacancies}
                onFetchDailyJobSeekers={handleFetchDailyJobSeekers}
              />
              {clientModal && (
                <ClientItemForm
                  type={clientModal.type}
                  initialData={clientModal.data}
                  onSave={handleSaveClientItem}
                  onCancel={() => setClientModal(null)}
                  currentUser={currentUser}
                  userRole={userRole}
                />
              )}
            </>
          )
        }
      />
      <Route path="/administration" element={<AdminLoginPage />} />
      <Route
        path="/administration/panel"
        element={
          authService.isAuthenticated() ? (
            <>
              <AdminPanel
                users={users}
                onLogout={() => {
                  setView("onboarding");
                  navigate("/");
                }}
                onEditUser={setAdminUserModal}
                onEditVacancy={(v) => setAdminVacancyModal(v)}
                onEditResume={(r) => setAdminResumeModal(r)}
                onEditProfession={setAdminProfessionModal}
                onEditRegion={setAdminRegionModal}
                onEditDistrict={setAdminDistrictModal}
                onEditWork={setAdminWorkModal}
                onDelete={handleDelete}
                refreshSignal={adminRefreshSignal}
              />
              {adminUserModal && (
                <AdminUserForm
                  initialData={adminUserModal}
                  onCancel={() => setAdminUserModal(null)}
                  onSave={handleSaveAdminUser}
                />
              )}
              {adminVacancyModal && (
                <AdminVacancyForm
                  initialData={adminVacancyModal}
                  onCancel={() => setAdminVacancyModal(null)}
                  onSave={handleSaveAdminVacancy}
                />
              )}
              {adminResumeModal && (
                <AdminResumeForm
                  initialData={adminResumeModal}
                  onCancel={() => setAdminResumeModal(null)}
                  onSave={handleSaveAdminResume}
                />
              )}
              {adminProfessionModal && (
                <AdminProfessionForm
                  initialData={
                    adminProfessionModal.id ? adminProfessionModal : undefined
                  }
                  onSave={handleSaveAdminProfession}
                  onCancel={() => setAdminProfessionModal(null)}
                />
              )}
              {adminRegionModal && (
                <AdminRegionForm
                  initialData={
                    adminRegionModal.id ? adminRegionModal : undefined
                  }
                  onSave={handleSaveAdminRegion}
                  onCancel={() => setAdminRegionModal(null)}
                />
              )}
              {adminDistrictModal && (
                <AdminDistrictForm
                  initialData={
                    adminDistrictModal.id ? adminDistrictModal : undefined
                  }
                  regions={regions}
                  onSave={handleSaveAdminDistrict}
                  onCancel={() => setAdminDistrictModal(null)}
                />
              )}
              {adminWorkModal && (
                <AdminWorkForm
                  initialData={adminWorkModal.id ? adminWorkModal : undefined}
                  onSave={handleSaveAdminWork}
                  onCancel={() => setAdminWorkModal(null)}
                />
              )}
            </>
          ) : (
            <Navigate to="/administration" />
          )
        }
      />
    </Routes>
  );
};

import { ToastProvider } from "./components/Toast.tsx";

// Simple Error Boundary to catch render errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  public state: { hasError: boolean; error: any };

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "red" }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: 10 }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  );
}
