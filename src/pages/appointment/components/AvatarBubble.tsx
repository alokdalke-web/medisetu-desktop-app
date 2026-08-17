import { Avatar } from "@heroui/react";
import React from "react";
import { FiUser } from "react-icons/fi";

const AvatarBubble: React.FC<{ src?: string | null }> = ({ src }) => {
  if (typeof src === "string" && src.trim().length > 0) {
    return <Avatar src={src} radius="full" size="md" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
      <FiUser className="h-6 w-6" />
    </div>
  );
};

export default AvatarBubble;
