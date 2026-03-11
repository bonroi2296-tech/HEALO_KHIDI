"use client";

// src/components/GoogleMap.jsx
import React, { useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '200px',
};

// 서울 기본 좌표 (강남구)
const defaultCenter = {
  lat: 37.4979,
  lng: 127.0276,
};

// 위치 문자열을 간단히 파싱 (예: "Gangnam, Seoul" -> 강남구 좌표)
const parseLocation = (location) => {
  if (!location) return defaultCenter;
  
  const lower = location.toLowerCase();
  // 간단한 위치 매핑 (추후 Geocoding API로 개선 가능)
  if (lower.includes('gangnam') || lower.includes('강남')) {
    return { lat: 37.4979, lng: 127.0276 };
  }
  if (lower.includes('sinsa') || lower.includes('신사')) {
    return { lat: 37.5161, lng: 127.0193 };
  }
  if (lower.includes('seoul') || lower.includes('서울')) {
    return { lat: 37.5665, lng: 126.9780 }; // 서울시청
  }
  
  return defaultCenter;
};

export const GoogleMapComponent = ({ location, hospitalName, latitude, longitude }) => {
  const apiKey =
    (typeof process !== "undefined" &&
      process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
    (typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : undefined);

  // 좌표가 있으면 우선 사용, 없으면 주소 파싱
  const center = useMemo(() => {
    if (latitude && longitude) {
      return { lat: Number(latitude), lng: Number(longitude) };
    }
    return parseLocation(location);
  }, [location, latitude, longitude]);

  // ✅ 개발 환경에서는 Google Maps를 아예 로드하지 않음 (콘솔 에러 방지)
  const isDev = process.env.NODE_ENV !== "production";
  const shouldLoadMaps = !isDev && apiKey; // 프로덕션 + API 키 있을 때만 로드
  
  // ✅ useLoadScript 훅 사용 (프로덕션에서만)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: shouldLoadMaps ? apiKey : '',
    preventGoogleFontsLoading: true,
    id: 'google-map-script',
    // 개발 환경에서는 스크립트 로드 스킵
    loadScriptExternally: false,
  });

  // ✅ 개발 환경에서는 바로 Fallback UI 표시 (콘솔 에러 없음)
  if (isDev) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full min-h-[200px] flex items-center justify-center relative overflow-hidden">
        {/* Fallback Map Illustration */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="3" fill="currentColor" className="text-teal-600" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-400" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-gray-300" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-3 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm font-bold text-gray-700">
              {hospitalName || 'Hospital Location'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {location || 'Seoul, Korea'}
            </p>
          </div>
          
          <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <p>📍 Dev Mode: Map preview disabled</p>
            <p className="mt-1 text-gray-400">Maps will load in production</p>
          </div>
        </div>
      </div>
    );
  }

  // API 키가 없으면 placeholder 표시 (프로덕션)
  if (!apiKey) {
    return (
      <div className="bg-gray-100 w-full h-full min-h-[200px] flex items-center justify-center text-gray-400 font-bold">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs">Google Maps API key required</span>
          <span className="text-[10px] text-gray-300">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env
          </span>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin text-teal-600" />
          <span className="text-xs text-gray-500">Loading map...</span>
        </div>
      </div>
    );
  }

  // 로드 에러 (결제 미설정 포함)
  if (loadError) {
    const isBillingError = loadError.message?.includes('BillingNotEnabled');
    
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-full h-full min-h-[200px] flex items-center justify-center relative overflow-hidden">
        {/* Fallback Map Illustration */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="3" fill="currentColor" className="text-teal-600" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-400" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-gray-300" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-3 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm font-bold text-gray-700">
              {hospitalName || 'Hospital Location'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {location || 'Seoul, Korea'}
            </p>
          </div>
          
          {isDev && isBillingError && (
            <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <p className="font-bold">⚠️ Dev Mode: Google Maps billing not enabled</p>
              <p className="mt-1 text-gray-600">Set up billing in Google Cloud Console to enable maps</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 지도 렌더링
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      }}
    >
      <Marker
        position={center}
        title={hospitalName || 'Hospital Location'}
        icon={{
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        }}
      />
    </GoogleMap>
  );
};
