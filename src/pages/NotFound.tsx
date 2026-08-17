import { useNavigate } from "react-router";
import AppButton from "../components/shared/AppButton";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-3xl animate-pulse-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-2xl"></div>
      </div>
<div className="relative z-10 text-center max-w-2xl mx-auto px-4">
  {/* Animated 404 */}
  <div className="relative mb-6">
 <h1 className="text-[140px] sm:text-[180px] md:text-[220px] font-bold text-primary-hover leading-none select-none">
  404
</h1>

  </div>

  {/* Content */}
  <div className="space-y-5 animate-fade-in">
    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900">
      Oops! Lost in Space
    </h2>

    <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-md mx-auto">
      The page you’re looking for drifted off into the void.
    </p>

    {/* Button */}
<div className="flex justify-center pt-6">
  <AppButton
    onClick={() => navigate(-1)}
    text="Go Back"
    className="px-14 py-8 text-lg md:text-xl rounded-full"
  />
</div>

  </div>
</div>


      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-20px) rotate(12deg);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-delayed {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-pulse-delayed {
          animation: pulse-delayed 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          animation-delay: 700ms;
        }
      `}</style>
    </div>
  );
};

export default NotFound;