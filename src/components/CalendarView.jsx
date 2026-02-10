import React from 'react';
import './CalendarView.css';

export default function CalendarView() {
  const today = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();
  
  // Get days in current month
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  // Get which day of week the month starts on
  const firstDay = new Date(year, today.getMonth(), 1).getDay();
  
  const days = [];
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = i === today.getDate();
    days.push(
      <div key={i} className={`calendar-day ${isToday ? 'current' : ''}`}>
        {i}
      </div>
    );
  }

  return (
    <div className="calendar-popup" onClick={(e) => e.stopPropagation()}>
      <div className="calendar-header">
        <span className="cal-month">{month}</span>
        <span className="cal-year">{year}</span>
      </div>
      <div className="calendar-weekdays">
        <div>S</div>
        <div>M</div>
        <div>T</div>
        <div>W</div>
        <div>T</div>
        <div>F</div>
        <div>S</div>
      </div>
      <div className="calendar-grid">
        {days}
      </div>
    </div>
  );
}
