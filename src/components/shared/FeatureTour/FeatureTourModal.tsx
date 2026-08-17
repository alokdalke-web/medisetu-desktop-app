import React, { useState, useEffect } from "react";
import { IoClose, IoArrowForward, IoArrowBack } from "react-icons/io5";
import { Modal, ModalContent, ModalBody } from "@heroui/react";

export interface FeatureStep {
  id: number | string;
  title: string;
  subtitle: string;
  bulletPoints: string[];
  leftContent?: React.ReactNode;
  image?: string;
  targetElementId?: string; // Element to highlight/scroll to
  navigateTo?: string; // Route to navigate to for this step
}

interface FeatureTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: FeatureStep[];
  onComplete?: () => void;
  primaryColor?: string;
  showStepNavigation?: boolean; // Whether to show step navigation dots
}

export const FeatureTourModal: React.FC<FeatureTourModalProps> = ({
  isOpen,
  onClose,
  steps,
  onComplete,
  primaryColor = "#30887C",
  showStepNavigation = true,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  // Reset step when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setVisitedSteps(new Set([0]));
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isAnimating) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          const stepIndex = parseInt(e.key) - 1;
          if (stepIndex < steps.length) {
            handleStepClick(stepIndex);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, steps.length, onClose, onComplete, isAnimating]);

  // Highlight target element if specified
  useEffect(() => {
    if (!isOpen || !steps[currentStep]?.targetElementId) return;

    const elementId = steps[currentStep].targetElementId;
    if (elementId) {
      const element = document.querySelector(elementId);
      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight effect
        element.classList.add('tour-highlight');
        setTimeout(() => {
          element.classList.remove('tour-highlight');
        }, 2000);
      }
    }
  }, [currentStep, isOpen, steps]);

  const handleNext = async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    if (currentStep < steps.length - 1) {
      // Mark step as visited
      setVisitedSteps(prev => new Set([...prev, currentStep + 1]));
      
      // Add a small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 150));
      setCurrentStep(currentStep + 1);
    } else {
      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
    }
    
    setIsAnimating(false);
  };

  const handlePrevious = async () => {
    if (isAnimating || currentStep === 0) return;
    
    setIsAnimating(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setCurrentStep(currentStep - 1);
    setIsAnimating(false);
  };

  const handleStepClick = async (stepIndex: number) => {
    if (isAnimating || stepIndex === currentStep) return;
    
    setIsAnimating(true);
    
    // Mark step as visited
    setVisitedSteps(prev => new Set([...prev, stepIndex]));
    
    await new Promise(resolve => setTimeout(resolve, 150));
    setCurrentStep(stepIndex);
    
    setIsAnimating(false);
  };

  // Prevent rendering if no steps
  if (!steps.length || !isOpen) return null;

  const step = steps[currentStep];
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Add CSS for highlight effect */}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
          .tour-highlight {
            animation: pulseHighlight 2s ease-in-out;
            box-shadow: 0 0 0 4px ${primaryColor}40;
          }
          @keyframes pulseHighlight {
            0%, 100% {
              box-shadow: 0 0 0 4px ${primaryColor}40;
            }
            50% {
              box-shadow: 0 0 0 8px ${primaryColor}20;
            }
          }
          .step-dot {
            transition: all 0.3s ease;
          }
          .step-dot:hover {
            transform: scale(1.2);
          }
        `}
      </style>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="5xl"
        hideCloseButton
        backdrop="blur"
        classNames={{
          base: `max-w-[1200px] h-[600px] overflow-hidden rounded-[32px] transition-all duration-300 ${
            isAnimating ? "opacity-90" : "opacity-100"
          }`,
          body: "p-0",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent>
          <ModalBody>
            <div className="flex h-full w-full bg-white">
              {/* Left Side - Visual Content */}
              <div
                className="relative hidden w-1/2 overflow-hidden lg:block transition-all duration-300"
                style={{ backgroundColor: primaryColor }}
              >
                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-10">
                  <div className="h-full w-full" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }} />
                </div>
                
                {/* Main Image/Content */}
                <div className="relative z-10 flex h-full w-full items-center justify-center p-8">
                  {step.leftContent ? (
                    <div className="w-full h-full flex items-center justify-center animate-fadeIn">
                      {step.leftContent}
                    </div>
                  ) : step.image ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="max-h-[80%] max-w-[80%] object-contain rounded-xl shadow-2xl animate-fadeIn"
                      />
                      {/* Floating highlight effect */}
                      <div
                        className="absolute -inset-4 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-xl"
                        style={{ backgroundColor: primaryColor }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl animate-fadeIn">
                      <span className="text-6xl font-bold text-white">
                        {currentStep + 1}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Step Counter */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-black/20 px-4 py-2 backdrop-blur-sm">
                    <span className="text-sm font-medium text-white">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side - Text Content */}
              <div className="relative flex w-full flex-col justify-center p-8 lg:w-1/2 lg:p-12 xl:p-16">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute right-6 top-6 z-10 rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 active:scale-95"
                  aria-label="Close tour"
                >
                  <IoClose className="h-6 w-6" />
                </button>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      {step.id || `Step ${currentStep + 1}`}
                    </span>
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: primaryColor }}
                    >
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  
                  {/* Main Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progressPercentage}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                  
                  {/* Step Navigation Dots */}
                  {showStepNavigation && steps.length > 1 && (
                    <div className="mt-6 flex justify-between px-1">
                      {steps.map((stepItem, index) => (
                        <button
                          key={index}
                          onClick={() => handleStepClick(index)}
                          disabled={isAnimating}
                          className="group relative flex flex-col items-center focus:outline-none"
                          aria-label={`Go to step ${index + 1}: ${stepItem.title}`}
                        >
                          <div className="step-dot">
                            <div
                              className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${
                                index === currentStep
                                  ? "scale-125 border-white ring-4"
                                  : visitedSteps.has(index)
                                  ? "border-gray-300"
                                  : "border-gray-200"
                              }`}
                              style={{
                                backgroundColor: index === currentStep 
                                  ? primaryColor 
                                  : visitedSteps.has(index) 
                                    ? primaryColor + "40" 
                                    : "transparent",
                                ...(index === currentStep && {
                                  boxShadow: `0 0 0 4px ${primaryColor}30`,
                                }),
                              }}
                            />
                          </div>
                          <span
                            className={`mt-2 text-xs font-medium transition-colors ${
                              index === currentStep
                                ? "text-gray-900"
                                : visitedSteps.has(index)
                                ? "text-gray-600"
                                : "text-gray-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                          {/* Tooltip on hover */}
                          <div className="absolute -top-10 z-20 hidden w-48 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                            <div className="font-semibold">{stepItem.title}</div>
                            <div className="mt-1 text-gray-300">{stepItem.subtitle.substring(0, 50)}...</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold leading-tight text-gray-900 lg:text-4xl animate-fadeIn">
                    {step.title}
                  </h2>
                  <p className="text-lg leading-relaxed text-gray-600 lg:text-xl animate-fadeIn">
                    {step.subtitle}
                  </p>

                  <ul className="space-y-4">
                    {step.bulletPoints.map((point, index) => (
                      <li 
                        key={index} 
                        className="flex items-start space-x-3 animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: primaryColor + "20" }}>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: primaryColor }}
                          />
                        </div>
                        <span className="text-base leading-relaxed text-gray-700 lg:text-lg">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-8">
                    <div className="flex items-center space-x-4">
                      {!isFirstStep && (
                        <button
                          onClick={handlePrevious}
                          disabled={isAnimating}
                          className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <IoArrowBack className="h-5 w-5" />
                          <span className="font-medium">Previous</span>
                        </button>
                      )}
                      
                      {/* Quick Step Navigation Buttons */}
                      {steps.length > 2 && (
                        <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
                          {currentStep > 0 && (
                            <button
                              onClick={() => handleStepClick(0)}
                              disabled={isAnimating}
                              className="rounded-full px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              First
                            </button>
                          )}
                          {currentStep < steps.length - 1 && (
                            <button
                              onClick={() => handleStepClick(steps.length - 1)}
                              disabled={isAnimating}
                              className="rounded-full px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Last
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      {!isLastStep && (
                        <span className="text-sm text-gray-500">
                          Step {currentStep + 1} of {steps.length}
                        </span>
                      )}
                      <button
                        onClick={handleNext}
                        disabled={isAnimating}
                        className="flex items-center space-x-2 rounded-full px-10 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span>{isLastStep ? "Get Started" : "Next"}</span>
                        {!isLastStep && <IoArrowForward className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
