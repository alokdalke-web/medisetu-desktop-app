import { Spinner } from "@heroui/react";

export default function Loader() {
    return (
        <div className="flex justify-center rounded-xl border border-slate-200 py-16">
            <Spinner label="Fetching requests..." />
        </div>
    )
}