import { Card, CardBody } from "@heroui/react";
import { FaCircleCheck, FaCircleNotch } from "react-icons/fa6";
import { useNavigate } from "react-router";
import AppButton from "../../../../components/shared/AppButton";

interface SetupItem {
    id: number;
    title: string;
    description: string;
    icon: any;
    status: "completed" | "pending" | "skipped";
    button: string;
    secondary?: string;
    color: string;
    path: string;
}

interface SetupCardProps {
    item: SetupItem;
}

export default function SetupCard({ item }: SetupCardProps) {
    const navigate = useNavigate();
    const Icon = item.icon;

   

    const colorMap: Record<string, string> = {
        emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
        blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
        green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
        sky: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20",
        amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
        rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20",
    };

    const iconColorClass = colorMap[item.color] || colorMap.emerald;

    return (
        <Card className="relative rounded-2xl shadow-sm hover:shadow-md dark:hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardBody className="flex flex-col h-full p-4">
                {/* Step number badge */}
                <div className="absolute left-4 top-4 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {item.id}
                </div>

                {/* Icon */}
                <div className={`mx-auto mt-6 mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconColorClass} transition-colors`}>
                    <Icon className="h-7 w-7" />
                </div>

                {/* Title */}
                <h3 className="text-center font-semibold text-[13px] sm:text-sm text-[#0F172A] dark:text-white font-outfit leading-tight">
                    {item.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-center text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-outfit leading-relaxed min-h-[50px] sm:min-h-[60px]">
                    {item.description}
                </p>

                {/* Status chip */}
                <div className="flex justify-center mb-3 mt-auto">
                    <p
                        className="text-[11px] font-outfit flex gap-2 items-center"
                    >
                        {item.status === "completed" ? (
                            <FaCircleCheck className="text-[11px]" />
                        ) : (
                            <FaCircleNotch className="text-[11px]" />
                        )} {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </p>
                </div>

                {/* Primary button */}
                <AppButton
                    text={item.button}
                    size="sm"
                    buttonVariant={item.status === "completed" ? "outlined" : "primary"}
                    onPress={() => {
                        if (item.path) {
                            navigate(item.path);
                        }
                    }}
                    className="w-full font-outfit text-[12px]"
                />

                {/* Secondary button (optional) */}
                {item.secondary && (
                    <button
                        type="button"
                        className="mt-2 text-[12px] text-primary transition-colors font-outfit font-medium hover:text-primary-hover"
                    >
                        {item.secondary}
                    </button>
                )}
            </CardBody>
        </Card>
    );
}
