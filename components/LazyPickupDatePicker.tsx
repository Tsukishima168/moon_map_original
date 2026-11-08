import React, { Suspense, lazy } from 'react';

interface Props {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  minDate: Date;
  filterDate: (date: Date) => boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--c-line)', fontSize: '1rem', boxSizing: 'border-box',
};

// 日期選擇器（react-datepicker 約 48 KB gzip + CSS）只在結帳表單用到，延後到表單出現才載入。
const load = () => import('./PickupDatePicker');
const PickupDatePicker = lazy(load);

// chunk 失敗後，這次瀏覽（直到重新整理）一律用原生日期欄位，不再重試：
// Vite 的 CSS 預載只請求一次，失敗後再恢復會缺 react-datepicker 的 CSS（無框線、停用日不灰）。
let chunkFailed = false;

// 載入中的占位：尺寸與真正的輸入框相同（寬 100%、padding 12、1rem、border-box），避免版面跳動。
// 樣式用 inline，因為 .custom-datepicker 的 CSS 跟著延後的 chunk 一起載入。
const Placeholder = () => (
  <div style={{ width: '100%' }}>
    <input type="text" readOnly disabled aria-busy="true" placeholder="請點擊選擇日期" style={inputStyle} />
  </div>
);

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// chunk 載入失敗（離線、部署後舊 chunk 不存在）時的備援：原生日期欄位，規則同 minDate / filterDate。
// 最終仍由伺服器端的日期檢查把關。
const NativeDateInput: React.FC<Props> = ({ selected, onChange, minDate, filterDate }) => {
  const [rejected, setRejected] = React.useState(false);
  return (
    <div style={{ width: '100%' }}>
      <input
        type="date"
        className="custom-datepicker-native"
        required
        min={toKey(minDate)}
        value={selected ? toKey(selected) : ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) { setRejected(false); onChange(null); return; }
          const [y, m, d] = v.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          const ok = date >= minDate && filterDate(date);
          setRejected(!ok);
          onChange(ok ? date : null);
        }}
        style={inputStyle}
      />
      {rejected && (
        <p role="alert" style={{ fontSize: '0.8rem', color: 'rgb(145, 29, 29)', margin: '5px 0 0' }}>此日期無法預訂（公休或滿單），請改選其他日期。</p>
      )}
    </div>
  );
};

class PickerBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.error('[PickupDatePicker] chunk 載入失敗，改用原生日期欄位', error);
    chunkFailed = true;
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const LazyPickupDatePicker: React.FC<Props> = (props) => chunkFailed ? <NativeDateInput {...props} /> : (
  <PickerBoundary fallback={<NativeDateInput {...props} />}>
    <Suspense fallback={<Placeholder />}>
      <PickupDatePicker {...props} />
    </Suspense>
  </PickerBoundary>
);

export default LazyPickupDatePicker;
