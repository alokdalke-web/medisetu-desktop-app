import React from "react";
import { Card, CardBody } from "@heroui/react";
import { FiClock } from "react-icons/fi";

interface ComingSoonBannerProps {
  title?: string;
  description?: string;
}

const ComingSoonBanner: React.FC<ComingSoonBannerProps> = ({
  title = "Feature Coming Soon",
  description = "We are working hard to bring this feature to you. Stay tuned!",
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full p-6">
      <Card className="max-w-[500px] w-full bg-gradient-to-br from-emerald-50 to-white border-none shadow-md">
        <CardBody className="flex flex-col items-center text-center py-12 px-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <FiClock className="w-10 h-10 text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
          <p className="text-gray-500 leading-relaxed">
            {description}
          </p>
          <div className="mt-8 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ComingSoonBanner;
