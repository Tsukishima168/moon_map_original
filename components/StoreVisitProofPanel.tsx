import React, { useRef, useState } from 'react';
import {
  claimStoreVisitProof,
  createEconomyRequestId,
  issueStoreVisitProof,
} from '../lib/economy';
import { createInFlightLatch, markEventOnce } from '../lib/economyUi';
import { STORE_LOCATION, STORE_RADIUS_METERS, distanceMeters } from '../lib/store-location';

type FeedbackTone = 'info' | 'success' | 'warning' | 'error';

interface Feedback {
  tone: FeedbackTone;
  message: string;
}

interface StoreVisitProofPanelProps {
  userId: string | null;
  onRequestLogin: () => void;
  onEvent: (event: string, payload?: Record<string, unknown>) => void;
}

const toneColor: Record<FeedbackTone, string> = {
  info: '#5A6B8C',
  success: '#18735f',
  warning: '#a15808',
  error: '#b42318',
};

const primaryButton: React.CSSProperties = {
  border: '1px solid #2B2018',
  borderRadius: '10px',
  background: '#2B2018',
  color: '#fff',
  padding: '11px 14px',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#fff',
  color: '#2B2018',
};

function feedbackForCode(code: string): Feedback {
  switch (code) {
    case 'EXPIRED':
      return { tone: 'warning', message: '這組憑證已過期，請請店員重新產生。' };
    case 'ALREADY_PROCESSED':
      return { tone: 'info', message: '這組到店憑證已完成核銷，不會重複發放印章。' };
    case 'ROLLOUT_DISABLED':
      return { tone: 'warning', message: '到店印章正在安全維護中，目前不會變更會員資產。' };
    case 'LIMIT_REACHED':
      return { tone: 'info', message: '本期到店印章已領取，不會重複發放。' };
    case 'AUTH_REQUIRED':
      return { tone: 'warning', message: '請先登入 Passport，再完成店員驗證。' };
    case 'INVALID_PROOF':
      return { tone: 'error', message: '憑證格式或簽章無效，請確認後重試。' };
    default:
      return { tone: 'error', message: '目前無法完成驗證，請稍後再試。' };
  }
}

