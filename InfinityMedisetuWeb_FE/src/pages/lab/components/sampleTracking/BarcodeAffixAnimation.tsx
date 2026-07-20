import { motion } from "framer-motion";

export function BarcodeAffixAnimation() {
  return (
    <div className="relative w-full h-36 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden py-4 shadow-inner">
      {/* Laser scanline animation */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-emerald-500/60 shadow-[0_0_8px_#10b981] z-10"
        animate={{
          top: ["10%", "90%", "10%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative flex items-center justify-center w-full h-full">
        {/* Test Tube Container */}
        <div className="relative w-10 h-24 border-3 border-slate-300 rounded-b-full bg-white/80 flex flex-col items-center justify-start p-1 shadow-md">
          {/* Liquid inside the tube */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-sky-200/50 rounded-b-full"
            style={{ originY: 1 }}
            animate={{
              height: ["45%", "48%", "45%"]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Cap */}
          <div className="absolute top-0 w-full h-4 bg-rose-500 rounded-t-md border-b border-rose-600 shadow-xs" />

          {/* Label Placement Area */}
          <div className="w-7 h-12 border border-dashed border-slate-300 rounded-sm mt-3 flex items-center justify-center bg-slate-50/30">
            <span className="text-[7px] font-bold text-slate-350 text-center uppercase leading-none">Label Zone</span>
          </div>
        </div>

        {/* Sticker label flying and wrapping onto the tube */}
        <motion.div
          className="absolute w-16 h-10 bg-white border-2 border-slate-400 rounded shadow-lg flex flex-col items-center justify-center p-1 z-20"
          animate={{
            x: [80, 0, -8, -8],
            y: [-20, 8, 8, 8],
            opacity: [0, 1, 1, 1],
            scale: [0.8, 1.05, 1, 1],
            rotate: [15, 5, 0, 0]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 1,
            ease: "easeInOut"
          }}
        >
          {/* Mimic barcode lines */}
          <div className="w-full flex justify-between h-4">
            <div className="w-1 bg-slate-900 h-full" />
            <div className="w-0.5 bg-slate-950 h-full" />
            <div className="w-1.5 bg-slate-900 h-full" />
            <div className="w-0.5 bg-slate-950 h-full" />
            <div className="w-1 bg-slate-900 h-full" />
            <div className="w-1.5 bg-slate-950 h-full" />
            <div className="w-0.5 bg-slate-900 h-full" />
          </div>
          <div className="text-[5px] font-bold font-mono mt-0.5 scale-90 text-slate-650 leading-none">TST COLLECT</div>
        </motion.div>
      </div>
    </div>
  );
}
