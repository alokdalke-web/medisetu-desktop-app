import { FiPlus } from "react-icons/fi";

const AddNewLabCard = ({ onClick, id }: { onClick: () => void; id?: string }) => {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="group flex min-h-[228px] w-full items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-white">
          <FiPlus className="text-[22px]" />
        </div>
        <div className="mt-3 text-sm font-bold text-slate-900 sm:text-[15px]">
          Add New Lab
        </div>
      </div>
    </button>
  );
};

export default AddNewLabCard;
