import { Work } from "../types";
import { mainApi } from "./api";
import { authService } from "./auth";

const API_URL = mainApi + "/api/v1/works";

class WorksService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getWorks(
    params: {
      skip?: number;
      limit?: number;
      search?: string;
    } = {},
  ): Promise<{ items: Work[]; total: number }> {
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
      throw new Error("Failed to fetch works");
    }
    return response.json();
  }

  async getWorkById(id: number): Promise<Work> {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch work");
    }
    return response.json();
  }
}

export const worksService = new WorksService();
