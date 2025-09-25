import React from 'react';

interface TimetableGridProps {
  days?: string[];
  startHour?: number;
  endHour?: number;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  startHour = 7,
  endHour = 20,
}) => {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="w-full h-full overflow-auto">
      <div
        className="grid border border-gray-300"
        style={{
          gridTemplateColumns: `80px repeat(${days.length}, 1fr)`,
          gridTemplateRows: `40px repeat(${hours.length}, 1fr)`,
        }}
      >
        {/* Empty top-left corner */}
        <div className="border border-gray-300 bg-gray-100"></div>

        {/* Day headers */}
        {days.map((day) => (
          <div
            key={day}
            className="border border-gray-300 bg-gray-100 flex items-center justify-center font-semibold"
          >
            {day}
          </div>
        ))}

        {/* Time + Cells */}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Time labels */}
            <div className="border border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-600">
              {hour}:00
            </div>

            {/* Day cells */}
            {days.map((day) => (
              <div
                key={`${day}-${hour}`}
                className="border border-gray-200 hover:bg-blue-50 transition-colors"
              ></div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TimetableGrid;
