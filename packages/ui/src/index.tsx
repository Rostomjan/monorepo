"use client";

import * as React from "react";

export const Button = ({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={`px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
