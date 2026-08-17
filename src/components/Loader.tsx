type LoaderProps = {
  label?: string;
  className?: string;
};

export default function Loader({ label = "Loading...", className = "" }: LoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 py-16 dark:border-default-100 ${className}`}
    >
      <img src={`${import.meta.env.BASE_URL}loader.gif`} alt="" className="h-16 w-16" />
      <span className="text-sm text-default-400">{label}</span>
    </div>
  );
}
