import { create } from 'zustand';

/**
 * Smart Journey State Management
 * Centralizes all journey-related state for multi-hop routes, progress tracking, and AI recommendations
 */
const useJourneyStore = create((set, get) => ({
  // ========== JOURNEY DATA ==========
  journey: null, // Complete journey object with path, route segments, transfers
  selectedRoute: null, // Currently selected route (for map highlighting)
  originStation: '',
  destinationStation: '',

  // ========== TRACKING STATE ==========
  isTracking: false, // True when user is actively on a bus
  currentSegmentIndex: 0, // Which segment (1st route, 2nd route, etc.)
  currentStationIndex: 0, // Current position in the overall path
  currentBusLocation: null, // [lat, lng] of bus in real-time
  estimatedArrival: null, // Minutes until destination

  // ========== TRANSFER INFO ==========
  transferStations: [], // Array of transfer points with details
  nextTransferIn: null, // Minutes until next transfer
  nextTransferStation: '', // Name of next transfer station

  // ========== NEAREST BUS ==========
  nearestBus: null, // Closest bus info { routeId, distance, eta, location }
  userLocation: null, // User's current [lat, lng]

  // ========== AI RECOMMENDATIONS ==========
  recommendations: [], // Array of smart suggestions
  trafficAlert: null, // Traffic condition alert
  alternateRoutes: [], // Alternative routes if current is delayed

  // ========== ACTIONS ==========
  setJourney: (journey) => set({ journey }),
  setOrigin: (origin) => set({ originStation: origin }),
  setDestination: (destination) => set({ destinationStation: destination }),
  
  startTracking: () => set({ isTracking: true, currentSegmentIndex: 0, currentStationIndex: 0 }),
  stopTracking: () => set({ isTracking: false }),

  updateBusLocation: (lat, lng) => set({ currentBusLocation: [lat, lng] }),
  updateEstimatedArrival: (minutes) => set({ estimatedArrival: minutes }),
  updateCurrentPosition: (stationIndex) => set({ currentStationIndex: stationIndex }),

  setTransferStations: (transfers) => set({ transferStations: transfers }),
  updateNextTransfer: (stationName, minutesUntil) => set({ 
    nextTransferStation: stationName, 
    nextTransferIn: minutesUntil 
  }),

  setNearestBus: (busInfo) => set({ nearestBus: busInfo }),
  setUserLocation: (lat, lng) => set({ userLocation: [lat, lng] }),

  setRecommendations: (recs) => set({ recommendations: recs }),
  setTrafficAlert: (alert) => set({ trafficAlert: alert }),
  setAlternateRoutes: (routes) => set({ alternateRoutes: routes }),

  // ========== DERIVED STATE ==========
  getCurrentSegment: () => {
    const { journey, currentSegmentIndex } = get();
    if (!journey || !journey.segments) return null;
    return journey.segments[currentSegmentIndex] || null;
  },

  getProgress: () => {
    const { journey, currentStationIndex } = get();
    if (!journey || !journey.path) return 0;
    return Math.round((currentStationIndex / journey.path.length) * 100);
  },

  getTransfersCompleted: () => {
    const { currentSegmentIndex } = get();
    return Math.max(0, currentSegmentIndex); // 0 transfers if on segment 0
  },

  reset: () => set({
    journey: null,
    selectedRoute: null,
    originStation: '',
    destinationStation: '',
    isTracking: false,
    currentSegmentIndex: 0,
    currentStationIndex: 0,
    currentBusLocation: null,
    estimatedArrival: null,
    transferStations: [],
    nextTransferIn: null,
    nextTransferStation: '',
    nearestBus: null,
    userLocation: null,
    recommendations: [],
    trafficAlert: null,
    alternateRoutes: []
  })
}));

export default useJourneyStore;
