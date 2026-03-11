"use client";

// src/components/AddressInput.jsx
// Daum Postcode 기반 주소 입력 (관리자용)

import React, { useState } from 'react';
import DaumPostcode from 'react-daum-postcode';
import { MapPin, X } from 'lucide-react';

export const AddressInput = ({
  value,
  onChange,
  onLocationSelect, // { koAddress, enAddress, zonecode } 전달
  placeholder = "한국어 주소를 검색하세요 (예: 강남구 테헤란로 123)",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleComplete = (data) => {
    const koAddress = data.address || '';
    const enAddress = data.addressEnglish || '';
    const zonecode = data.zonecode || '';

    onChange?.(koAddress);
    onLocationSelect?.({ koAddress, enAddress, zonecode });
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs font-bold text-teal-600 px-2 py-1 rounded border border-teal-200 hover:bg-teal-50 transition"
          >
            검색
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-700">주소 검색</h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3">
              <DaumPostcode onComplete={handleComplete} style={{ width: '100%', height: '420px' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
