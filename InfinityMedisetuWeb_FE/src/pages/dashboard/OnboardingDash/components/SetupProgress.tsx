import { Card, CardBody, Progress } from "@heroui/react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useState } from "react";

interface SetupProgressProps {
    completed: number;
    total: number;
    percentage: number;
}

export default function SetupProgress({ completed, total, percentage }: SetupProgressProps) {
    const [showCompleted, setShowCompleted] = useState(false);

    return (
        <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <CardBody className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h2 className="text-base font-semibold text-[#0F172A] dark:text-white font-outfit">
                        Your Setup Progress
                    </h2>

                    <div className="flex items-center gap-5 text-xs">
                        <span className="font-outfit">
                            <span className="font-semibold text-primary">
                                {percentage}%
                            </span>{" "}
                            <span className="text-slate-600 dark:text-slate-400">
                                Completed ({completed} of {total})
                            </span>
                        </span>

                        <button 
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-outfit"
                        >
                            {showCompleted ? "Hide Completed" : "View Completed"}
                            {showCompleted ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                        </button>
                    </div>
                </div>

                <Progress
                    value={percentage}
                    color="primary"
                    className="w-full h-2"
                    classNames={{
                        indicator: "bg-primary",
                        track: "bg-slate-200 dark:bg-slate-700",
                    }}
                />
            </CardBody>
        </Card>
    );
}