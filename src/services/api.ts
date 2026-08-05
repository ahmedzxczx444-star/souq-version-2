import { Car, Dealer, Reel, AuthResponse, Part } from "../types";

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
    like: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/reels/${id}/like`, { 
        method: "POST",
        headers: getHeaders(),
      });
      return res.json();
    },
  },
  search: {
    query: async (q: string): Promise<{ results: Car[]; count: number; noExactMatch: boolean; emptyQuery: boolean; parsed: any }> => {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  },
  aiSearch: {
    chat: async (
      message: string,
      history: { role: "user" | "assistant"; content: string }[],
      slots: Record<string, any>
    ): Promise<{ text: string; cars: Car[]; slots: Record<string, any>; intent: string; confidence: number; done: boolean }> => {
      const res = await fetch(`${API_BASE}/ai-search/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, slots }),
      });
      if (!res.ok) throw new Error("AI search failed");
      return res.json();
    },
  },
  smartSearch: {
    chat: async (
      message: string,
      history: { role: "user" | "assistant"; content: string }[],
      slots: Record<string, any>
    ): Promise<{ text: string; cars: Car[]; parts: Part[]; slots: Record<string, any>; domain: string; intent?: string; confidence: number; done: boolean }> => {
      const res = await fetch(`${API_BASE}/smart-search/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, slots }),
      });
      if (!res.ok) throw new Error("Smart search failed");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(data.error || "Invalid credentials");
        err.requiresOtpVerification = data.requiresOtpVerification;
        err.email = data.email;
        throw err;
      }
      return data;
    },
    register: async (data: any): Promise<{ success: boolean; email: string; requiresOtpVerification: boolean }> => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Registration failed");
      return body;
    },
    sendOtp: async (email: string, purpose: "register" | "forgot_password" | "change_email"): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> => {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || "Failed to send verification code"), data);
      return data;
    },
    resendOtp: async (email: string, purpose: "register" | "forgot_password" | "change_email"): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> => {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || "Failed to resend verification code"), data);
      return data;
    },
    verifyOtp: async (email: string, otp: string, purpose: "register" | "forgot_password" | "change_email"): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Invalid verification code");
      return data;
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
    resetPassword: async (data: { email: string; otp: string; password: string }): Promise<{ success: boolean }> => {
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
  parts: {
    getDealerParts: async (): Promise<Part[]> => {
      const res = await fetch(`${API_BASE}/parts`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch parts");
      return res.json();
    },
    getById: async (id: number): Promise<Part> => {
      const res = await fetch(`${API_BASE}/parts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch part");
      return res.json();
    },
    create: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/parts`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to add part");
      return body;
    },
    update: async (id: number, data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/parts/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update part");
      return res.json();
    },
    updateStatus: async (id: number, status: 'available' | 'unavailable'): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/parts/${id}/status`, { method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Failed to update part status");
      return res.json();
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/parts/${id}`, { method: "DELETE", headers: getHeaders() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to delete part");
      return body;
    },
    getStats: async (): Promise<any> => {
      const res = await fetch(`${API_BASE}/parts/dealer/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch parts stats");
      return res.json();
    },
    search: async (q: string): Promise<{ results: Part[]; count: number; noExactMatch: boolean; emptyQuery: boolean }> => {
      const res = await fetch(`${API_BASE}/parts/search/query?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Parts search failed");
      return res.json();
    },
    lookupPartNumber: async (partNumber: string): Promise<{ source: string; name: string; manufacturer: string; category: string; compatibleModels: any[]; confidence: number }> => {
      const res = await fetch(`${API_BASE}/parts/lookup/part-number`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ partNumber }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Part number lookup failed");
      return body;
    },
    recognizeImage: async (image: string): Promise<{ name: string; partNumber: string; category: string; condition: string; compatibleModels: any[]; confidence: number }> => {
      const res = await fetch(`${API_BASE}/parts/recognize-image`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ image }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Image recognition failed");
      return body;
    },
    recognizeBarcode: async (image: string): Promise<{ barcode: string; partNumber: string; manufacturer: string; category: string; confidence: number }> => {
      const res = await fetch(`${API_BASE}/parts/recognize-barcode`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ image }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Barcode recognition failed");
      return body;
    },
    imageSearch: async (image: string): Promise<{ identification: any; results: Part[] }> => {
      const res = await fetch(`${API_BASE}/parts/image-search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Image search failed");
      return body;
    },
  },
  partsOrders: {
    getDealerOrders: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/parts/orders`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    updateStatus: async (id: number, status: string): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/parts/orders/${id}/status`, { method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Failed to update order status");
      return res.json();
    },
    place: async (partId: number, data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/parts/${partId}/order`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to place order");
      return body;
    },
    getMyOrders: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/parts/my-orders`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  },
  dealerBranches: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/dealer/branches`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
    create: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/dealer/branches`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create branch");
      return res.json();
    },
    update: async (id: number, data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealer/branches/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update branch");
      return res.json();
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealer/branches/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to delete branch");
      return res.json();
    },
    getStats: async (id: number): Promise<any> => {
      const res = await fetch(`${API_BASE}/dealer/branches/${id}/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch branch stats");
      return res.json();
    },
    moveCar: async (branchId: number, carId: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealer/branches/${branchId}/move-car`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify({ carId }),
      });
      if (!res.ok) throw new Error("Failed to move car");
      return res.json();
    },
  },
  dealerEmployees: {
    getAll: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/dealer/employees`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
    create: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/dealer/employees`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to add employee");
      return body;
    },
    update: async (id: number, data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealer/employees/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update employee");
      return res.json();
    },
    delete: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/dealer/employees/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to remove employee");
      return res.json();
    },
  },
  dealerChain: {
    getOverview: async (): Promise<any> => {
      const res = await fetch(`${API_BASE}/dealer/chain/overview`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch chain overview");
      return res.json();
    },
  },
  importer: {
    getWarehouses: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/importer/warehouses`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      return res.json();
    },
    createWarehouse: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/importer/warehouses`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create warehouse");
      return res.json();
    },
    deleteWarehouse: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/importer/warehouses/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to delete warehouse");
      return res.json();
    },
    getShipments: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/importer/shipments`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch shipments");
      return res.json();
    },
    createShipment: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/importer/shipments`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create shipment");
      return res.json();
    },
    updateShipment: async (id: number, data: any): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/importer/shipments/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update shipment");
      return res.json();
    },
    addShipmentItem: async (shipmentId: number, data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/importer/shipments/${shipmentId}/items`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to add shipment item");
      return res.json();
    },
    getPreorders: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/importer/preorders`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch pre-orders");
      return res.json();
    },
    updatePreorder: async (id: number, status: string): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/importer/preorders/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Failed to update pre-order");
      return res.json();
    },
    requestPreorder: async (dealerId: number, data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/importer/${dealerId}/preorders`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to request pre-order");
      return res.json();
    },
  },
  officialAgent: {
    getServiceCenters: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/official/service-centers`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch service centers");
      return res.json();
    },
    getPublicServiceCenters: async (dealerId: number): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/official/service-centers/public/${dealerId}`);
      if (!res.ok) throw new Error("Failed to fetch service centers");
      return res.json();
    },
    createServiceCenter: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/official/service-centers`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create service center");
      return res.json();
    },
    deleteServiceCenter: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/official/service-centers/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to delete service center");
      return res.json();
    },
    getOffers: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/official/offers`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    },
    createOffer: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/official/offers`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create offer");
      return res.json();
    },
    deleteOffer: async (id: number): Promise<{ success: boolean }> => {
      const res = await fetch(`${API_BASE}/official/offers/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to delete offer");
      return res.json();
    },
    getWarranties: async (): Promise<any[]> => {
      const res = await fetch(`${API_BASE}/official/warranties`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch warranties");
      return res.json();
    },
    createWarranty: async (data: any): Promise<{ success: boolean; id: number }> => {
      const res = await fetch(`${API_BASE}/official/warranties`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to create warranty");
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
