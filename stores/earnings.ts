import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { database } from '../services/supabase';
import { EarningsData, EarningsPeriod, EarningsTimeframe, ServiceRequest } from '../types';

interface EarningsState {
  earningsData: EarningsData | null;
  isLoading: boolean;
  error: string | null;
  selectedTimeframe: EarningsTimeframe;
  dateRange: { start: string | null; end: string | null };
  monthlyGoal: number;
  lastUpdated: string | null;
  
  // Actions
  loadEarnings: (heroId: string, startDate?: string, endDate?: string) => Promise<void>;
  setTimeframe: (timeframe: EarningsTimeframe) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  setMonthlyGoal: (goal: number) => void;
  clearEarnings: () => void;
  refreshEarnings: (heroId: string) => Promise<void>;
}

// Helper function to calculate earnings from a service request
const calculateRequestEarnings = (request: ServiceRequest): number => {
  // Calculate average of budget range
  return (request.budget_range.min + request.budget_range.max) / 2;
};

// Helper function to group earnings by period
const groupEarningsByPeriod = (
  requests: ServiceRequest[], 
  timeframe: EarningsTimeframe
): EarningsPeriod[] => {
  const grouped: { [key: string]: { amount: number; jobCount: number } } = {};
  
  requests.forEach(request => {
    const date = new Date(request.updated_at);
    let key: string;
    
    switch (timeframe) {
      case 'daily':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        // Get the Monday of the week
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        key = monday.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        break;
      default:
        key = date.toISOString().split('T')[0]; // Default to daily
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = { amount: 0, jobCount: 0 };
    }
    
    grouped[key].amount += calculateRequestEarnings(request);
    grouped[key].jobCount += 1;
  });
  
  // Convert to array and sort by date
  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      jobCount: data.jobCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const useEarningsStore = create<EarningsState>()(
  persist(
    (set, get) => ({
      earningsData: null,
      isLoading: false,
      error: null,
      selectedTimeframe: 'daily',
      dateRange: { start: null, end: null },
      monthlyGoal: 2000,
      lastUpdated: null,

  loadEarnings: async (heroId: string, startDate?: string, endDate?: string) => {
    const currentState = get();
    
    // Check if we have recent data (within last 5 minutes) and no date filters
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    if (
      !startDate && 
      !endDate && 
      currentState.earningsData && 
      currentState.lastUpdated && 
      currentState.lastUpdated > fiveMinutesAgo
    ) {
      return; // Use cached data
    }

    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await database.getHeroEarnings(heroId, startDate, endDate);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      if (data) {
        const requests = data as ServiceRequest[];
        
        // Calculate total earnings
        const totalEarnings = requests.reduce((sum, req) => 
          sum + calculateRequestEarnings(req), 0
        );
        
        // Get completed jobs count
        const completedJobs = requests.length;
        
        // Calculate average rating (would need to fetch from reviews table in real app)
        // For now, we'll use a placeholder
        const averageRating = 0;
        
        // Group earnings by different timeframes
        const dailyEarnings = groupEarningsByPeriod(requests, 'daily');
        const weeklyEarnings = groupEarningsByPeriod(requests, 'weekly');
        const monthlyEarnings = groupEarningsByPeriod(requests, 'monthly');
        
        set({ 
          earningsData: {
            totalEarnings,
            completedJobs,
            averageRating,
            dailyEarnings,
            weeklyEarnings,
            monthlyEarnings,
          },
          isLoading: false,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      set({ 
        error: 'Failed to load earnings data', 
        isLoading: false 
      });
    }
  },

      setTimeframe: (timeframe: EarningsTimeframe) => {
        set({ selectedTimeframe: timeframe });
      },

      setDateRange: (start: string | null, end: string | null) => {
        set({ dateRange: { start, end } });
      },

      setMonthlyGoal: (goal: number) => {
        set({ monthlyGoal: goal });
      },

      refreshEarnings: async (heroId: string) => {
        // Force refresh by clearing cache
        set({ lastUpdated: null });
        const { loadEarnings } = get();
        await loadEarnings(heroId);
      },

      clearEarnings: () => {
        set({ 
          earningsData: null, 
          error: null,
          isLoading: false,
          selectedTimeframe: 'daily',
          dateRange: { start: null, end: null },
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'earnings-storage',
      partialize: (state) => ({
        monthlyGoal: state.monthlyGoal,
        selectedTimeframe: state.selectedTimeframe,
      }),
    }
  )
);
