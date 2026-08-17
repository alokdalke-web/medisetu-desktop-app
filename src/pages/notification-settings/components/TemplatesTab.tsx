import React from "react";
import { FiEdit2, FiEye } from "react-icons/fi";

import { NOTIFICATION_TEMPLATES } from "../constants";

const TemplatesTab: React.FC = () => (
  <div className="space-y-4">
    <p className="text-[12px] text-slate-500">
      Message templates used for patient communications. Customize content,
      channel, and delivery for each template.
    </p>

    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {/* Table header */}
      <div className="grid min-w-[540px] grid-cols-[1fr_110px_80px_90px_72px] gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:px-5">
        <div>Template</div>
        <div>Channel</div>
        <div>Status</div>
        <div>Updated</div>
        <div className="text-center">Actions</div>
      </div>

      {/* Rows */}
      <div className="min-w-[540px] divide-y divide-slate-50">
        {NOTIFICATION_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="grid grid-cols-[1fr_110px_80px_90px_72px] items-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50/50 sm:px-5"
          >
            <span className="text-[13px] font-medium text-slate-800 truncate">
              {template.name}
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              {template.channel}
            </span>
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                template.status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {template.status === "active" ? "Active" : "Draft"}
            </span>
            <span className="text-[11px] text-slate-400">
              {template.lastUpdated}
            </span>
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Preview ${template.name}`}
              >
                <FiEye className="text-[13px]" />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label={`Edit ${template.name}`}
              >
                <FiEdit2 className="text-[13px]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TemplatesTab;
