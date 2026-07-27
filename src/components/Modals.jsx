// src/components/Modals.jsx
import React from 'react';
import { X, Star, ThumbsUp } from 'lucide-react';

// --- [공통] 약관 팝업 ---
export const PolicyModal = ({ isOpen, onClose, title, content, closeLabel }) => {
    if (!isOpen) return null;
    const label = closeLabel ?? "Close";
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-left">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} className="text-gray-500"/></button>
                </div>
                <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm text-gray-600 leading-relaxed h-full text-left">
                    {content}
                </div>
                <div className="p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                    <button onClick={onClose} className="w-full bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 transition">{label}</button>
                </div>
            </div>
        </div>
    );
};

// --- 리뷰 전체보기 팝업 ---
export const ReviewModal = ({ isOpen, onClose, reviews }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
                    <h3 className="text-xl font-bold text-gray-900">All Reviews ({reviews.length})</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={24} className="text-gray-500"/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {reviews.map(review => (
                        <div key={review.id} className="border border-gray-100 rounded-2xl p-5 shadow-sm bg-white">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
                                        {review.name[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900">{review.name}</p>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">{review.country}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{review.date}</p>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 gap-0.5">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor"/>)}
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">{review.content}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <ThumbsUp size={12}/> Helpful ({review.helpful})
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};