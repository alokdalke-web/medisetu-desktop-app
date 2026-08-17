import { useState, type ChangeEvent } from "react";
import { Button, Input } from "@heroui/react";

import ImageFilter from "./imageFilter";
import { title } from "../../components/primitives";

const UploadImage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      return;
    }

    setUploadedFile(selectedFile);
  };

  if (uploadedFile) {
    return (
      <ImageFilter
        imageFile={uploadedFile}
        onBack={() => {
          setUploadedFile(null);
        }}
      />
    );
  }

  return (
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-lg text-center justify-center">
          <h1 className={title()}>Upload Image</h1>
        </div>
        <Input
          accept="image/*"
          className="mt-4"
          type="file"
          onChange={handleImageUpload}
        />
        <Button
          className="mt-4"
          color="primary"
          isDisabled={!selectedFile}
          onClick={handleUpload}
        >
          Upload
        </Button>
      </section>
  );
};

export default UploadImage;
