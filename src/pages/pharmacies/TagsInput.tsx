import React, { useState, useCallback } from "react";
import { Chip, Input, Button } from "@heroui/react";
import { FiPlus } from "react-icons/fi";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  minTagLength?: number;
  maxTagLength?: number;
  isInvalid?: boolean;
  errorMessage?: string;
}

const TagsInput: React.FC<TagsInputProps> = ({
  value = [],
  onChange,
  placeholder = "Add tag and press Enter",
  maxTags = 20,
  minTagLength = 1,
  maxTagLength = 50,
  isInvalid,
  errorMessage,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  const handleAddTag = useCallback(() => {
    const trimmedTag = inputValue.trim().toLowerCase();
    
    if (!trimmedTag) return;
    
    if (trimmedTag.length < minTagLength) {
      setInputError(`Each tag must be at least ${minTagLength} characters`);
      return;
    }

    if (trimmedTag.length > maxTagLength) {
      setInputError(`Each tag must not exceed ${maxTagLength} characters`);
      return;
    }
    
    if (value.includes(trimmedTag)) {
      setInputValue("");
      setInputError("");
      return; // Duplicate tag
    }
    
    if (value.length >= maxTags) {
      return; // Max tags reached
    }
    
    onChange([...value, trimmedTag]);
    setInputValue("");
    setInputError("");
  }, [
    inputValue,
    value,
    onChange,
    maxTags,
    minTagLength,
    maxTagLength,
  ]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <Chip
            key={tag}
            onClose={() => handleRemoveTag(tag)}
            variant="flat"
            color="primary"
            size="sm"
            className="capitalize"
          >
            {tag}
          </Chip>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onValueChange={(nextValue) => {
            setInputValue(nextValue.slice(0, maxTagLength));
            setInputError("");
          }}
          onKeyDown={handleKeyDown}
          maxLength={maxTagLength}
          placeholder={value.length >= maxTags ? `Maximum ${maxTags} tags reached` : placeholder}
          isDisabled={value.length >= maxTags}
          isInvalid={isInvalid || !!inputError}
          errorMessage={inputError || errorMessage}
          className="flex-1"
          endContent={
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={handleAddTag}
              isDisabled={
                !inputValue.trim() ||
                inputValue.trim().length < minTagLength ||
                value.length >= maxTags
              }
              className="min-w-unit-8 w-8 h-8"
            >
              <FiPlus />
            </Button>
          }
        />
      </div>
      
      {value.length >= maxTags && (
        <p className="text-xs text-warning mt-1">
          Maximum {maxTags} tags allowed
        </p>
      )}
    </div>
  );
};

export default TagsInput;
