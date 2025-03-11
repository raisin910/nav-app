import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, DirectionsService } from '@react-google-maps/api';

const containerStyle = {
 width: '100%',
 height: '300px'
};

interface MapComponentProps {
 apiKey: string;
 currentLocation?: google.maps.LatLngLiteral | null;
 destinationLocation?: google.maps.LatLngLiteral | null;
 walkingSpeed?: number;
 onRouteUpdate?: (time: number, distance: number) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
 apiKey, 
 currentLocation, 
 destinationLocation,
 walkingSpeed = 80,
 onRouteUpdate
}) => {
 const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
 const [directionsServiceOptions, setDirectionsServiceOptions] = useState<google.maps.DirectionsRequest | null>(null);

 useEffect(() => {
   if (currentLocation && destinationLocation) {
     setDirectionsServiceOptions({
       origin: currentLocation,
       destination: destinationLocation,
       travelMode: google.maps.TravelMode.WALKING
     });
   }
 }, [currentLocation, destinationLocation]);

 const directionsCallback = useCallback(
   (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
     console.log('Directions status:', status);
     console.log('Directions result:', result);
     
     if (status === google.maps.DirectionsStatus.OK && result) {
       setDirections(result);
       const route = result.routes[0];
       if (route?.legs?.[0]) {
         const distance = route.legs[0].distance?.value || 0;
         const estimatedTimeMinutes = Math.round(distance / walkingSpeed);
         onRouteUpdate?.(estimatedTimeMinutes, distance);
       }
     } else {
       console.error('Directions request failed:', status);
     }
   },
   [walkingSpeed, onRouteUpdate]
 );

 return (
   <div className="rounded-lg overflow-hidden" style={containerStyle}>
     <GoogleMap
       mapContainerStyle={containerStyle}
       center={currentLocation || { lat: 35.6812362, lng: 139.7671248 }}
       zoom={15}
     >
       {directionsServiceOptions && (
         <DirectionsService
           options={directionsServiceOptions}
           callback={directionsCallback}
         />
       )}
       
       {directions && (
         <DirectionsRenderer
           directions={directions}
           options={{
             suppressMarkers: true,
             polylineOptions: {
               strokeColor: "#4285F4",
               strokeWeight: 4
             }
           }}
         />
       )}

       {currentLocation && (
         <Marker
           position={currentLocation}
           icon={{
             path: google.maps.SymbolPath.CIRCLE,
             scale: 10,
             fillColor: '#4285F4',
             fillOpacity: 1,
             strokeColor: '#ffffff',
             strokeWeight: 2,
           }}
         />
       )}
       
       {destinationLocation && (
         <Marker
           position={destinationLocation}
           icon={{
             path: google.maps.SymbolPath.CIRCLE,
             scale: 10,
             fillColor: '#EA4335',
             fillOpacity: 1,
             strokeColor: '#ffffff',
             strokeWeight: 2,
           }}
         />
       )}
     </GoogleMap>
   </div>
 );
};

export default MapComponent;