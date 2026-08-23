import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

interface FileUploaderProps {
  onFile: (file: File) => void;
  isProcessing: boolean;
  disabled?: boolean;
}

/**
 * CSV file uploader with drag-and-drop support.
 *
 * Validates that the selected file has a .csv extension before invoking onFile.
 * Shows an inline error for wrong file types instead of crashing.
 * Keyboard accessible: the entire drop zone is a focusable label.
 */
export function FileUploader({ onFile, isProcessing, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  function validateAndSubmit(file: File | null | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setTypeError(
        `"${file.name}" is not a CSV file. Please select a file with the .csv extension.`
      );
      return;
    }
    setTypeError(null);
    onFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    validateAndSubmit(e.target.files?.[0]);
    // Reset input so re-uploading the same file triggers onChange
    e.target.value = "";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled && !isProcessing) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isProcessing) return;
    validateAndSubmit(e.dataTransfer.files?.[0]);
  }

  const isDisabled = disabled || isProcessing;

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-3",
          "rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
          isDisabled ? "pointer-events-none opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        {/* Invisible full-area label makes the whole zone clickable */}
        <label
          htmlFor="csv-file-input"
          className={[
            "absolute inset-0 cursor-pointer",
            isDisabled ? "pointer-events-none" : "",
          ].join(" ")}
          aria-label="Upload CSV file"
        />

        {/* Upload icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {isProcessing ? (
          <div className="flex items-center gap-2 text-blue-600">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="font-medium">Processing dataset…</span>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Drop your CSV file here, or{" "}
                <span className="text-blue-600 underline underline-offset-2">browse</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">CSV files only (.csv)</p>
            </div>
          </>
        )}

        <input
          ref={inputRef}
          id="csv-file-input"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleChange}
          disabled={isDisabled}
          aria-describedby={typeError ? "file-type-error" : undefined}
        />
      </div>

      {typeError && (
        <p
          id="file-type-error"
          role="alert"
          className="mt-2 text-sm font-medium text-red-600"
        >
          {typeError}
        </p>
      )}
    </div>
  );
}
