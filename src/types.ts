export interface Car {
  id: number;
  dealer_id: number;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  description: string;
  images: string[];
  location: string;
  status: 'available' | 'reserved' | 'sold';
  views: number;
  favorites_count?: number;
  featured?: boolean;
  isPromoted?: boolean;
  promotion_expires?: string;
  dealer_plan_type?: string;
  createdAt?: string;
  dealer_name?: string;
  dealer_logo?: string;
  dealer_location?: string;
  dealer_phone?: string;
  dealer_whatsapp?: string;
  dealer_user_id?: number;
}

export interface Branch {
  id?: number;
  dealer_id?: number;
  name: string;
  address: string;
  map_link?: string;
  phone?: string;
}

export interface Dealer {
  id: number;
  name: string;
  logo: string;
  description: string;
  location: string;
  phone: string;
  rating: number;
  branches_count: number;
  reviews_count: number;
  is_luxury: boolean;
  car_count?: number;
  cars?: Car[];
  whatsapp_number?: string;
  address?: string;
  map_location_link?: string;
  latitude?: number;
  longitude?: number;
  followers_count?: number;
  status?: 'pending' | 'active' | 'rejected';
  planType?: string;
  monthly_car_count?: number;
  promotion_usage_count?: number;
  subscription_start?: string;
  subscription_end?: string;
  email?: string;
  branches?: Branch[];
}

export interface DealerStats {
  totalCars: number;
  totalFollowers: number;
  totalLikes: number;
}

export interface Reel {
  id: number;
  dealer_id: number;
  video_url: string;
  caption: string;
  car_id?: number;
  views: number;
  likes: number;
  is_liked?: boolean | number;
  created_at: string;
  dealer_name?: string;
  dealer_logo?: string;
  make?: string;
  model?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role?: 'user' | 'dealer' | 'super_admin';
  dealerId?: number;
  planType?: string; // ADDED
  is_verified?: boolean;
}

export interface AdminStats {
  totalCars: number;
  totalDealers: number;
  totalUsers: number;
}

export interface ActivityLog {
  id: number;
  action: string;
  user_id: number;
  user_name?: string;
  details: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
