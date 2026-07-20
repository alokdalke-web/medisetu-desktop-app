
import { FaArrowRight, FaArrowLeft, FaFloppyDisk, FaCheck } from "react-icons/fa6";
import { Button } from "@heroui/react";

interface StepFormLayoutProps {
    stepId: number;
    title: string;
    description: string;
    isLastStep: boolean;
    onNext: () => void;
    onPrevious: () => void;
}

export default function StepFormLayout({
    stepId,
    title,
    description,
    isLastStep,
    onNext,
    onPrevious
}: StepFormLayoutProps) {

    return (
        <div className="w-full animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col lg:flex-row gap-8 items-stretch">

                {/* Main Form Area */}
                <div className="w-full lg:w-2/3 bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 md:p-10 flex flex-col min-h-[500px]">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
                        <p className="text-slate-500 mt-2">{description}</p>
                    </div>

                    {/* Placeholder Form Content - Demonstrating the new design system */}
                    <div className="flex-1 space-y-6">
                        {/* Example Input Group 1 */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Clinic Name</label>
                            <input
                                type="text"
                                placeholder="Enter your clinic name"
                                className="w-full h-[52px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition-all shadow-sm placeholder:text-slate-400"
                            />
                        </div>

                        {/* Example Input Group 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Specialization</label>
                                <select className="w-full h-[52px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition-all shadow-sm appearance-none">
                                    <option>Select specialization</option>
                                    <option>General Physician</option>
                                    <option>Dentist</option>
                                    <option>Cardiologist</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Experience (Years)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 5"
                                    className="w-full h-[52px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition-all shadow-sm placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Example Toggle/Switch */}
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between mt-4">
                            <div>
                                <h4 className="font-semibold text-slate-700 text-sm">Accept Online Appointments</h4>
                                <p className="text-xs text-slate-500 mt-1">Allow patients to book directly from your profile.</p>
                            </div>
                            <div className="w-12 h-6 bg-teal-500 rounded-full relative cursor-pointer shadow-inner">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md py-4 sm:py-0 sm:bg-transparent">
                        <Button
                            variant="flat"
                            className={`font-semibold h-[48px] px-6 rounded-xl ${stepId === 1 ? 'invisible' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} w-full sm:w-auto`}
                            onPress={onPrevious}
                            startContent={<FaArrowLeft />}
                        >
                            Previous Step
                        </Button>

                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Button
                                variant="bordered"
                                className="font-semibold h-[48px] px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 w-full sm:w-auto"
                                startContent={<FaFloppyDisk />}
                            >
                                Save Draft
                            </Button>

                            <Button
                                className="font-semibold h-[48px] px-8 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg hover:shadow-teal-500/30 w-full sm:w-auto hover:scale-[1.02] transition-transform"
                                onPress={onNext}
                                endContent={isLastStep ? <FaCheck /> : <FaArrowRight />}
                            >
                                {isLastStep ? "Finish Setup" : "Continue"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Helper/Illustration */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[24px] p-8 border border-indigo-100 shadow-sm h-full flex flex-col justify-center relative overflow-hidden">
                        {/* Decorative background circle */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/50 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl mb-6 text-indigo-500 border border-indigo-50">
                                💡
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">Why this matters</h3>
                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                Providing accurate details here helps patients find your clinic easily and builds trust before they even book an appointment. Complete profiles see a <span className="font-semibold text-indigo-600">3x increase</span> in bookings.
                            </p>

                            <div className="p-4 bg-white/60 rounded-xl border border-white backdrop-blur-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <FaCheck className="text-[10px]" />
                                    </div>
                                    <p className="text-xs font-medium text-slate-700">Your information is securely stored and HIPAA compliant.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
