"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type DropdownOption = {
  label: string;
  onClick: () => void;
};

interface ThreeDotDropdownProps {
  options: DropdownOption[];
}

export default function ThreeDotDropdown({ options }: ThreeDotDropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; height: number }>({ top: 0, left: 0, height: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate and store button position for portal menu placement
  const updatePosition = () => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.top, left: rect.left, height: rect.height });
  };

  const toggleOpen = () => {
    if (!open) updatePosition();
    setOpen((p) => !p);
  };

  // Close on outside click / resize / scroll
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !wrapperRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleScrollResize = () => {
      updatePosition();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleScrollResize);
    window.addEventListener("scroll", handleScrollResize, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleScrollResize);
      window.removeEventListener("scroll", handleScrollResize, true);
    };
  }, [open]);

  const menu = open ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: coords.top + coords.height + 6,
        left: coords.left - 120 + 28, // shift so right edge aligns roughly with button (tweakable)
        zIndex: 1000,
      }}
      className="w-44 rounded-md bg-white border border-gray-200 shadow-lg dark:bg-gray-800 dark:border-white/10"
    >
      {options.map((option, idx) => (
        <button
          key={idx}
            onClick={() => {
              option.onClick();
              setOpen(false);
            }}
          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div ref={wrapperRef} className="inline-flex">
        <button
          type="button"
          onClick={toggleOpen}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 focus:outline-none"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
          </svg>
        </button>
      </div>
      {open && typeof document !== "undefined" && createPortal(menu, document.body)}
    </>
  );
}
