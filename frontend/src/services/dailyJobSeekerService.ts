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

  async createDailyJobSeeker(
    data: Partial<DailyJobSeeker>,
  ): Promise<DailyJobSeeker> {
    const response = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
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
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
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
