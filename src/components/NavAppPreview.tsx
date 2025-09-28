import React, { useState, useRef } from 'react';
import { MapPin, Clock, Settings, ChevronLeft, ChevronRight, Search, BarChart3 } from 'lucide-react';
import MapComponent from './MapComponent';
import { Autocomplete, LoadScript } from '@react-google-maps/api';
import { useUserData } from '../hooks/useUserData';
import ArrivalConfirmation from './ArrivalConfirmation';

declare global {
  interface Window {
    google: typeof google;
  }
}

const libraries: ("places" | "geometry" | "drawing")[] = ["places", "geometry"];

interface PaceOption {
  id: 'slow' | 'normal' | 'fast';
  label: string;
  desc: string;
  icon: string;
  speedMultiplier: number;
}

const paceOptions: PaceOption[] = [
  { id: 'slow', label: 'ゆっくり', desc: '通常の0.8倍のペース', icon: '🚶', speedMultiplier: 0.8 },
  { id: 'normal', label: 'ふつう', desc: '通常のペース', icon: '🚶‍♂️', speedMultiplier: 1.0 },
  { id: 'fast', label: '急いで', desc: '通常の1.2倍のペース', icon: '🏃', speedMultiplier: 1.2 }
];

const NavAppPreview = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPace, setSelectedPace] = useState<PaceOption['id']>('normal');
  const [walkingSpeed, setWalkingSpeed] = useState(80);
  
  // 既存の状態はそのまま保持
  const [startLocation, setStartLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [endLocation, setEndLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [startLocationName, setStartLocationName] = useState<string>('');
  const [endLocationName, setEndLocationName] = useState<string>('');
  
  // 新しく追加する状態
  const [routeStartTime, setRouteStartTime] = useState<Date | null>(null);
  const [showArrivalConfirmation, setShowArrivalConfirmation] = useState(false);
  const [activeInputField, setActiveInputField] = useState<'start' | 'end' | null>(null);
  
  // useUserDataフックを使用
  const { 
    userProfile, 
    addWalkingHistory, 
    calculatePersonalWalkingSpeed,
    getWalkingStats,
    addFavoriteLocation,
    removeFavoriteLocation
  } = useUserData();

  // 調整済み時間の計算をコンポーネントレベルに移動
  const selectedPaceOption = paceOptions.find(pace => pace.id === selectedPace);
  const adjustedTime = estimatedTime 
    ? Math.round(estimatedTime / (selectedPaceOption?.speedMultiplier || 1))
    : null;

  // 直接記述していたAPIキーを環境変数に置き換え
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // getCurrentLocation関数を修正
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentPosition(pos);
          
          // 現在地の住所を取得
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: pos },
            (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
                const address = results[0].formatted_address;
                
                // activeInputFieldに基づいて出発地または目的地を設定
                if (activeInputField === 'end') {
                  // 目的地に設定
                  setEndLocation(pos);
                  setEndLocationName(address);
                  // 入力フィールドに直接値を設定
                  const endInput = document.querySelector('input[placeholder="目的地を入力"]') as HTMLInputElement;
                  if (endInput) {
                    endInput.value = address;
                  }
                } else {
                  // 出発地に設定（デフォルト）
                  setStartLocation(pos);
                  setStartLocationName(address);
                  // 入力フィールドに直接値を設定
                  const startInput = document.querySelector('input[placeholder="出発地を入力"]') as HTMLInputElement;
                  if (startInput) {
                    startInput.value = address;
                  }
                }
              }
            }
          );
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error);
        }
      );
    }
  };

  const handleRouteUpdate = (time: number, dist: number) => {
    setEstimatedTime(time);
    setDistance(dist);
  };

  // 経路検索画面
  const RouteSearchScreen = () => {
    const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    return (
      <div className="space-y-4">
        <div className="relative">
          <MapComponent 
            apiKey={GOOGLE_MAPS_API_KEY} 
            currentLocation={currentPosition || startLocation}
            destinationLocation={endLocation}
            walkingSpeed={walkingSpeed}
            onRouteUpdate={handleRouteUpdate}
          />
          <button 
            onClick={getCurrentLocation}
            className="absolute top-2 right-2 bg-white p-2 rounded-lg shadow-lg flex items-center space-x-2"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm">
              {activeInputField === 'end' ? '目的地に現在地' : '出発地に現在地'}
            </span>
          </button>
        </div>

        <div className="space-y-2 bg-white rounded-lg shadow-lg p-4">
          {/* 出発地入力 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <Autocomplete
              onLoad={autocomplete => {
                startAutocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={() => {
                const place = startAutocompleteRef.current?.getPlace();
                if (place?.geometry?.location) {
                  const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                  };
                  setStartLocation(location);
                  if (place.formatted_address) {
                    setStartLocationName(place.formatted_address);
                  }
                }
              }}
            >
              <input
                type="text"
                placeholder="出発地を入力"
                onFocus={() => setActiveInputField('start')}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </Autocomplete>
          </div>

          {/* 目的地入力 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <Autocomplete
              onLoad={autocomplete => {
                endAutocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={() => {
                const place = endAutocompleteRef.current?.getPlace();
                if (place?.geometry?.location) {
                  const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                  };
                  setEndLocation(location);
                  if (place.formatted_address) {
                    setEndLocationName(place.formatted_address);
                  }
                }
              }}
            >
              <input
                type="text"
                placeholder="目的地を入力"
                onFocus={() => setActiveInputField('end')}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </Autocomplete>
          </div>

          {/* 時間設定 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <input
              type="datetime-local"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* お気に入り場所 */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">よく行く場所</h3>
          <div className="grid grid-cols-2 gap-2">
            {['自宅', '会社', 'ジム', 'お気に入り'].map((place) => (
              <button
                key={place}
                className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="text-sm">{place}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setCurrentPage(1)}
          className="w-full py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center space-x-2"
        >
          <Search className="w-5 h-5" />
          <span>ルートを検索</span>
        </button>
      </div>
    );
  };

  // ペース設定画面
  const PaceSettingScreen = () => (
    <div className="space-y-4">
      <div className="text-center text-gray-600 mb-4">
        移動ペースを選択してください
      </div>
      <div className="grid grid-cols-1 gap-3">
        {paceOptions.map((pace) => (
          <button
            key={pace.id}
            onClick={() => setSelectedPace(pace.id)}
            className={`p-4 rounded-lg text-left ${
              selectedPace === pace.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{pace.icon}</span>
              <div>
                <div className="font-medium">{pace.label}</div>
                <div className={`text-sm ${
                  selectedPace === pace.id ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  {pace.desc}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 space-y-2">
        <label className="text-sm text-gray-600">
          基準歩行速度: {walkingSpeed}m/分
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min={30}
            max={120}
            value={walkingSpeed}
            onChange={(e) => setWalkingSpeed(Number(e.target.value))}
            step={1}
            className="flex-1 h-2 bg-gray-200 rounded-lg cursor-pointer"
          />
          <input
            type="number"
            min={30}
            max={120}
            value={walkingSpeed}
            onChange={(e) => setWalkingSpeed(Number(e.target.value))}
            className="w-20 px-2 py-1 border rounded"
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>ゆっくり(30m/分)</span>
          <span>速い(120m/分)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => setCurrentPage(0)}
          className="py-3 bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center space-x-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>
        <button
          onClick={() => setCurrentPage(2)}
          className="py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center space-x-2"
        >
          <span>完了</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // ルート案内画面
  const RouteGuidanceScreen = () => {
    return (
      <div className="space-y-4">
        <div className="relative">
          <MapComponent 
            apiKey={GOOGLE_MAPS_API_KEY} 
            currentLocation={currentPosition || startLocation}
            destinationLocation={endLocation}
            walkingSpeed={calculatePersonalWalkingSpeed() * (selectedPaceOption?.speedMultiplier || 1)}
            onRouteUpdate={handleRouteUpdate}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">予測所要時間</div>
                <div className="text-2xl font-bold text-blue-600">
                  {adjustedTime ? `${adjustedTime}分` : '計算中...'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">距離</div>
                <div className="font-bold">
                  {distance ? `${(distance / 1000).toFixed(1)} km` : '計算中...'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">歩行ペース</div>
              <div className="text-sm text-gray-600">
                {selectedPaceOption?.label} ({selectedPaceOption?.desc})
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">到着予定</div>
              <div className="text-sm text-gray-600">
                {adjustedTime ? new Date(Date.now() + adjustedTime * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '計算中...'}
              </div>
            </div>
          </div>
        </div>

        {/* 学習データと歩行開始ボタン */}
        <div className="bg-white rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium">学習データ</div>
              <div className="text-sm text-gray-600">
                {getWalkingStats() ? 
                  `${getWalkingStats()!.totalWalks}回の歩行データ` : 
                  'データなし'
                }
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">予測精度</div>
              <div className="text-sm text-gray-600">
                {getWalkingStats() ? 
                  `${(getWalkingStats()!.averageAccuracy * 100).toFixed(1)}%` : 
                  'データ不足'
                }
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              setRouteStartTime(new Date());
              // 実際の歩行開始処理をここに追加
            }}
            className="w-full py-3 bg-green-600 text-white rounded-lg"
          >
            歩行開始
          </button>
          
          <button
            onClick={() => setShowArrivalConfirmation(true)}
            className="w-full py-2 bg-blue-100 text-blue-600 rounded-lg text-sm"
          >
            到着を記録
          </button>
        </div>

        <button
          onClick={() => setCurrentPage(1)}
          className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center space-x-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>ペース設定に戻る</span>
        </button>
      </div>
    );
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <div className="w-full max-w-md mx-auto bg-gray-50 rounded-lg overflow-hidden">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold">
            {currentPage === 0 ? "経路検索" :
             currentPage === 1 ? "移動ペース設定" :
             "ルート案内"}
          </h1>
          <Settings className="w-6 h-6" />
        </div>

        <div className="p-4">
          {currentPage === 0 ? <RouteSearchScreen /> : 
           currentPage === 1 ? <PaceSettingScreen /> : 
           currentPage === 2 ? <RouteGuidanceScreen /> : null}
        </div>

        <div className="flex h-1">
          {[0, 1, 2].map((page) => (
            <div
              key={page}
              className={`flex-1 ${
                page <= currentPage ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        {/* 到着確認モーダル */}
        <ArrivalConfirmation
          isOpen={showArrivalConfirmation}
          onClose={() => setShowArrivalConfirmation(false)}
          estimatedTime={adjustedTime || 0}
          distance={distance || 0}
          route={{
            start: startLocationName,
            end: endLocationName,
            startCoords: startLocation || { lat: 0, lng: 0 },
            endCoords: endLocation || { lat: 0, lng: 0 }
          }}
          startTime={routeStartTime || new Date()}
          onConfirm={(walkingRecord) => {
            addWalkingHistory(walkingRecord);
            setShowArrivalConfirmation(false);
          }}
        />
      </div>
    </LoadScript>
  );
};

export default NavAppPreview;