'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, User, Calendar, Globe, ChevronDown,
  UserPlus, CheckCircle, Clock, AlertCircle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const STATUS_MAP = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  reviewing: { label: '검토 중', color: 'bg-blue-100 text-blue-800' },
  doctor_assigned: { label: '의사 배정', color: 'bg-green-100 text-green-800' },
  scheduled: { label: '상담 예정', color: 'bg-teal-100 text-teal-800' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-600' },
};

const CANCER_TYPES = {
  stomach: '위암', liver: '간암', lung: '폐암',
  breast: '유방암', thyroid: '갑상선암', colorectal: '대장암',
};

export default function IntakesPage() {
  const router = useRouter();
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    const fetchIntakes = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        // Fetch from consultation sessions that need doctor assignment
        const res = await fetch(`/api/khidi/consultation?limit=100`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.ok) {
          setIntakes(data.data || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchIntakes();
  }, []);

  const filteredIntakes = intakes.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'pending') return i.status === 'scheduled' && !i.doctor_id;
    if (filter === 'assigned') return i.doctor_id;
    return i.status === filter;
  });

  const handleAssignDoctor = async (intakeId) => {
    setAssigning(intakeId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`/api/khidi/consultation/${intakeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          notes: '[코디네이터] 의사 배정 대기 중',
        }),
      });
    } catch (e) { console.error(e); }
    setAssigning(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">인테이크 관리</h1>
        <p className="text-gray-500 text-sm mt-1">카자흐스탄 암환자 사전상담 접수를 검토하고 의사를 배정합니다.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'pending', label: '의사 미배정' },
          { key: 'assigned', label: '배정 완료' },
          { key: 'all', label: '전체' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
              filter === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                {intakes.filter(i => i.status === 'scheduled' && !i.doctor_id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Intake list */}
      {filteredIntakes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">해당 조건의 인테이크가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIntakes.map(intake => {
            const isExpanded = expandedId === intake.id;
            const patientInfo = intake.cancer_patient_intakes?.[0];
            return (
              <div key={intake.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Summary */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : intake.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {patientInfo?.first_name || 'Patient'} — {CANCER_TYPES[patientInfo?.cancer_type] || patientInfo?.cancer_type || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">
                            Stage {patientInfo?.cancer_stage || 'N/A'}
                          </span>
                          <span className="text-xs text-gray-300">|</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Globe size={10} />
                            {intake.patient_language?.toUpperCase() || 'RU'}
                          </span>
                          <span className="text-xs text-gray-300">|</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {intake.scheduled_at ? new Date(intake.scheduled_at).toLocaleDateString('ko-KR') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {intake.doctor_id ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                          <CheckCircle size={12} /> 배정완료
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium flex items-center gap-1">
                          <Clock size={12} /> 대기
                        </span>
                      )}
                      <ChevronDown size={16} className={`text-gray-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {/* Patient details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">암종</div>
                        <div className="text-sm font-medium">{CANCER_TYPES[patientInfo?.cancer_type] || patientInfo?.cancer_type || '-'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">병기</div>
                        <div className="text-sm font-medium">Stage {patientInfo?.cancer_stage || '-'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">상담 유형</div>
                        <div className="text-sm font-medium">
                          {intake.session_type === 'pre_consultation' ? '사전상담' :
                           intake.session_type === 'follow_up' ? '추후진료' : intake.session_type || '-'}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">언어</div>
                        <div className="text-sm font-medium">{intake.patient_language?.toUpperCase() || 'RU'} → {intake.doctor_language?.toUpperCase() || 'KO'}</div>
                      </div>
                    </div>

                    {/* Notes */}
                    {intake.notes && (
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">메모</div>
                        <div className="text-sm text-gray-600">{intake.notes}</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {!intake.doctor_id && (
                        <button
                          onClick={() => handleAssignDoctor(intake.id)}
                          disabled={assigning === intake.id}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                        >
                          <UserPlus size={16} />
                          {assigning === intake.id ? '처리 중...' : '의사 배정'}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/consultation/${intake.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                      >
                        상세 보기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
