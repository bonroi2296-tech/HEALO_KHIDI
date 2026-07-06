/**
 * 문의 모드 선택 컴포넌트
 */
import { Bot, Headset, ClipboardList } from 'lucide-react';

export function ModeSelector({ onSelectMode }) {
  const modes = [
    {
      id: 'chat',
      icon: <Bot className="w-8 h-8 text-teal-700" />,
      title: 'AI Consultation',
      description: 'Chat with our AI assistant about your treatment options',
      badge: 'Instant',
    },
    {
      id: 'human',
      icon: <Headset className="w-8 h-8 text-blue-600" />,
      title: 'Human Expert',
      description: 'Connect with our medical coordinators for personalized guidance',
      badge: 'Recommended',
    },
    {
      id: 'form',
      icon: <ClipboardList className="w-8 h-8 text-purple-600" />,
      title: 'Quick Form',
      description: 'Submit your inquiry via a simple form and get matched with specialists',
      badge: 'Fast',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-3">
          How would you like to proceed?
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Choose the option that works best for you
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border-2 border-transparent hover:border-teal-500 text-left"
            >
              {mode.badge && (
                <span className="inline-block bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                  {mode.badge}
                </span>
              )}

              <div className="mb-4">{mode.icon}</div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{mode.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