export default function StoreVisitProofPanel({
  userId,
  onRequestLogin,
  onEvent,
}: StoreVisitProofPanelProps) {
  const [proof, setProof] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<Feedback | null>(null);
  const [staffFeedback, setStaffFeedback] = useState<Feedback | null>(null);
  const [distanceFeedback, setDistanceFeedback] = useState<Feedback | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<string | null>(null);
  const [issuedExpiresAt, setIssuedExpiresAt] = useState<string | null>(null);
  const claimRequestId = useRef<string | null>(null);
  const issueRequestId = useRef<string | null>(null);
  const proofRef = useRef('');
  const claimAttemptId = useRef(0);
  const claimLatch = useRef(createInFlightLatch());
  const issueLatch = useRef(createInFlightLatch());
  const claimedEventIds = useRef(new Set<string>());
  const issuedProofIds = useRef(new Set<string>());

  const handleClaim = async () => {
    if (!userId) {
      setClaimFeedback(feedbackForCode('AUTH_REQUIRED'));
      onRequestLogin();
      return;
    }
    if (claiming || !claimLatch.current.tryAcquire()) return;

    const submittedProof = proof.trim();
    const attemptId = ++claimAttemptId.current;
    setClaiming(true);
    setClaimFeedback(null);
    try {
      claimRequestId.current ??= createEconomyRequestId();
      const response = await claimStoreVisitProof(submittedProof, claimRequestId.current);

      if (
        claimAttemptId.current !== attemptId
        || proofRef.current.trim() !== submittedProof
      ) {
        return;
      }

      if (response.ok) {
        setClaimFeedback({ tone: 'success', message: '到店印章已由伺服器確認，可在 Passport 查看。' });
        const eventId = String(response.data.event_id);
        if (markEventOnce(claimedEventIds.current, eventId)) {
          onEvent('map_store_visit_claimed', {
            method: 'staff_proof',
            location_id: 'annan-store',
            event_id: eventId,
          });
        }
        return;
      }

      setClaimFeedback(feedbackForCode(response.code));
      if (response.code === 'AUTH_REQUIRED') onRequestLogin();
    } catch {
      if (claimAttemptId.current === attemptId) {
        setClaimFeedback({ tone: 'error', message: '無法建立安全請求，請更新瀏覽器後再試。' });
      }
    } finally {
      claimLatch.current.release();
      if (claimAttemptId.current === attemptId) {
        setClaiming(false);
      }
    }
  };

  const handleIssue = async (forceNew = false) => {
    if (!userId) {
      setStaffFeedback(feedbackForCode('AUTH_REQUIRED'));
      onRequestLogin();
      return;
    }
    if (issuing || !issueLatch.current.tryAcquire()) return;

    setIssuing(true);
    setStaffFeedback(null);
    try {
      if (forceNew) {
        issueRequestId.current = createEconomyRequestId();
        setIssuedCredential(null);
        setIssuedExpiresAt(null);
      }
      issueRequestId.current ??= createEconomyRequestId();
      const response = await issueStoreVisitProof(issueRequestId.current);

      if (response.ok) {
        setIssuedCredential(String(response.data.credential));
        setIssuedExpiresAt(String(response.data.expires_at));
        setStaffFeedback({ tone: 'success', message: '短效憑證已產生；相同請求重試會回傳同一組憑證。' });
        const proofId = String(response.data.proof_id);
        if (markEventOnce(issuedProofIds.current, proofId)) {
          onEvent('map_store_visit_proof_issued', {
            location_id: 'annan-store',
            proof_id: proofId,
          });
        }
        return;
      }

      const feedback = response.code === 'AUTH_REQUIRED'
        ? { tone: 'error' as const, message: '此帳號不是有效店員，無法核發到店憑證。' }
        : feedbackForCode(response.code);
      setStaffFeedback(feedback);
    } catch {
      setStaffFeedback({ tone: 'error', message: '無法建立安全請求，請更新瀏覽器後再試。' });
    } finally {
      issueLatch.current.release();
      setIssuing(false);
    }
  };

  const checkDistance = () => {
    if (!('geolocation' in navigator)) {
      setDistanceFeedback({ tone: 'warning', message: '此裝置不支援定位；仍可請店員人工確認。' });
      return;
    }

    setDistanceFeedback({ tone: 'info', message: '正在取得距離提示…' });
    navigator.geolocation.getCurrentPosition((position) => {
      const distance = distanceMeters(
        position.coords.latitude,
        position.coords.longitude,
        STORE_LOCATION.lat,
        STORE_LOCATION.lng,
      );
      const nearby = distance <= STORE_RADIUS_METERS;
      setDistanceFeedback({
        tone: nearby ? 'success' : 'warning',
        message: `定位顯示距離約 ${distance.toFixed(0)} 公尺。這只是輔助訊號，正式印章仍需店員短效憑證。`,
      });
      onEvent('map_store_distance_checked', { nearby, distance_bucket: Math.min(5000, Math.round(distance / 50) * 50) });
    }, () => {
      setDistanceFeedback({ tone: 'warning', message: '無法取得定位；仍可請店員人工確認。' });
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const copyCredential = async () => {
    if (!issuedCredential || !navigator.clipboard?.writeText) {
      setStaffFeedback({ tone: 'warning', message: '請長按憑證手動複製。' });
      return;
    }
    try {
      await navigator.clipboard.writeText(issuedCredential);
      setStaffFeedback({ tone: 'success', message: '憑證已複製。' });
    } catch {
      setStaffFeedback({ tone: 'warning', message: '複製失敗，請長按憑證手動複製。' });
    }
  };

  const feedbackNode = (feedback: Feedback | null) => feedback && (
    <p role="status" style={{ margin: '10px 0 0', color: toneColor[feedback.tone], fontSize: '0.82rem', lineHeight: 1.6 }}>
      {feedback.message}
    </p>
  );

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <section style={{ padding: '16px', border: '1px solid rgba(43,32,24,0.16)', borderRadius: '14px', background: '#fff' }}>
        <div className="font-mono" style={{ color: '#5A6B8C', fontSize: '0.72rem' }}>MEMBER CLAIM</div>
        <h3 style={{ margin: '6px 0 8px' }}>輸入店員提供的短效憑證</h3>
        <p style={{ margin: '0 0 12px', color: '#6f6256', fontSize: '0.84rem', lineHeight: 1.6 }}>
          憑證只能使用一次，伺服器會核對店員身份、有效時間與會員；網頁端不能自行發印章。
        </p>
        <input
          aria-label="到店短效憑證"
          value={proof}
          maxLength={80}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={claiming}
          aria-busy={claiming}
          onChange={(event) => {
            if (claiming) return;
            const nextProof = event.target.value;
            proofRef.current = nextProof;
            claimAttemptId.current += 1;
            setProof(nextProof);
            claimRequestId.current = null;
            setClaimFeedback(null);
          }}
          placeholder="VIS-XXXXXXXXXXXXXXXX.xxxxxxxxx…"
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cfc6bb', borderRadius: '10px', padding: '11px 12px', fontFamily: 'monospace' }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          <button type="button" onClick={handleClaim} disabled={claiming || !proof.trim()} style={{ ...primaryButton, opacity: claiming || !proof.trim() ? 0.55 : 1 }}>
            {claiming ? '伺服器驗證中…' : '核銷到店印章'}
          </button>
          <button type="button" onClick={checkDistance} style={secondaryButton}>查看距離提示</button>
        </div>
        {feedbackNode(claimFeedback)}
        {feedbackNode(distanceFeedback)}
      </section>

      <details style={{ padding: '16px', border: '1px solid rgba(43,32,24,0.16)', borderRadius: '14px', background: 'rgba(201,205,216,0.18)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>店員核發模式</summary>
        <p style={{ color: '#6f6256', fontSize: '0.82rem', lineHeight: 1.6 }}>
          僅 staff_members 中的有效登入店員可使用。每組憑證約五分鐘後失效，且核銷後不可重播。
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => handleIssue(false)} disabled={issuing} style={{ ...primaryButton, opacity: issuing ? 0.55 : 1 }}>
            {issuing ? '核發中…' : issuedCredential ? '重試同一請求' : '產生短效憑證'}
          </button>
          {issuedCredential && (
            <button type="button" onClick={() => handleIssue(true)} disabled={issuing} style={secondaryButton}>產生新憑證</button>
          )}
        </div>
        {issuedCredential && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: '#111830', color: '#fff' }}>
            <button
              type="button"
              onClick={copyCredential}
              aria-label="複製到店短效憑證"
              style={{
                display: 'block',
                width: '100%',
                border: '1px solid transparent',
                borderRadius: '6px',
                background: 'transparent',
                color: 'inherit',
                padding: '4px',
                margin: '-4px',
                textAlign: 'left',
                cursor: 'copy',
              }}
            >
              <code style={{ display: 'block', overflowWrap: 'anywhere', color: '#C9CDD8', fontSize: '0.78rem', lineHeight: 1.7 }}>{issuedCredential}</code>
              <span style={{ display: 'block', marginTop: '6px', color: '#fff', fontSize: '0.7rem' }}>點一下複製</span>
            </button>
            {issuedExpiresAt && (
              <span style={{ display: 'block', marginTop: '8px', color: '#b9c0d1', fontSize: '0.7rem' }}>
                到期：{new Date(issuedExpiresAt).toLocaleTimeString('zh-TW')}
              </span>
            )}
          </div>
        )}
        {feedbackNode(staffFeedback)}
      </details>
    </div>
  );
}
