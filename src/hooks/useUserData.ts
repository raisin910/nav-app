import { useState, useEffect } from 'react';

export interface WalkingHistory {
  id: string;
  estimatedTime: number;
  actualTime: number;
  distance: number;
  route: {
    start: string;
    end: string;
    startCoords: google.maps.LatLngLiteral;
    endCoords: google.maps.LatLngLiteral;
  };
  timestamp: Date;
  accuracy: number; // 実際時間/予想時間の比率
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  coordinates: google.maps.LatLngLiteral;
  category: 'home' | 'work' | 'gym' | 'favorite';
}

interface UserProfile {
  baseWalkingSpeed: number;
  preferredPace: 'slow' | 'normal' | 'fast';
  walkingHistory: WalkingHistory[];
  favoriteLocations: SavedLocation[];
}

export const useUserData = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    baseWalkingSpeed: 80,
    preferredPace: 'normal',
    walkingHistory: [],
    favoriteLocations: []
  });

  // データ読み込み
  useEffect(() => {
    const savedData = localStorage.getItem('navAppUserData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // 日付の復元
        parsed.walkingHistory = parsed.walkingHistory.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }));
        setUserProfile(parsed);
      } catch (error) {
        console.error('データ読み込みエラー:', error);
      }
    }
  }, []);

  // データ保存
  const saveUserProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem('navAppUserData', JSON.stringify(newProfile));
  };

  // 歩行履歴追加
  const addWalkingHistory = (record: Omit<WalkingHistory, 'id'>) => {
    const newRecord: WalkingHistory = {
      ...record,
      id: Date.now().toString()
    };
    
    const updatedProfile = {
      ...userProfile,
      walkingHistory: [...userProfile.walkingHistory, newRecord].slice(-50) // 最新50件保持
    };
    
    saveUserProfile(updatedProfile);
  };

  // 個人の歩行速度計算（学習機能）
  const calculatePersonalWalkingSpeed = (): number => {
    const recentHistory = userProfile.walkingHistory.slice(-10);
    
    if (recentHistory.length < 3) {
      return userProfile.baseWalkingSpeed; // データ不足時はベース速度
    }

    // 直近の予測精度から平均を計算
    const averageAccuracy = recentHistory.reduce((sum, record) => 
      sum + record.accuracy, 0) / recentHistory.length;

    // 時間帯別の補正
    const currentHour = new Date().getHours();
    let timeAdjustment = 1.0;
    if (currentHour >= 7 && currentHour <= 9) timeAdjustment = 0.9; // 朝の通勤時間
    if (currentHour >= 17 && currentHour <= 19) timeAdjustment = 0.85; // 夕方の帰宅時間

    return userProfile.baseWalkingSpeed / averageAccuracy * timeAdjustment;
  };

  // お気に入り場所管理
  const addFavoriteLocation = (location: Omit<SavedLocation, 'id'>) => {
    const newLocation: SavedLocation = {
      ...location,
      id: Date.now().toString()
    };
    
    const updatedProfile = {
      ...userProfile,
      favoriteLocations: [...userProfile.favoriteLocations, newLocation]
    };
    
    saveUserProfile(updatedProfile);
  };

  const removeFavoriteLocation = (id: string) => {
    const updatedProfile = {
      ...userProfile,
      favoriteLocations: userProfile.favoriteLocations.filter(loc => loc.id !== id)
    };
    
    saveUserProfile(updatedProfile);
  };

  // 基本統計情報
  const getWalkingStats = () => {
    const history = userProfile.walkingHistory;
    
    if (history.length === 0) return null;

    const totalWalks = history.length;
    const averageAccuracy = history.reduce((sum, record) => 
      sum + record.accuracy, 0) / totalWalks;
    
    const recentAccuracy = history.slice(-5).reduce((sum, record) => 
      sum + record.accuracy, 0) / Math.min(5, history.length);

    return {
      totalWalks,
      averageAccuracy,
      recentAccuracy,
      isImproving: recentAccuracy < averageAccuracy // 精度が良い = accuracyが1に近い = 小さい値
    };
  };

  return {
    userProfile,
    saveUserProfile,
    addWalkingHistory,
    calculatePersonalWalkingSpeed,
    addFavoriteLocation,
    removeFavoriteLocation,
    getWalkingStats
  };
};