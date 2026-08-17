import React, { useState } from 'react';
import { IoChevronBack, IoClose } from 'react-icons/io5';

interface WelcomePopupProps {
  onClose: () => void;
}

interface Step {
  id: number;
  title: string;
  subtitle: string;
  bulletPoints: string[];
  leftContent: React.ReactNode;
}

export const WelcomePopup: React.FC<WelcomePopupProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  // const navigate = useNavigate();

  const handleClose = () => {
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const steps: Step[] = [
    {
      id: 1,
      title: 'Your Practice at a MediSetu',
      subtitle: 'Get a real-time overview of your daily activity.',
      bulletPoints: [
        "Today's appointments",
        'Pending lab reports',
        'Quick access to actions',
      ],
      leftContent: (
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <div className="absolute top-8 left-8 flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" fill="white"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <span className="text-white text-2xl font-bold">Dashboard</span>
          </div>
          
          {/* Dashboard Preview */}
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#30887C] rounded-lg"></div>
                  <span className="font-semibold">MediSetu</span>
                </div>
                <div className="text-sm text-gray-500">Dashboard</div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">23,425</div>
                  <div className="text-xs text-gray-600">Patients</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">1,925</div>
                  <div className="text-xs text-gray-600">Visits</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">153</div>
                  <div className="text-xs text-gray-600">Active</div>
                </div>
              </div>

              {/* Chart Placeholder */}
              <div className="bg-gray-50 rounded-lg p-4 h-24 flex items-end justify-between space-x-1">
                {[40, 60, 45, 70, 55, 80, 65, 75, 60, 85, 70, 90].map((height, i) => (
                  <div
                    key={i}
                    className="bg-[#30887C] rounded-t flex-1"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>

              {/* Appointments */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">Upcoming Appointments</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <span>Dr. Aurora Sharma</span>
                    <span className="text-gray-500">10:00 AM</span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <span>Patient Visit</span>
                    <span className="text-gray-500">2:30 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Manage Your Appointments',
      subtitle: 'Schedule, track, and manage all patient appointments.',
      bulletPoints: [
        'Real-time appointment scheduling',
        'Automated reminders',
        'Patient history at a glance',
      ],
      leftContent: (
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <div className="absolute top-8 left-8 flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              📅
            </div>
            <span className="text-white text-2xl font-bold">Appointments</span>
          </div>
          
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="text-lg font-semibold mb-4">Today's Schedule</div>
            {[
              { time: '09:00 AM', patient: 'John Doe', type: 'Consultation' },
              { time: '10:30 AM', patient: 'Jane Smith', type: 'Follow-up' },
              { time: '02:00 PM', patient: 'Mike Johnson', type: 'Check-up' },
              { time: '04:00 PM', patient: 'Sarah Williams', type: 'Consultation' },
            ].map((apt, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium">{apt.patient}</div>
                  <div className="text-sm text-gray-500">{apt.type}</div>
                </div>
                <div className="text-sm font-medium text-[#30887C]">{apt.time}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Pharmacy Management',
      subtitle: 'Streamline your medicine inventory and billing.',
      bulletPoints: [
        'Stock management with alerts',
        'Quick prescription generation',
        'Automated billing system',
      ],
      leftContent: (
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <div className="absolute top-8 left-8 flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              💊
            </div>
            <span className="text-white text-2xl font-bold">Pharmacy</span>
          </div>
          
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="text-lg font-semibold mb-4">Medicine Inventory</div>
            {[
              { name: 'Paracetamol 500mg', stock: 450, status: 'In Stock' },
              { name: 'Amoxicillin 250mg', stock: 89, status: 'Low Stock' },
              { name: 'Ibuprofen 400mg', stock: 320, status: 'In Stock' },
              { name: 'Aspirin 75mg', stock: 15, status: 'Critical' },
            ].map((med, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{med.name}</div>
                  <div className="text-sm text-gray-500">Stock: {med.stock} units</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  med.status === 'In Stock' ? 'bg-green-100 text-green-700' :
                  med.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {med.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Patient Records & Analytics',
      subtitle: 'Access complete patient history and insights.',
      bulletPoints: [
        'Comprehensive patient records',
        'Treatment history tracking',
        'Performance analytics',
      ],
      leftContent: (
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <div className="absolute top-8 left-8 flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              📊
            </div>
            <span className="text-white text-2xl font-bold">Analytics</span>
          </div>
          
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#30887C] to-[#2a7a6f] rounded-full mx-auto flex items-center justify-center text-4xl">
                🎉
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">You're All Set!</h3>
                <p className="text-gray-600 mt-2">
                  Start managing your clinic with MediSetu's powerful features.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] transition-opacity duration-300"
      onClick={handleClose}
    >
      <div
        className="relative bg-[#30887C] rounded-2xl w-[1512px] max-w-[95vw] h-[982px] max-h-[90vh] overflow-hidden shadow-2xl transform transition-all duration-400 opacity-100 rotate-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Logo and Buttons */}
        <div className="absolute top-0 right-0 left-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-white to-transparent">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-[#30887C] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" fill="white"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <IoClose className="w-4 h-4" />
              <span>Skip</span>
            </button>
            <button
              onClick={() => window.open('/guidelines', '_blank')}
              className="px-6 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Check Guidelines
            </button>
          </div>
        </div>

        {/* Main Content - Split Screen */}
        <div className="flex h-full">
          {/* Left Side - Background Image with Preview */}
          <div className="w-1/2 relative overflow-hidden bg-[#30887C]">
             <img 
               src={`${import.meta.env.BASE_URL}assets/images/Mask group.png`} 
               alt="Background Pattern" 
               className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
             />
             <div className="relative z-10 w-full h-full">
                {steps[currentStep].leftContent}
             </div>
          </div>

          {/* Right Side - White Background with Content */}
          <div className="w-1/2 bg-white flex flex-col justify-center p-12 lg:p-16">
            {/* Progress Indicators */}
            <div className="flex space-x-2 mb-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-24 bg-[#30887C]'
                      : index < currentStep
                      ? 'w-16 bg-[#30887C]/50'
                      : 'w-16 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="space-y-6">
              <h2 className="w-[593px] h-[53px] flex gap-1 text-4xl font-bold text-gray-900 leading-tight">
                {steps[currentStep].title}
              </h2>
              <p className="font-['Outfit'] text-[24px] leading-[30px] tracking-[-0.3px] text-gray-600">
                {steps[currentStep].subtitle}
              </p>

              <ul className="space-y-3">
                {steps[currentStep].bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <span className="text-[#30887C] mt-1">•</span>
                    <span className="font-['Outfit'] text-[24px] leading-[48px] tracking-[-0.3px] text-gray-700">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Next Button */}
              <div className="pt-6">
                <button
                  onClick={handleNext}
                  className="px-12 py-4 bg-[#30887C] text-white rounded-full font-medium hover:bg-[#2a7a6f] transition-colors text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
                >
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>

            {/* Navigation Dots (optional) */}
            <div className="flex justify-center space-x-2 mt-12">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <IoChevronBack className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
