import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StepKey } from '../components/onboarding/types';

interface OnboardingContextType {
  activeStep: StepKey | null;
  setActiveStep: (step: StepKey) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);

  return (
    <OnboardingContext.Provider value={{ activeStep, setActiveStep }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingStep = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingStep must be used within OnboardingProvider');
  }
  return context;
};
