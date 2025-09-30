import { useState, useCallback, useRef, useEffect } from "react";

const DualRangeSlider = ({
  min = 1,
  max = 14,
  value = [1, 7],
  onChange,
  maxRange = 7,
  getAriaLabel = () => "Date range",
  getAriaValueText = (value) => `Day ${value}`,
  valueLabelDisplay = "auto",
  getMinLabel = (min) => `Day ${min}`,
  getMaxLabel = (max) => `Day ${max}`,
}) => {
  const [isDragging, setIsDragging] = useState(null);
  const [tempValue, setTempValue] = useState(value);
  const sliderRef = useRef(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const getPercentage = useCallback(
    (val) => {
      return ((val - min) / (max - min)) * 100;
    },
    [min, max]
  );

  const getValueFromPosition = useCallback(
    (clientX) => {
      if (!sliderRef.current) return min;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const rawValue = min + percentage * (max - min);
      return Math.round(rawValue);
    },
    [min, max]
  );

  const handleMouseDown = useCallback(
    (thumbIndex) => (e) => {
      e.preventDefault();
      setIsDragging(thumbIndex);

      const handleMouseMove = (e) => {
        const newValue = getValueFromPosition(e.clientX);
        let newRange = [...tempValue];

        if (thumbIndex === 0) {
          // Start thumb
          const maxStart = Math.min(newValue, tempValue[1] - 1);
          newRange[0] = Math.max(min, maxStart);

          // Ensure end is at least start and within max range
          if (newRange[1] < newRange[0]) {
            newRange[1] = newRange[0];
          }
          if (newRange[1] - newRange[0] + 1 > maxRange) {
            newRange[1] = newRange[0] + maxRange - 1;
          }
        } else {
          // End thumb
          const minEnd = Math.max(newValue, tempValue[0] + 1, min);
          newRange[1] = Math.min(max, minEnd);

          // Ensure start is at most end and within max range
          if (newRange[0] > newRange[1]) {
            newRange[0] = newRange[1];
          }
          if (newRange[1] - newRange[0] + 1 > maxRange) {
            newRange[0] = newRange[1] - maxRange + 1;
          }

          // Ensure start doesn't go below min
          newRange[0] = Math.max(min, newRange[0]);
        }

        setTempValue(newRange);
        onChange?.(newRange);
      };

      const handleMouseUp = () => {
        setIsDragging(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [tempValue, min, max, maxRange, onChange, getValueFromPosition]
  );

  const startPercentage = getPercentage(tempValue[0]);
  const endPercentage = getPercentage(tempValue[1]);
  const rangeWidth = endPercentage - startPercentage;

  return (
    <div className="dual-range-slider-container">
      <div
        className="dual-range-track"
        ref={sliderRef}
        role="slider"
        aria-label={getAriaLabel()}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={tempValue[0]}
        aria-valuetext={`${getAriaValueText(
          tempValue[0]
        )} to ${getAriaValueText(tempValue[1])}`}
      >
        {/* Track background */}
        <div className="dual-range-track-bg"></div>

        {/* Active range */}
        <div
          className="dual-range-track-active"
          style={{
            left: `${startPercentage}%`,
            width: `${rangeWidth}%`,
          }}
        ></div>

        {/* Start thumb */}
        <div
          className={`dual-range-thumb dual-range-thumb-start ${
            isDragging === 0 ? "dragging" : ""
          }`}
          style={{ left: `${startPercentage}%` }}
          onMouseDown={handleMouseDown(0)}
          role="slider"
          aria-label="Start day"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={tempValue[0]}
          aria-valuetext={getAriaValueText(tempValue[0])}
          tabIndex={0}
        >
          {valueLabelDisplay === "auto" && (
            <div className="dual-range-value-label">
              {getAriaValueText(tempValue[0])}
            </div>
          )}
        </div>

        {/* End thumb */}
        <div
          className={`dual-range-thumb dual-range-thumb-end ${
            isDragging === 1 ? "dragging" : ""
          }`}
          style={{ left: `${endPercentage}%` }}
          onMouseDown={handleMouseDown(1)}
          role="slider"
          aria-label="End day"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={tempValue[1]}
          aria-valuetext={getAriaValueText(tempValue[1])}
          tabIndex={0}
        >
          {valueLabelDisplay === "auto" && (
            <div className="dual-range-value-label">
              {getAriaValueText(tempValue[1])}
            </div>
          )}
        </div>
      </div>

      {/* Labels */}
      <div className="dual-range-labels">
        <span>{getMinLabel(min)}</span>
        <span>{getMaxLabel(max)}</span>
      </div>
    </div>
  );
};

export default DualRangeSlider;
