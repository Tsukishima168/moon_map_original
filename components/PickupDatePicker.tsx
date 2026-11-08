import React from 'react';
import DatePicker from 'react-datepicker';
// 順序固定：套件 CSS 先、覆寫 CSS 後（覆寫要蓋過套件）。兩者都只在日期選擇器 chunk 載入時才進來。
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker-overrides.css';

interface PickupDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  minDate: Date;
  filterDate: (date: Date) => boolean;
}

const PickupDatePicker: React.FC<PickupDatePickerProps> = ({ selected, onChange, minDate, filterDate }) => (
  <DatePicker
    selected={selected}
    onChange={onChange}
    minDate={minDate}
    filterDate={filterDate}
    dateFormat="yyyy-MM-dd"
    placeholderText="請點擊選擇日期"
    className="custom-datepicker"
    required
  />
);

export default PickupDatePicker;
