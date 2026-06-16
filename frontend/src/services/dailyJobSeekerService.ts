import { DailyJobSeeker, ItemStatus } from "../types";
import { mainApi } from "./api";
import { authService } from "./auth";

const API_URL = mainApi + "/api/v1/daily-job-seekers";

class DailyJobSeekerService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getDailyJobSeekers(
    params: {
      skip?: number;
      limit?: number;
      user_id?: number;
      profession_id?: number;
      region_id?: number;
      status?: ItemStatus;
      search?: string;
    } = {},
  ): Promise<{ items: DailyJobSeeker[]; total: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_URL}/?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch daily job seekers");
    }
    return response.json();
  }

  private sanitizeData(data: Partial<DailyJobSeeker>): any {
    const cleaned: any = { ...data };

    // Remove metadata fields that shouldn't be in POST/PUT body
    delete cleaned.id;
    delete cleaned.created_at;
    delete cleaned.updated_at;
    delete cleaned.viewed_count;
    delete cleaned.profession;
    delete cleaned.region;
    delete cleaned.user;
    delete cleaned.works;
    delete cleaned.districts;

    // Convert empty strings to null for optional fields (fixes 422 errors)
    if (cleaned.email === '') cleaned.email = null;
    if (cleaned.portfolio === '') cleaned.portfolio = null;
    if (cleaned.video === '') cleaned.video = null;
    if (cleaned.middle_name === '') cleaned.middle_name = null;
    if (cleaned.profession_id === 0 || cleaned.profession_id === '') cleaned.profession_id = null;

    // Ensure numeric fields are numbers
    if (cleaned.region_id) cleaned.region_id = Number(cleaned.region_id);
    if (cleaned.age) cleaned.age = Number(cleaned.age);
    if (cleaned.experience !== undefined && cleaned.experience !== null) cleaned.experience = Number(cleaned.experience);
    if (cleaned.additional_workers !== undefined && cleaned.additional_workers !== null) cleaned.additional_workers = Number(cleaned.additional_workers);

    // Ensure array fields
    if (!Array.isArray(cleaned.work_ids)) cleaned.work_ids = [];
    if (!Array.isArray(cleaned.district_ids)) cleaned.district_ids = [];

    return cleaned;
  }

  async createDailyJobSeeker(
    data: Partial<DailyJobSeeker>,
  ): Promise<DailyJobSeeker> {
    const cleanedData = this.sanitizeData(data);
    const response = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(cleanedData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        Array.isArray(error.detail)
          ? error.detail[0].msg
          : error.detail || "Failed to create daily job seeker",
      );
    }
    return response.json();
  }

  async updateDailyJobSeeker(
    id: number,
    data: Partial<DailyJobSeeker>,
  ): Promise<DailyJobSeeker> {
    const cleanedData = this.sanitizeData(data);
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(cleanedData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        Array.isArray(error.detail)
          ? error.detail[0].msg
          : error.detail || "Failed to update daily job seeker",
      );
    }
    return response.json();
  }

  async deleteDailyJobSeeker(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete daily job seeker");
    }
  }

  async registerView(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/${id}/view`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      console.error("Failed to register view for daily job seeker");
    }
  }
}

export const dailyJobSeekerService = new DailyJobSeekerService();
