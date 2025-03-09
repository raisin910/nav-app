import React, { useState, useRef } from 'react';
import { MapPin, Clock, Settings, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import MapComponent from './MapComponent';
import { Autocomplete, LoadScript } from '@react-google-maps/api';

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
  const [startLocation, setStartLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [endLocation, setEndLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [startLocationName, setStartLocationName] = useState<string>('');
  const [endLocationName, setEndLocationName] = useState<string>('');

  const GOOGLE_MAPS_API_KEY = 'AIzaSyBfOE--43i1IKCjJB9534ew3a_KCpdYGoo';

  // NavAppPreviewコンポーネント内でgetCurrentLocation関数を修正
const getCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentPosition(pos);
        setStartLocation(pos);
        
        // 現在地の住所を取得して表示
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { location: pos },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
              setStartLocationName(results[0].formatted_address);
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
          <span className="text-sm">現在地を使用</span>
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
              defaultValue={startLocationName}
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
              defaultValue={endLocationName}
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
  const selectedPaceOption = paceOptions.find(pace => pace.id === selectedPace);
  const adjustedTime = estimatedTime 
    ? Math.round(estimatedTime / (selectedPaceOption?.speedMultiplier || 1))
    : null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <MapComponent 
          apiKey={GOOGLE_MAPS_API_KEY} 
          currentLocation={currentPosition || startLocation}
          destinationLocation={endLocation}
          walkingSpeed={walkingSpeed * (selectedPaceOption?.speedMultiplier || 1)}
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
    </div>
  </LoadScript>
);
};

export default NavAppPreview;