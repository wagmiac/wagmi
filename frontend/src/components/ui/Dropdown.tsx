"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps<T extends string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}

export default function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = "选择...",
  className = "",
  size = "sm",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 键盘导航
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      if (event.key === "Escape") {
        setIsOpen(false);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex =
          event.key === "ArrowDown"
            ? (currentIndex + 1) % options.length
            : (currentIndex - 1 + options.length) % options.length;
        onChange(options[nextIndex].value);
      } else if (event.key === "Enter") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options, value, onChange]);

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full
          bg-white/5 border border-white/10 rounded-lg
          text-gray-300 font-medium
          hover:bg-white/10 hover:border-white/20
          focus:outline-none focus:border-[#FF8C00]/50
          transition-all duration-200
          ${sizeClasses[size]}
          ${isOpen ? "border-[#FF8C00]/50 bg-white/10" : ""}
        `}
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 right-0 mt-1 z-50
            bg-[#1a1a1a] border border-white/10 rounded-lg
            shadow-xl shadow-black/50
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left
                  transition-colors duration-150
                  ${sizeClasses[size]}
                  ${
                    option.value === value
                      ? "bg-[#FF8C00]/20 text-[#FF8C00]"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                {option.icon}
                <span>{option.label}</span>
                {option.value === value && (
                  <svg
                    className="w-4 h-4 ml-auto text-[#FF8C00]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
