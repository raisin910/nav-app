import React, { useState } from 'react';
import { Clock, MapPin, CheckCircle, X } from 'lucide-react';
import { WalkingHistory } from '../hooks/useUserData';

interface ArrivalConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  estimatedTime: number;
  distance: number;
  route: {
    start: string;
    end: string;
    startCoords: google.maps.LatLngLiteral;
    endCoords: google.maps.LatLngLiteral;
  };
  startTime: Date;
  onConfirm: (walkingRecord: Omit<WalkingHistory, 'id'>) => void;
}

const ArrivalConfirmation: React.FC<ArrivalConfirmationProps> = ({
  isOpen,
  onClose,
  estimatedTime,
  distance,
  route,
  startTime,
  onConfirm
}) => {
  const [actualArrivalTime, setActualArrivalTime] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const actualWalkTime = Math.round((actualArrivalTime.getTime() - startTime.getTime()) / 60000);
  const accuracy = estimatedTime > 0 ? actualWalkTime / estimatedTime : 1;
  const timeDifference = actualWalkTime - estimatedTime;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    const walkingRecord: Omit<WalkingHistory, 'id'> = {
      estimatedTime,
      actualTime: actualWalkTime,
      distance,
      route,
      timestamp: actualArrivalTime,
      accuracy
    };

    onConfirm(walkingRecord);
    setIsSubmitting(false);
    onClose();
  };

  const handleTimeAdjustment = (minutes: number) => {
    const newTime = new Date(actualArrivalTime.getTime() + minutes * 60000);
    setActualArrivalTime(newTime);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">到着確認</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* ルート情報 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                <MapPin className="w-4 h-4" />
                <span>ルート</span>
              </div>
              <div className="text-sm">
                <div>{route.start}</div>
                <div className="text-gray-400">↓</div>
                <div>{route.end}</div>
              </div>
            </div>

            {/* 予測時間 vs 実際時間 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-600 mb-1">予測時間</div>
                <div className="font-semibold">{estimatedTime}分</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-600 mb-1">実際時間</div>
                <div className="font-semibold">{actualWalkTime}分</div>
              </div>
            </div>

            {/* 精度表示 */}
            <div className={`rounded-lg p-3 ${
              Math.abs(timeDifference) <= 2 ? 'bg-green-50' :
              Math.abs(timeDifference) <= 5 ? 'bg-yellow-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">予測精度</span>
              </div>
              <div className="text-sm">
                {timeDifference > 0 ? `${timeDifference}分遅れ` :
                 timeDifference < 0 ? `${Math.abs(timeDifference)}分早着` :
                 '時間通り'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                精度: {(accuracy * 100).toFixed(1)}%
              </div>
            </div>

            {/* 到着時間調整 */}
            <div>
              <div className="text-sm text-gray-600 mb-2">実際の到着時間</div>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="time"
                  value={actualArrivalTime.toTimeString().slice(0, 5)}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    const newTime = new Date(actualArrivalTime);
                    newTime.setHours(hours, minutes, 0, 0);
                    setActualArrivalTime(newTime);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                />
                <span className="text-sm text-gray-600">
                  {actualArrivalTime.toLocaleDateString()}
                </span>
              </div>
              
              {/* 時間調整ボタン */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleTimeAdjustment(-5)}
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                >
                  -5分
                </button>
                <button
                  onClick={() => handleTimeAdjustment(-1)}
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                >
                  -1分
                </button>
                <button
                  onClick={() => setActualArrivalTime(new Date())}
                  className="text-xs bg-blue-100 px-2 py-1 rounded"
                >
                  今
                </button>
                <button
                  onClick={() => handleTimeAdjustment(1)}
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                >
                  +1分
                </button>
                <button
                  onClick={() => handleTimeAdjustment(5)}
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                >
                  +5分
                </button>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? '記録中...' : '記録する'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrivalConfirmation;