import { Car, Dealer, Reel, AuthResponse } from "../types";

const API_BASE = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  cars: {
    getAll: async (): Promise<Car[]> => {
      const res = await fetch(`${API_BASE}/cars`);
      return res.json();
    },
    getById: async (id: number): Promise<Car> => {
      const res = await fetch(`${API_BASE}/cars/${id}`);
      return res.json();
    },
    create: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/cars`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add car");
      return res.json();
    },
    update: async (id: number, data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/cars/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update car");
      return res.json();
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/cars/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete car");
      return res.json();
    },
    getDealerCars: async (): Promise<Car[]> => {
      const res = await fetch(`${API_BASE}/dealer/cars`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dealer cars");
      return res.json();
    },
    promote: async (id: number): Promise<{ success: boolean; message: string; requiresPayment?: boolean }> => {
      const res = await fetch(`${API_BASE}/cars/${id}/promote`, {
        method: "POST",
        headers: getHeaders(),
      });
      return res.json();
    },
  },
  dealers: {
    getAll: async (type?: "top" | "luxury"): Promise<Dealer[]> => {
      const url = type ? `${API_BASE}/dealers?type=${type}` : `${API_BASE}/dealers`;
      const res = await fetch(url);
      return res.json();
    },
    getById: async (id: number): Promise<Dealer> => {
      const res = await fetch(`${API_BASE}/dealers/${id}`);
      return res.json();
    },
    getProfile: async (): Promise<Dealer> => {
      const res = await fetch(`${API_BASE}/dealer/profile`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dealer profile");
      return res.json();
    },
    updateProfile: async (data: Partial<Dealer>): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealer/profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update dealer profile");
      return res.json();
    },
    rate: async (dealerId: number, rating: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealers/${dealerId}/rate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Failed to submit rating");
      return res.json();
    },
    follow: async (dealerId: number): Promise<{ followed: boolean }> => {
      const res = await fetch(`${API_BASE}/dealers/${dealerId}/follow`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to follow dealer");
      return res.json();
    },
    getFollowStatus: async (dealerId: number): Promise<{ followed: boolean }> => {
      const res = await fetch(`${API_BASE}/dealers/${dealerId}/follow-status`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch follow status");
      return res.json();
    },
    getStats: async (): Promise<any> => {
      const res = await fetch(`${API_BASE}/dealer/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dealer stats");
      return res.json();
    },
  },
  reels: {
    getAll: async (): Promise<Reel[]> => {
      const res = await fetch(`${API_BASE}/reels`);
      return res.json();
    },
    create: async (data: any): Promise<any> => {
      const res = await fetch(`${API_BASE}/reels`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    uploadVideo: async (file: File): Promise<{ video_url: string }> => {
      const formData = new FormData();
      formData.append("video", file);
      const res = await fetch(`${API_BASE}/reels/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload video");
      return res.json();
    },
    view: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/reels/${id}/view`, { method: "POST" });
      return res.json();
    },
    getDealerReels: async (): Promise<Reel[]> => {
      const res = await fetch(`${API_BASE}/dealer/reels`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dealer reels");
      return res.json();
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/reels/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete reel");
      return res.json();
    },
    like: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/reels/${id}/like`, { 
        method: "POST",
        headers: getHeaders(),
      });
      return res.json();
    },
  },
  favorites: {
    getAll: async (): Promise<Car[]> => {
      const res = await fetch(`${API_BASE}/favorites`, { headers: getHeaders() });
      return res.json();
    },
    toggle: async (carId: number): Promise<{ success: boolean; removed?: boolean }> => {
      const res = await fetch(`${API_BASE}/favorites/${carId}`, {
        method: "POST",
        headers: getHeaders(),
      });
      return res.json();
    },
  },
  auth: {
    login: async (credentials: any): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      return res.json();
    },
    register: async (data: any): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Registration failed");
      return res.json();
    },
    forgotPassword: async (email: string): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send reset email");
      return res.json();
    },
    resetPassword: async (data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reset password");
      }
      return res.json();
    },
    changePassword: async (data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to change password");
      }
      return res.json();
    },
    logoutAll: async (): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/auth/logout-all`, {
        method: "POST",
        headers: getHeaders(),
      });
      return res.json();
    },
    getMe: async (): Promise<any> => {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch user info");
      return res.json();
    },
  },
  notifications: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    markAsRead: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PUT",
        headers: getHeaders(),
      });
      return res.json();
    },
  },
  admin: {
    getStats: async (): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Access Denied");
      return res.json();
    },
    getCars: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/admin/cars`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Access Denied");
      return res.json();
    },
    deleteCar: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/cars/${id}`, { method: "DELETE", headers: getHeaders() });
      return res.json();
    },
    hideCar: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/cars/${id}/hide`, { method: "PUT", headers: getHeaders() });
      return res.json();
    },
    getDealers: async (status?: string): Promise<any[]> => {
      const url = status ? `${API_BASE}/admin/dealers?status=${status}` : `${API_BASE}/admin/dealers`;
      const res = await fetch(url, { headers: getHeaders() });
      return res.json();
    },
    approveDealer: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/dealers/${id}/approve`, { method: "PUT", headers: getHeaders() });
      return res.json();
    },
    rejectDealer: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/dealers/${id}/reject`, { method: "PUT", headers: getHeaders() });
      return res.json();
    },
    suspendDealer: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/dealers/${id}/suspend`, { method: "PUT", headers: getHeaders() });
      return res.json();
    },
    deleteDealer: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/dealers/${id}`, { method: "DELETE", headers: getHeaders() });
      return res.json();
    },
    getUsers: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
      return res.json();
    },
    banUser: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/users/${id}/ban`, { method: "PUT", headers: getHeaders() });
      return res.json();
    },
    deleteUser: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE", headers: getHeaders() });
      return res.json();
    },
    getActivity: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/admin/activity`, { headers: getHeaders() });
      return res.json();
    },
  },
  subscription: {
    getPlan: async (): Promise<any> => {
      const res = await fetch(`${API_BASE}/user/plan`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch plan info");
      return res.json();
    },
    getSubscription: async (userId: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/subscription/${userId}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch subscription info");
      return res.json();
    },
    changePlan: async (userId: number, plan: string): Promise<any> => {
      const res = await fetch(`${API_BASE}/subscription/change-plan`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId, plan }),
      });
      if (!res.ok) throw new Error("Failed to change plan");
      return res.json();
    },
    promote: async (userId: number, carId: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/subscription/promote`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId, carId }),
      });
      if (!res.ok) throw new Error("Failed to promote car");
      return res.json();
    },
  },
};
